"""
FusionSim Diffusion Simulation Module
-----------------------------------
This module provides functions to run different types of 1D simulations:
1. Diffusion - Simple diffusion of a substance
2. Heat Equation - Heat conduction with fixed boundaries
3. Advection-Diffusion - Combined transport and diffusion

All simulations use FiPy, a finite volume PDE solver.
"""

from typing import List, Union, Literal, Optional, Dict, Any
import numpy as np
from fipy import CellVariable, Grid1D, TransientTerm, DiffusionTerm, AdvectionTerm, Viewer

# Type alias for simulation types
SimulationType = Literal["diffusion", "heat", "advection_diffusion"]

def run_simulation(
    simulation_type: SimulationType,
    nx: int = 50,
    dx: float = 1.0,
    D: Optional[float] = None,
    k: Optional[float] = None,
    velocity: Optional[float] = None,
    steps: int = 100,
    dt: float = 0.1,
    store_steps: int = 10
) -> List[np.ndarray]:
    """
    Run a simulation of the specified type with the given parameters.
    
    Args:
        simulation_type: Type of simulation to run
        nx: Number of cells in the mesh
        dx: Cell size
        D: Diffusion coefficient (for diffusion and advection-diffusion)
        k: Thermal conductivity (for heat equation)
        velocity: Advection velocity (for advection-diffusion)
        steps: Number of time steps to run
        dt: Time step size
        store_steps: Number of timesteps to store results for
        
    Returns:
        List of numpy arrays containing the simulation results at different timesteps
        
    Raises:
        ValueError: If invalid parameters are provided
        RuntimeError: If the simulation fails
    """
    # Select the appropriate simulation function based on type
    if simulation_type == "diffusion":
        if D is None:
            raise ValueError("Diffusion coefficient (D) must be provided for diffusion simulation")
        return run_diffusion_simulation(nx=nx, dx=dx, D=D, steps=steps, dt=dt, store_steps=store_steps)
    
    elif simulation_type == "heat":
        if k is None:
            raise ValueError("Thermal conductivity (k) must be provided for heat equation simulation")
        return run_heat_equation_simulation(nx=nx, dx=dx, k=k, steps=steps, dt=dt, store_steps=store_steps)
    
    elif simulation_type == "advection_diffusion":
        if D is None:
            raise ValueError("Diffusion coefficient (D) must be provided for advection-diffusion simulation")
        if velocity is None:
            raise ValueError("Velocity must be provided for advection-diffusion simulation")
        return run_advection_diffusion_simulation(
            nx=nx, dx=dx, D=D, velocity=velocity, steps=steps, dt=dt, store_steps=store_steps
        )
    
    else:
        raise ValueError(f"Unknown simulation type: {simulation_type}")

