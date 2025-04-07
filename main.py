"""
FusionSim API Server
-------------------
A FastAPI backend serving 1D diffusion simulations via a REST API.
Supports multiple simulation types including diffusion, heat equation, and advection-diffusion.
"""

import os
import sys
import tempfile
import traceback
import logging
from typing import Optional, Any, List, Dict, Union
from io import BytesIO

# Third-party imports
import numpy as np
import imageio.v2 as imageio
import matplotlib
matplotlib.use('Agg')  # Use a non-interactive backend
import matplotlib.pyplot as plt
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, Field, field_validator
from enum import Enum

# Local imports
from diffusion_simulation import run_simulation

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("server_log.txt")
    ]
)
logger = logging.getLogger("fusionsim")

# Initialize FastAPI app
app = FastAPI(
    title="FusionSim API",
    description="API for running 1D diffusion simulations",
    version="1.0.0"
)

# Add CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class SimulationType(str, Enum):
    """Valid simulation types supported by the API."""
    diffusion = "diffusion"
    heat = "heat"
    advection_diffusion = "advection_diffusion"


class SimulationParams(BaseModel):
    """
    Parameters for configuring a simulation.
    
    All numerical values must be positive. Integer fields must be actual integers.
    """
    # Common parameters
    simulation_type: SimulationType = Field(
        default=SimulationType.diffusion,
        description="Type of simulation to run"
    )
    nx: int = Field(
        50, gt=0,
        description="Number of grid cells (positive integer)"
    )
    dx: float = Field(
        1.0, gt=0,
        description="Grid spacing (positive number)"
    )
    steps: int = Field(
        100, gt=0,
        description="Number of time steps (positive integer)"
    )
    dt: float = Field(
        0.1, gt=0,
        description="Time step size (positive number)"
    )
    store_frames: int = Field(
        20, gt=0, le=50,
        description="Number of frames to include in animation (1-50)"
    )
    
    # Simulation-specific parameters
    D: Optional[float] = Field(
        1.0, gt=0,
        description="Diffusion coefficient (for diffusion and advection-diffusion)"
    )
    k: Optional[float] = Field(
        1.0, gt=0,
        description="Thermal conductivity (for heat equation)"
    )
    velocity: Optional[float] = Field(
        1.0,
        description="Advection velocity (for advection-diffusion)"
    )

    @field_validator('nx', 'steps', 'store_frames')
    @classmethod
    def ensure_integers(cls, v: Any) -> Any:
        """Ensure that integer fields are actually integers."""
        if not isinstance(v, int):
            raise ValueError(f"Must be an integer, got {type(v).__name__}")
        return v


