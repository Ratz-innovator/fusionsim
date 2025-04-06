from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from diffusion_simulation import run_simulation
from pydantic import BaseModel, Field, validator
import matplotlib
matplotlib.use('Agg')  # Use a non-interactive backend
import matplotlib.pyplot as plt
from io import BytesIO
from fastapi.responses import StreamingResponse, JSONResponse
from enum import Enum
from typing import Optional
import imageio.v2 as imageio
import os
import tempfile
import logging
import sys
import traceback

# Set up logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

class SimulationType(str, Enum):
    diffusion = "diffusion"
    heat = "heat"
    advection_diffusion = "advection_diffusion"

class SimulationParams(BaseModel):
    simulation_type: SimulationType = Field(default=SimulationType.diffusion, description="Type of simulation to run")
    nx: int = Field(50, gt=0, description="Number of grid cells")
    dx: float = Field(1.0, gt=0, description="Grid spacing")
    steps: int = Field(100, gt=0, description="Number of time steps")
    dt: float = Field(0.1, gt=0, description="Time step size")
    store_frames: int = Field(20, gt=0, le=50, description="Number of frames to include in animation")
    
    # Simulation-specific parameters
    D: Optional[float] = Field(1.0, gt=0, description="Diffusion coefficient (for diffusion and advection-diffusion)")
    k: Optional[float] = Field(1.0, gt=0, description="Thermal conductivity (for heat equation)")
    velocity: Optional[float] = Field(1.0, description="Advection velocity (for advection-diffusion)")

    # Validators to ensure integer fields are actually integers
    @validator('nx', 'steps', 'store_frames')
    def ensure_integers(cls, v, values, **kwargs):
        if not isinstance(v, int):
            raise ValueError(f"Must be an integer, got {type(v).__name__}")
        return v

@app.get("/")
async def root():
    return {"message": "FusionSim backend is running"}

@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {str(exc)}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc), "type": str(type(exc).__name__)}
    )

@app.post("/diffusion")
async def diffusion(params: SimulationParams):
    try:
        logger.debug(f"Received parameters: {params.dict()}")
        
        # Double-check that integer values are actually integers
        if not isinstance(params.nx, int):
            logger.error(f"nx should be an integer, got {type(params.nx).__name__}: {params.nx}")
            return JSONResponse(
                status_code=400,
                content={"detail": f"nx must be an integer, got {params.nx}"}
            )
        
        if not isinstance(params.steps, int):
            logger.error(f"steps should be an integer, got {type(params.steps).__name__}: {params.steps}")
            return JSONResponse(
                status_code=400,
                content={"detail": f"steps must be an integer, got {params.steps}"}
            )
        
        if not isinstance(params.store_frames, int):
            logger.error(f"store_frames should be an integer, got {type(params.store_frames).__name__}: {params.store_frames}")
            return JSONResponse(
                status_code=400,
                content={"detail": f"store_frames must be an integer, got {params.store_frames}"}
            )
        
        # Extract parameters based on simulation type
        sim_params = {
            "nx": params.nx,
            "dx": params.dx,
            "steps": params.steps,
            "dt": params.dt
        }
        
        # Add simulation-specific parameters
        if params.simulation_type == SimulationType.diffusion:
            sim_params["D"] = params.D
            plot_title = "1D Diffusion Simulation"
            y_label = "Concentration"
            logger.debug(f"Running diffusion simulation with D={params.D}")
            
        elif params.simulation_type == SimulationType.heat:
            sim_params["k"] = params.k
            plot_title = "1D Heat Equation Simulation"
            y_label = "Temperature"
            logger.debug(f"Running heat equation simulation with k={params.k}")
            
        elif params.simulation_type == SimulationType.advection_diffusion:
            sim_params["D"] = params.D
            sim_params["velocity"] = params.velocity
            plot_title = "1D Advection-Diffusion Simulation"
            y_label = "Concentration"
            logger.debug(f"Running advection-diffusion simulation with D={params.D}, velocity={params.velocity}")
        
        logger.debug("Starting simulation")
        # Run the simulation
        try:
            results = run_simulation(
                simulation_type=params.simulation_type,
                store_steps=params.store_frames,
                **sim_params
            )
            logger.debug(f"Simulation completed with {len(results)} timesteps")
        except Exception as sim_error:
            logger.error(f"Error in simulation: {str(sim_error)}")
            return JSONResponse(
                status_code=500,
                content={"detail": f"Simulation error: {str(sim_error)}"}
            )
        
        # Create a temporary directory for image files
        logger.debug("Creating temporary directory for GIF creation")
        try:
            with tempfile.TemporaryDirectory() as tmp_dir:
                logger.debug(f"Temporary directory created: {tmp_dir}")
                filenames = []
                
                # Create a consistent y-axis limit for all frames
                all_results = np.concatenate(results)
                y_min = np.min(all_results) * 0.9  # Add 10% margin
                y_max = np.max(all_results) * 1.1
                
                # Generate plot for each timestep
                x_values = np.linspace(0, params.nx * params.dx, params.nx)
                
                logger.debug(f"Generating {len(results)} plot frames")
                for i, result in enumerate(results):
                    try:
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
                    except Exception as plot_error:
                        logger.error(f"Error creating plot {i}: {str(plot_error)}")
                        return JSONResponse(
                            status_code=500, 
                            content={"detail": f"Plot generation error: {str(plot_error)}"}
                        )
                
                # Create an animated GIF
                logger.debug("Creating animated GIF")
                gif_file = os.path.join(tmp_dir, "animation.gif")
                
                try:
                    with imageio.get_writer(gif_file, mode='I', duration=0.3) as writer:
                        for filename in filenames:
                            image = imageio.imread(filename)
                            writer.append_data(image)
                    
                    # Return the GIF as a streaming response
                    logger.debug("Reading GIF file")
                    with open(gif_file, "rb") as f:
                        gif_bytes = f.read()
                    
                    logger.debug("Returning GIF response")
                    return StreamingResponse(BytesIO(gif_bytes), media_type="image/gif")
                except Exception as gif_error:
                    logger.error(f"Error creating GIF: {str(gif_error)}")
                    return JSONResponse(
                        status_code=500,
                        content={"detail": f"GIF creation error: {str(gif_error)}"}
                    )
        except Exception as temp_dir_error:
            logger.error(f"Error with temporary directory: {str(temp_dir_error)}")
            return JSONResponse(
                status_code=500,
                content={"detail": f"Temporary directory error: {str(temp_dir_error)}"}
            )
    
    except Exception as e:
        logger.error(f"Unhandled exception: {str(e)}")
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={"detail": str(e), "type": str(type(e).__name__)}
        ) 