def run_diffusion_simulation(
    nx: int = 50,
    dx: float = 1.0,
    D: float = 1.0,
    steps: int = 100,
    dt: float = 0.1,
    store_steps: int = 10
) -> List[np.ndarray]:
    """
    Run a simple 1D diffusion simulation.
    
    This simulation models the equation: ∂u/∂t = D * ∂²u/∂x²
    
    Args:
        nx: Number of cells in the mesh
        dx: Cell size
        D: Diffusion coefficient
        steps: Number of time steps to run
        dt: Time step size
        store_steps: Number of timesteps to store results for
        
    Returns:
        List of numpy arrays with concentration values at stored timesteps
        
    Raises:
        ValueError: If any parameter is invalid
    """
    # Validate input parameters
    _validate_simulation_params(nx=nx, dx=dx, D=D, steps=steps, dt=dt, store_steps=store_steps)
    
    # Create a 1D mesh
    mesh = Grid1D(nx=nx, dx=dx)
    
    # Create a variable on the mesh
    phi = CellVariable(name="concentration", mesh=mesh, value=0.0)
    
    # Set initial condition: Gaussian pulse in the center
    x = mesh.cellCenters[0]
    phi.value = np.exp(-((x - nx * dx / 2) ** 2) / (dx ** 2 * 10))
    
    # Create the diffusion equation
    eq = TransientTerm() == DiffusionTerm(coeff=D)
    
    # Store for recording timesteps
    results = [np.array(phi.value)]
    
    # Calculate saving frequency
    save_frequency = max(1, steps // store_steps)
    
    # Solve the equation for the specified number of steps
    try:
        for step in range(steps):
            eq.solve(var=phi, dt=dt)
            
            # Store results at specified intervals
            if (step + 1) % save_frequency == 0 or step == steps - 1:
                results.append(np.array(phi.value))
    except Exception as e:
        raise RuntimeError(f"Error during diffusion simulation: {str(e)}") from e
    
    # Return the list of stored results
    return results

def run_heat_equation_simulation(
    nx: int = 50,
    dx: float = 1.0,
    k: float = 1.0,
    steps: int = 100,
    dt: float = 0.1,
    store_steps: int = 10
) -> List[np.ndarray]:
    """
    Run a 1D heat equation simulation.
    
    This simulation models the equation: ∂T/∂t = k * ∂²T/∂x²
    With fixed zero-temperature boundaries.
    
    Args:
        nx: Number of cells in the mesh
        dx: Cell size
        k: Thermal conductivity coefficient
        steps: Number of time steps to run
        dt: Time step size
        store_steps: Number of timesteps to store results for
        
    Returns:
        List of numpy arrays with temperature values at stored timesteps
        
    Raises:
        ValueError: If any parameter is invalid
    """
    # Validate input parameters
    _validate_simulation_params(nx=nx, dx=dx, k=k, steps=steps, dt=dt, store_steps=store_steps)
    
    # Create a 1D mesh
    mesh = Grid1D(nx=nx, dx=dx)
    
    # Create a variable for temperature on the mesh
    T = CellVariable(name="temperature", mesh=mesh, value=0.0)
    
    # Set initial condition: hot spot in the center
    x = mesh.cellCenters[0]
    T.value = 100 * np.exp(-((x - nx * dx / 2) ** 2) / (dx ** 2 * 10))
    
    # Set boundary conditions (fixed temperature at edges)
    T.constrain(0, mesh.facesLeft)
    T.constrain(0, mesh.facesRight)
    
    # Create the heat equation (which is essentially the same as the diffusion equation)
    eq = TransientTerm() == DiffusionTerm(coeff=k)
    
    # Store for recording timesteps
    results = [np.array(T.value)]
    
    # Calculate saving frequency
    save_frequency = max(1, steps // store_steps)
    
    # Solve the equation for the specified number of steps
    try:
        for step in range(steps):
            eq.solve(var=T, dt=dt)
            
            # Store results at specified intervals
            if (step + 1) % save_frequency == 0 or step == steps - 1:
                results.append(np.array(T.value))
    except Exception as e:
        raise RuntimeError(f"Error during heat equation simulation: {str(e)}") from e
    
    # Return the list of stored results
    return results

def run_advection_diffusion_simulation(
    nx: int = 50,
    dx: float = 1.0,
    D: float = 1.0,
    velocity: float = 1.0,
    steps: int = 100,
    dt: float = 0.1,
    store_steps: int = 10
) -> List[np.ndarray]:
    """
    Run a 1D advection-diffusion simulation.
    
    This simulation models the equation: ∂u/∂t + v * ∂u/∂x = D * ∂²u/∂x²
    
    Args:
        nx: Number of cells in the mesh
        dx: Cell size
        D: Diffusion coefficient
        velocity: Advection velocity
        steps: Number of time steps to run
        dt: Time step size
        store_steps: Number of timesteps to store results for
        
    Returns:
        List of numpy arrays with concentration values at stored timesteps
        
    Raises:
        ValueError: If any parameter is invalid
    """
    # Validate input parameters
    _validate_simulation_params(
        nx=nx, dx=dx, D=D, velocity=velocity, steps=steps, dt=dt, store_steps=store_steps
    )
    
    # Create a 1D mesh
    mesh = Grid1D(nx=nx, dx=dx)
    
    # Create a variable on the mesh
    phi = CellVariable(name="concentration", mesh=mesh, value=0.0)
    
    # Set initial condition: Gaussian pulse slightly to the left of center
    # This allows better visualization of advection effects
    center_offset = nx * dx / 4  # Offset from center
    x = mesh.cellCenters[0]
    phi.value = np.exp(-((x - (nx * dx / 2 - center_offset)) ** 2) / (dx ** 2 * 10))
    
    # Create the advection-diffusion equation
    eq = (TransientTerm() + 
          AdvectionTerm(coeff=velocity) == 
          DiffusionTerm(coeff=D))
    
    # Store for recording timesteps
    results = [np.array(phi.value)]
    
    # Calculate saving frequency
    save_frequency = max(1, steps // store_steps)
    
    # Solve the equation for the specified number of steps
    try:
        for step in range(steps):
            eq.solve(var=phi, dt=dt)
            
            # Store results at specified intervals
            if (step + 1) % save_frequency == 0 or step == steps - 1:
                results.append(np.array(phi.value))
    except Exception as e:
        raise RuntimeError(f"Error during advection-diffusion simulation: {str(e)}") from e
    
    # Return the list of stored results
    return results

def _validate_simulation_params(**params: Dict[str, Any]) -> None:
    """
    Validate all simulation parameters to ensure they are in acceptable ranges.
    
    Args:
        **params: Dictionary of parameter names and values
        
    Raises:
        ValueError: If any parameter is invalid
    """
    # Convert integer parameters
    for param_name in ['nx', 'steps', 'store_steps']:
        if param_name in params:
            try:
                params[param_name] = int(params[param_name])
            except (ValueError, TypeError):
                raise ValueError(f"{param_name} must be convertible to an integer, got {params[param_name]}")
    
    # Convert float parameters
    for param_name in ['dx', 'dt', 'D', 'k', 'velocity']:
        if param_name in params and params[param_name] is not None:
            try:
                params[param_name] = float(params[param_name])
            except (ValueError, TypeError):
                raise ValueError(f"{param_name} must be convertible to a float, got {params[param_name]}")
    
    # Check integer parameters are positive
    for param_name in ['nx', 'steps', 'store_steps']:
        if param_name in params and params[param_name] <= 0:
            raise ValueError(f"{param_name} must be positive, got {params[param_name]}")
    
    # Check float parameters are positive (except velocity which can be negative)
    for param_name in ['dx', 'dt', 'D', 'k']:
        if param_name in params and params[param_name] is not None and params[param_name] <= 0:
            raise ValueError(f"{param_name} must be positive, got {params[param_name]}")
    
    # Special case for velocity - can't be zero but can be negative
    if 'velocity' in params and params['velocity'] is not None and params['velocity'] == 0:
        raise ValueError("velocity cannot be zero")

if __name__ == "__main__":
    # Run a simple simulation and print the result
    results = run_simulation(simulation_type="diffusion", store_steps=5)
    print(f"Number of timesteps stored: {len(results)}")
    print("Final diffusion profile:")
    print(results[-1])
    print(f"Shape of result array: {results[-1].shape}") 