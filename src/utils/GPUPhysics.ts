/**
 * GPU-Accelerated Physics using WebGPU
 * Calculates N-body gravitational forces in parallel on GPU
 */

import type { PhysicsBody } from '../types';
import { G, C_LIGHT } from './constants';

export type GPUMode = 'unavailable' | 'ready' | 'running';

export class GPUPhysics {
  private device: GPUDevice | null = null;
  private mode: GPUMode = 'unavailable';
  
  // GPU Buffers
  private bodyBuffer: GPUBuffer | null = null;
  private forceBuffer: GPUBuffer | null = null;
  private readBuffer: GPUBuffer | null = null;
  
  // Compute pipeline
  private gravityPipeline: GPUComputePipeline | null = null;
  private bindGroup: GPUBindGroup | null = null;
  
  private bodyCount: number = 0;
  private workgroupSize: number = 256;

  /**
   * Initialize WebGPU device and create compute pipeline
   */
  async initialize(): Promise<boolean> {
    try {
      if (!navigator.gpu) {
        console.warn('WebGPU not supported');
        return false;
      }

      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) {
        console.warn('No GPU adapter found');
        return false;
      }

      this.device = await adapter.requestDevice();
      
      // Create compute pipeline
      await this.createComputePipeline();
      
      this.mode = 'ready';
      // GPU Physics initialized successfully
      return true;
      
    } catch (error) {
      console.error('Failed to initialize GPU Physics:', error);
      this.mode = 'unavailable';
      return false;
    }
  }

  /**
   * Create the GPU compute pipeline for N-body gravity
   */
  private async createComputePipeline() {
    if (!this.device) return;

    const shaderCode = `
      struct Body {
        pos: vec3<f32>,
        mass: f32,
        vel: vec3<f32>,
        radius: f32,
        J2: f32,
        J3: f32,
        J4: f32,
        C22: f32,
        S22: f32,
        k2: f32,
        tidalQ: f32,
        poleX: f32,
        poleY: f32,
        poleZ: f32,
        padding: vec2<f32>, // Align to 16 bytes
      }

      struct Uniforms {
        bodyCount: u32,
        G: f32,
        C_LIGHT: f32,
        enablePPN: u32,
      }

      @group(0) @binding(0) var<storage, read> bodies: array<Body>;
      @group(0) @binding(1) var<storage, read_write> forces: array<vec3<f32>>;
      @group(0) @binding(2) var<uniform> uniforms: Uniforms;

      @compute @workgroup_size(${this.workgroupSize})
      fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
        let i = global_id.x;
        if (i >= uniforms.bodyCount) { return; }

        var force = vec3<f32>(0.0, 0.0, 0.0);
        let bi = bodies[i];

        // Calculate forces from all other bodies
        for (var j = 0u; j < uniforms.bodyCount; j++) {
          if (i == j) { continue; }
          
          let bj = bodies[j];
          let r = bj.pos - bi.pos;
          let dist_sq = dot(r, r);
          let dist = sqrt(dist_sq);
          
          if (dist < 1.0) { continue; } // Avoid division by zero

          // Newtonian gravity
          let f_mag = uniforms.G * bi.mass * bj.mass / dist_sq;
          let dir = r / dist;
          force += dir * f_mag;

          // J2 perturbation (oblateness)
          if (bj.J2 != 0.0) {
            let pole = vec3<f32>(bj.poleX, bj.poleY, bj.poleZ);
            let z = dot(r, pole);
            let z2_r2 = (z * z) / dist_sq;
            let R = bj.radius;
            
            let factor = (3.0 * uniforms.G * bi.mass * bj.mass * bj.J2 * R * R) / (2.0 * dist_sq * dist_sq);
            let term1 = r * (5.0 * z2_r2 - 1.0);
            let term2 = pole * (2.0 * z);
            
            let fJ2 = -(term1 - term2) * factor / dist;
            force += fJ2;
          }

          // Post-Newtonian corrections (if enabled)
          if (uniforms.enablePPN != 0u) {
            let v = bi.vel - bj.vel;
            let vSq = dot(v, v);
            let rDotV = dot(r, v);
            let mu = uniforms.G * bj.mass;
            let c2 = uniforms.C_LIGHT * uniforms.C_LIGHT;
            
            let term1 = (4.0 * mu / dist - vSq);
            let accPPN = (r * term1 + v * (4.0 * rDotV)) * (mu / (c2 * dist * dist * dist));
            
            force += accPPN * bi.mass;
          }
        }

        forces[i] = force;
      }
    `;

    const shaderModule = this.device.createShaderModule({
      code: shaderCode,
    });

    this.gravityPipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: shaderModule,
        entryPoint: 'main',
      },
    });
  }

  /**
   * Update GPU buffers with current body state
   */
  private updateBuffers(bodies: PhysicsBody[]) {
    if (!this.device || !this.gravityPipeline) return;

    this.bodyCount = bodies.length;

    // Pack body data into Float32Array for GPU
    // Body struct size: 16 floats (64 bytes with padding)
    const bodyData = new Float32Array(this.bodyCount * 16);
    
    for (let i = 0; i < this.bodyCount; i++) {
      const body = bodies[i];
      const offset = i * 16;
      
      bodyData[offset + 0] = body.pos.x;
      bodyData[offset + 1] = body.pos.y;
      bodyData[offset + 2] = body.pos.z;
      bodyData[offset + 3] = body.mass;
      
      bodyData[offset + 4] = body.vel.x;
      bodyData[offset + 5] = body.vel.y;
      bodyData[offset + 6] = body.vel.z;
      bodyData[offset + 7] = body.radius;
      
      bodyData[offset + 8] = body.J2 || 0;
      bodyData[offset + 9] = body.J3 || 0;
      bodyData[offset + 10] = body.J4 || 0;
      bodyData[offset + 11] = body.C22 || 0;
      
      bodyData[offset + 12] = body.S22 || 0;
      bodyData[offset + 13] = body.k2 || 0;
      bodyData[offset + 14] = body.tidalQ || 0;
      
      bodyData[offset + 15] = body.poleVector ? body.poleVector.x : 0;
      // Continue in force buffer update...
    }

    // Create or update body buffer
    if (this.bodyBuffer) {
      this.bodyBuffer.destroy();
    }
    this.bodyBuffer = this.device.createBuffer({
      size: bodyData.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(this.bodyBuffer, 0, bodyData);

    // Create force buffer
    if (this.forceBuffer) {
      this.forceBuffer.destroy();
    }
    this.forceBuffer = this.device.createBuffer({
      size: this.bodyCount * 4 * 3, // vec3<f32>
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });

    // Create read buffer
    if (this.readBuffer) {
      this.readBuffer.destroy();
    }
    this.readBuffer = this.device.createBuffer({
      size: this.bodyCount * 4 * 3,
      usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
    });

    // Create uniforms buffer
    const uniformData = new Uint32Array(4);
    uniformData[0] = this.bodyCount;
    const floatView = new Float32Array(uniformData.buffer);
    floatView[1] = G;
    floatView[2] = C_LIGHT;
    uniformData[3] = 1; // enablePPN

    const uniformBuffer = this.device.createBuffer({
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.device.queue.writeBuffer(uniformBuffer, 0, uniformData);

    // Create bind group
    this.bindGroup = this.device.createBindGroup({
      layout: this.gravityPipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.bodyBuffer } },
        { binding: 1, resource: { buffer: this.forceBuffer } },
        { binding: 2, resource: { buffer: uniformBuffer } },
      ],
    });
  }

  /**
   * Compute forces on GPU
   */
  async computeForces(bodies: PhysicsBody[]): Promise<void> {
    if (!this.device || !this.gravityPipeline || !this.bindGroup) {
      throw new Error('GPU not initialized');
    }

    this.mode = 'running';

    // Update buffers with current state
    this.updateBuffers(bodies);

    // Create command encoder
    const commandEncoder = this.device.createCommandEncoder();
    
    // Compute pass
    const passEncoder = commandEncoder.beginComputePass();
    passEncoder.setPipeline(this.gravityPipeline);
    passEncoder.setBindGroup(0, this.bindGroup);
    
    const workgroupCount = Math.ceil(this.bodyCount / this.workgroupSize);
    passEncoder.dispatchWorkgroups(workgroupCount);
    passEncoder.end();

    // Copy results to read buffer
    if (this.forceBuffer && this.readBuffer) {
      commandEncoder.copyBufferToBuffer(
        this.forceBuffer,
        0,
        this.readBuffer,
        0,
        this.bodyCount * 4 * 3
      );
    }

    // Submit commands
    this.device.queue.submit([commandEncoder.finish()]);

    // Read results
    if (this.readBuffer) {
      await this.readBuffer.mapAsync(GPUMapMode.READ);
      const resultData = new Float32Array(this.readBuffer.getMappedRange());

      // Apply forces to bodies
      for (let i = 0; i < this.bodyCount; i++) {
        bodies[i].force.set(
          resultData[i * 3 + 0],
          resultData[i * 3 + 1],
          resultData[i * 3 + 2]
        );
      }

      this.readBuffer.unmap();
    }

    this.mode = 'ready';
  }

  /**
   * Check if GPU is available and ready
   */
  isAvailable(): boolean {
    return this.mode !== 'unavailable';
  }

  /**
   * Get current mode
   */
  getMode(): GPUMode {
    return this.mode;
  }

  /**
   * Clean up GPU resources
   */
  destroy() {
    this.bodyBuffer?.destroy();
    this.forceBuffer?.destroy();
    this.readBuffer?.destroy();
    this.device?.destroy();
    this.mode = 'unavailable';
  }
}
