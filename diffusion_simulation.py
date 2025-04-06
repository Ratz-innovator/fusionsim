import numpy as np
from fipy import CellVariable, Grid1D, TransientTerm, DiffusionTerm, AdvectionTerm, Viewer

def run_diffusion_simulation(nx=50, dx=1.0, D=1.0, steps=100, dt=0.1, store_steps=10):
    """
    Run a simple 1D diffusion simulation.
    
    Parameters:
    -----------
    nx : int
        Number of cells in the mesh
    dx : float
        Cell size
    D : float
        Diffusion coefficient
    steps : int
        Number of time steps to run
    dt : float
        Time step size
    store_steps : int
        Store results every this many steps
        
    Returns:
    --------
    list of numpy.ndarray
        List of concentration values at stored timesteps
    """
    # Validate input parameters
    nx = int(nx)
    steps = int(steps)
    store_steps = int(store_steps)
    dx = float(dx)
    D = float(D)
    dt = float(dt)
    
    if nx <= 0:
        raise ValueError(f"nx must be positive, got {nx}")
    if steps <= 0:
        raise ValueError(f"steps must be positive, got {steps}")
    if store_steps <= 0:
        raise ValueError(f"store_steps must be positive, got {store_steps}")
    if dx <= 0:
        raise ValueError(f"dx must be positive, got {dx}")
    if D <= 0:
        raise ValueError(f"D must be positive, got {D}")
    if dt <= 0:
        raise ValueError(f"dt must be positive, got {dt}")
        
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
    
    # Solve the equation for the specified number of steps
    for step in range(steps):
        eq.solve(var=phi, dt=dt)
        
        # Store results at specified intervals
        if (step + 1) % max(1, steps // store_steps) == 0 or step == steps - 1:
            results.append(np.array(phi.value))
    
    # Return the list of stored results
    return results

def run_heat_equation_simulation(nx=50, dx=1.0, k=1.0, steps=100, dt=0.1, store_steps=10):
    """
    Run a 1D heat equation simulation.
    
    Parameters:
    -----------
    nx : int
        Number of cells in the mesh
    dx : float
        Cell size
    k : float
        Thermal conductivity coefficient
    steps : int
        Number of time steps to run
    dt : float
        Time step size
    store_steps : int
        Store results every this many steps
        
    Returns:
    --------
    list of numpy.ndarray
        List of temperature values at stored timesteps
    """
    # Validate input parameters
    nx = int(nx)
    steps = int(steps)
    store_steps = int(store_steps)
    dx = float(dx)
    k = float(k)
    dt = float(dt)
    
    if nx <= 0:
        raise ValueError(f"nx must be positive, got {nx}")
    if steps <= 0:
        raise ValueError(f"steps must be positive, got {steps}")
    if store_steps <= 0:
        raise ValueError(f"store_steps must be positive, got {store_steps}")
    if dx <= 0:
        raise ValueError(f"dx must be positive, got {dx}")
    if k <= 0:
        raise ValueError(f"k must be positive, got {k}")
    if dt <= 0:
        raise ValueError(f"dt must be positive, got {dt}")
        
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
    
    # Solve the equation for the specified number of steps
    for step in range(steps):
        eq.solve(var=T, dt=dt)
        
        # Store results at specified intervals
        if (step + 1) % max(1, steps // store_steps) == 0 or step == steps - 1:
            results.append(np.array(T.value))
    
    # Return the list of stored results
    return results

def run_advection_diffusion_simulation(nx=50, dx=1.0, D=1.0, velocity=1.0, steps=100, dt=0.1, store_steps=10):
    """
    Run a 1D advection-diffusion simulation.
    
    Parameters:
    -----------
    nx : int
        Number of cells in the mesh
    dx : float
        Cell size
    D : float
        Diffusion coefficient
    velocity : float
        Advection velocity
    steps : int
        Number of time steps to run
    dt : float
        Time step size
    store_steps : int
        Store results every this many steps
        
    Returns:
    --------
    list of numpy.ndarray
        List of concentration values at stored timesteps
    """
    # Validate input parameters
    nx = int(nx)
    steps = int(steps)
    store_steps = int(store_steps)
    dx = float(dx)
    D = float(D)
    velocity = float(velocity)
    dt = float(dt)
    
    if nx <= 0:
        raise ValueError(f"nx must be positive, got {nx}")
    if steps <= 0:
        raise ValueError(f"steps must be positive, got {steps}")
    if store_steps <= 0:
        raise ValueError(f"store_steps must be positive, got {store_steps}")
    if dx <= 0:
        raise ValueError(f"dx must be positive, got {dx}")
    if D <= 0:
        raise ValueError(f"D must be positive, got {D}")
    if velocity == 0:
        raise ValueError("velocity cannot be zero")
    if dt <= 0:
        raise ValueError(f"dt must be positive, got {dt}")
        
    # Create a 1D mesh
    mesh = Grid1D(nx=nx, dx=dx)
    
    # Create a variable on the mesh
    phi = CellVariable(name="concentration", mesh=mesh, value=0.0)
    
    # Set initial condition: Gaussian pulse on the left side
    x = mesh.cellCenters[0]
    phi.value = np.exp(-((x - nx * dx / 5) ** 2) / (dx ** 2 * 10))
    
    # Create the advection-diffusion equation
    eq = TransientTerm() == DiffusionTerm(coeff=D) - AdvectionTerm(coeff=velocity)
    
    # Store for recording timesteps
    results = [np.array(phi.value)]
    
    # Solve the equation for the specified number of steps
    for step in range(steps):
        eq.solve(var=phi, dt=dt)
        
        # Store results at specified intervals
        if (step + 1) % max(1, steps // store_steps) == 0 or step == steps - 1:
            results.append(np.array(phi.value))
    
    # Return the list of stored results
    return results

def run_simulation(simulation_type="diffusion", store_steps=10, **kwargs):
    """
    Run a simulation based on the specified type.
    
    Parameters:
    -----------
    simulation_type : str
        The type of simulation to run ("diffusion", "heat", or "advection_diffusion")
    store_steps : int
        Number of timesteps to store for animation
    **kwargs : dict
        Parameters to pass to the specific simulation function
        
    Returns:
    --------
    list of numpy.ndarray
        List of values at stored timesteps
    """
    # Ensure store_steps is an integer
    store_steps = int(store_steps)
    if store_steps <= 0:
        raise ValueError(f"store_steps must be positive, got {store_steps}")
        
    kwargs['store_steps'] = store_steps
    
    if simulation_type == "diffusion":
        return run_diffusion_simulation(**kwargs)
    elif simulation_type == "heat":
        return run_heat_equation_simulation(**kwargs)
    elif simulation_type == "advection_diffusion":
        return run_advection_diffusion_simulation(**kwargs)
    else:
        raise ValueError(f"Unknown simulation type: {simulation_type}")

if __name__ == "__main__":
    # Run a simple simulation and print the result
    results = run_simulation(simulation_type="diffusion", store_steps=5)
    print(f"Number of timesteps stored: {len(results)}")
    print("Final diffusion profile:")
    print(results[-1])
    print(f"Shape of result array: {results[-1].shape}") 