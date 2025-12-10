# Physics Engine Features

This document outlines the capabilities and features of the high-precision N-body physics engine (`physics-wasm`). The engine is written in Rust and compiled to WebAssembly for performance.

## 1. Numerical Integrators
The engine supports multiple symplectic and non-symplectic integrators, allowing users to balance speed and accuracy.

| Integrator | Type | Description | Best For |
|------------|------|-------------|----------|
| **DOP853** | Adaptive | Dormand-Prince 8(5,3) method. High-order, adaptive step-size control. | High-precision trajectories, non-conservative forces (drag, non-gravitational). |
| **SABA4** | Symplectic | 4th-order symplectic integrator with corrector steps (Laskar & Robutel). | Long-term stability of planetary systems. |
| **Wisdom-Holman** | Symplectic | Symplectic mapping method using Drift-Kick-Drift scheme. Splits Hamiltonian into Keplerian and Interaction parts. | Extremely fast integration of stable orbits. |

## 2. Force Models

### Gravitational Forces
*   **Newtonian N-Body Gravity**: Full $O(N^2)$ pairwise gravitational interactions between all bodies.
*   **Gravitational Harmonics (Zonal)**:
    *   Generic support for $J_n$ zonal harmonics (J2, J3, J4, ...).
    *   Optimized Cartesian implementations for $J_2, J_3, J_4$.
    *   Recursive Legendre polynomial implementation for high-order terms ($J_5+$).
*   **Gravitational Harmonics (Sectorial/Tesseral)**:
    *   Support for $C_{22}$ and $S_{22}$ terms (ellipticity of the equator).
    *   Full coordinate transformations (Body-Fixed $\leftrightarrow$ Inertial).

### Relativistic Corrections
*   **PPN (Parameterized Post-Newtonian)**: First-order relativistic corrections to Newtonian gravity (Advance of Perihelion).
*   **EIH (Einstein-Infeld-Hoffmann)**: Full N-body General Relativity equations of motion (selectable via config).

### Tidal Forces
*   **Dissipative Tides**: Models the time-lagged tidal bulge, causing orbital decay/expansion.
*   **Conservative Tides**: Models the permanent tidal deformation, causing apsidal precession.
*   **Parameters**: Uses Love number ($k_2$) and Tidal Quality Factor ($Q$).

### Solar Physics
*   **Solar Radiation Pressure (SRP)**: Radiation force acting on bodies based on surface area and reflectivity.
*   **Poynting-Robertson Drag**: Velocity-dependent drag force caused by radiation absorption and re-emission.
*   **Yarkovsky Effect**: Thermal recoil force due to anisotropic thermal emission (crucial for asteroids).

### Atmospheres
*   **Atmospheric Drag**: Drag force applied to bodies moving through another body's atmosphere.
    *   Models density profiles using scale height and surface pressure.
    *   Includes cutoff distances for performance.

## 3. Celestial Mechanics & Dynamics

### Coordinate Systems & Time
*   **Reference Frame**: Heliocentric Ecliptic J2000.
*   **Time Scale**: Barycentric Dynamical Time (TDB), represented as Julian Date (JD).

### Rotational Dynamics
*   **IAU Rotation Models**:
    *   Supports IAU 2009/2015 rotational elements.
    *   Calculates Right Ascension ($\alpha$), Declination ($\delta$), and Prime Meridian ($W$).
    *   Includes precession and nutation rates.
*   **Dynamic Pole Orientation**:
    *   Poles precess over time based on defined rates.
    *   Fallback to static pole vectors if rates are undefined.

### Collision Handling
*   **Inelastic Mergers**:
    *   Conserves Linear Momentum.
    *   Conserves Volume (updates radius).
    *   Sums Mass.
    *   Removes the smaller body from the simulation.

## 4. Configuration & Architecture
*   **Rust/WASM**: Core logic compiled to WebAssembly for near-native performance in the browser.
*   **Configurable Quality**: Integrators support Low, Medium, High, and Ultra quality presets (controlling step sizes and tolerances).
*   **Force Toggles**: All major forces (Harmonics, Relativity, Tides, Drag) can be toggled on/off at runtime.
