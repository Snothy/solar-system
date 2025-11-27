/**
 * Performance monitoring for physics computation
 * Tracks FPS, physics time, and automatically selects best compute mode
 */

export type ComputeMode = 'main' | 'worker' | 'gpu' | 'auto';

export interface PerformanceMetrics {
  fps: number;
  physicsTime: number; // ms per frame for physics
  renderTime: number;  // ms per frame for rendering
  bodyCount: number;
  mode: ComputeMode;
  avgFrameTime: number;
}

export class PerformanceMonitor {
  private frameStartTime: number = 0;
  private physicsStartTime: number = 0;
  private physicsEndTime: number = 0;
  
  private frameTimeSamples: number[] = [];
  private physicsTimeSamples: number[] = [];
  private sampleSize: number = 60; // Average over 60 frames (1 second at 60fps)
  
  private currentMode: ComputeMode = 'main';
  private bodyCount: number = 0;

  /**
   * Mark the start of a frame
   */
  startFrame() {
    this.frameStartTime = performance.now();
  }

  /**
   * Mark the start of physics computation
   */
  startPhysics() {
    this.physicsStartTime = performance.now();
  }

  /**
   * Mark the end of physics computation
   */
  endPhysics() {
    this.physicsEndTime = performance.now();
    const physicsTime = this.physicsEndTime - this.physicsStartTime;
    
    this.physicsTimeSamples.push(physicsTime);
    if (this.physicsTimeSamples.length > this.sampleSize) {
      this.physicsTimeSamples.shift();
    }
  }

  /**
   * Mark the end of a frame
   */
  endFrame() {
    const now = performance.now();
    const frameTime = now - this.frameStartTime;
    
    this.frameTimeSamples.push(frameTime);
    if (this.frameTimeSamples.length > this.sampleSize) {
      this.frameTimeSamples.shift();
    }
  }

  /**
   * Set current compute mode
   */
  setMode(mode: ComputeMode) {
    this.currentMode = mode;
  }

  /**
   * Update body count
   */
  setBodyCount(count: number) {
    this.bodyCount = count;
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    const avgFrameTime = this.average(this.frameTimeSamples);
    const avgPhysicsTime = this.average(this.physicsTimeSamples);
    const fps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;
    const renderTime = avgFrameTime - avgPhysicsTime;

    return {
      fps: Math.round(fps * 10) / 10,
      physicsTime: Math.round(avgPhysicsTime * 100) / 100,
      renderTime: Math.round(renderTime * 100) / 100,
      bodyCount: this.bodyCount,
      mode: this.currentMode,
      avgFrameTime: Math.round(avgFrameTime * 100) / 100
    };
  }

  /**
   * Recommend best compute mode based on body count and current performance
   */
  recommendMode(
    canUseWorker: boolean,
    canUseGPU: boolean,
    bodyCount: number
  ): ComputeMode {
    // For small body counts, main thread is fine
    if (bodyCount < 50) {
      return 'main';
    }

    // For medium counts, worker is best
    if (bodyCount < 500) {
      return canUseWorker ? 'worker' : 'main';
    }

    // For large counts, GPU is best if available
    if (bodyCount >= 500) {
      if (canUseGPU) return 'gpu';
      if (canUseWorker) return 'worker';
      return 'main';
    }

    // If FPS is dropping below 30, try to upgrade mode
    const metrics = this.getMetrics();
    if (metrics.fps < 30) {
      if (this.currentMode === 'main' && canUseWorker) return 'worker';
      if (this.currentMode === 'worker' && canUseGPU) return 'gpu';
    }

    return this.currentMode;
  }

  /**
   * Calculate average of array
   */
  private average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, val) => sum + val, 0) / arr.length;
  }

  /**
   * Get detailed performance report
   */
  getReport(): string {
    const metrics = this.getMetrics();
    return `
Performance Report:
------------------
FPS: ${metrics.fps}
Frame Time: ${metrics.avgFrameTime}ms
Physics Time: ${metrics.physicsTime}ms
Render Time: ${metrics.renderTime}ms
Body Count: ${metrics.bodyCount}
Compute Mode: ${metrics.mode}
Physics %: ${Math.round((metrics.physicsTime / metrics.avgFrameTime) * 100)}%
    `.trim();
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.frameTimeSamples = [];
    this.physicsTimeSamples = [];
  }
}