@app.get("/")
async def root():
    """Health check endpoint."""
    return {"message": "FusionSim backend is running", "status": "healthy"}


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled exceptions."""
    logger.error(f"Unhandled exception: {str(exc)}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={
            "detail": str(exc),
            "type": str(type(exc).__name__)
        }
    )


@app.post("/diffusion")
async def run_diffusion_simulation(params: SimulationParams):
    """
    Run a simulation based on the provided parameters.
    
    Returns an animated GIF of the simulation results.
    """
    try:
        # Log received parameters
        logger.info(f"Received simulation request: {params.simulation_type}")
        logger.debug(f"Parameters: {params.model_dump()}")
        
        # Validate integer parameters
        for param_name, expected_type in [
            ('nx', int), ('steps', int), ('store_frames', int)
        ]:
            param_value = getattr(params, param_name)
            if not isinstance(param_value, expected_type):
                logger.error(f"{param_name} should be {expected_type.__name__}, got {type(param_value).__name__}: {param_value}")
                return JSONResponse(
                    status_code=400,
                    content={"detail": f"{param_name} must be {expected_type.__name__}, got {param_value}"}
                )
        
        # Prepare simulation parameters
        sim_params = _prepare_simulation_params(params)
        
        # Run the simulation
        logger.info("Starting simulation calculation")
        try:
            results = run_simulation(
                simulation_type=params.simulation_type,
                store_steps=params.store_frames,
                **sim_params
            )
            logger.info(f"Simulation completed with {len(results)} timesteps")
        except Exception as sim_error:
            logger.error(f"Error in simulation: {str(sim_error)}")
            return JSONResponse(
                status_code=500,
                content={"detail": f"Simulation error: {str(sim_error)}"}
            )
        
        # Generate animation from results
        logger.info("Generating animation")
        try:
            gif_bytes = _generate_animation(params, results)
            logger.info("Animation generated successfully")
            return StreamingResponse(BytesIO(gif_bytes), media_type="image/gif")
        except Exception as anim_error:
            logger.error(f"Animation generation error: {str(anim_error)}")
            return JSONResponse(
                status_code=500,
                content={"detail": f"Animation generation error: {str(anim_error)}"}
            )
    
    except Exception as e:
        logger.error(f"Unhandled exception: {str(e)}")
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"detail": str(e), "type": str(type(e).__name__)}
        )


def _prepare_simulation_params(params: SimulationParams) -> Dict[str, Union[int, float]]:
    """
    Extract and prepare parameters based on simulation type.
    
    Returns a dictionary of parameters to pass to the simulation function.
    """
    # Common parameters for all simulation types
    sim_params = {
        "nx": params.nx,
        "dx": params.dx,
        "steps": params.steps,
        "dt": params.dt
    }
    
    # Add simulation-specific parameters
    if params.simulation_type == SimulationType.diffusion:
        sim_params["D"] = params.D
        logger.debug(f"Configured diffusion simulation with D={params.D}")
    elif params.simulation_type == SimulationType.heat:
        sim_params["k"] = params.k
        logger.debug(f"Configured heat equation simulation with k={params.k}")
    elif params.simulation_type == SimulationType.advection_diffusion:
        sim_params["D"] = params.D
        sim_params["velocity"] = params.velocity
        logger.debug(f"Configured advection-diffusion simulation with D={params.D}, velocity={params.velocity}")
    
    return sim_params


def _generate_animation(params: SimulationParams, results: List[np.ndarray]) -> bytes:
    """
    Generate an animated GIF from simulation results.
    
    Args:
        params: Simulation parameters
        results: List of numpy arrays with simulation results at different timesteps
    
    Returns:
        Bytes of the generated GIF
    """
    # Get plot title and y-label based on simulation type
    plot_config = {
        SimulationType.diffusion: {
            'title': "1D Diffusion Simulation",
            'y_label': "Concentration"
        },
        SimulationType.heat: {
            'title': "1D Heat Equation Simulation",
            'y_label': "Temperature"
        },
        SimulationType.advection_diffusion: {
            'title': "1D Advection-Diffusion Simulation",
            'y_label': "Concentration"
        }
    }
    
    plot_title = plot_config[params.simulation_type]['title']
    y_label = plot_config[params.simulation_type]['y_label']
    
    # Create temporary directory for image files
    with tempfile.TemporaryDirectory() as tmp_dir:
        logger.debug(f"Created temporary directory: {tmp_dir}")
        filenames = []
        
        # Calculate consistent y-axis limits for all frames
        all_results = np.concatenate(results)
        y_min = np.min(all_results) * 0.9  # Add 10% margin
        y_max = np.max(all_results) * 1.1
        
        # Generate plot for each timestep
        x_values = np.linspace(0, params.nx * params.dx, params.nx)
        
        logger.debug(f"Generating {len(results)} plot frames")
        for i, result in enumerate(results):
            plt.figure(figsize=(10, 6))
            plt.plot(x_values, result)
            plt.title(f"{plot_title} - Timestep {i}")
            plt.xlabel('Position')
            plt.ylabel(y_label)
            plt.ylim(y_min, y_max)
            plt.grid(True)
            
            # Save the plot
            filename = os.path.join(tmp_dir, f"frame_{i:03d}.png")
            plt.savefig(filename)
            plt.close()
            filenames.append(filename)
        
        # Create an animated GIF
        logger.debug("Creating animated GIF")
        gif_file = os.path.join(tmp_dir, "animation.gif")
        
        with imageio.get_writer(gif_file, mode='I', duration=0.3) as writer:
            for filename in filenames:
                image = imageio.imread(filename)
                writer.append_data(image)
        
        # Read the GIF file
        with open(gif_file, "rb") as f:
            return f.read()


if __name__ == "__main__":
    """Start the FastAPI server when the script is run directly."""
    import uvicorn
    
    print("""
    ┌─────────────────────────────────────────┐
    │                                         │
    │      FusionSim Backend Server           │
    │                                         │
    │      http://localhost:8080              │
    │                                         │
    └─────────────────────────────────────────┘
    """)
    
    uvicorn.run(app, host="0.0.0.0", port=8080) 