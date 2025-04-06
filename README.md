# FusionSim

A web application for running 1D diffusion simulations using FastAPI and React.

## Project Structure

- `main.py`: FastAPI backend application
- `diffusion_simulation.py`: FiPy simulation module
- `frontend/`: React frontend application

## Backend Setup

1. Install the required dependencies:

```bash
pip install -r requirements.txt
pip install imageio  # For GIF animation support
```

2. Start the backend server:

```bash
uvicorn main:app --reload
```

The backend will start at `http://127.0.0.1:8000/`.

## Frontend Setup

1. Navigate to the frontend directory:

```bash
cd frontend
```

2. Install the frontend dependencies:

```bash
npm install
```

3. Start the frontend development server:

```bash
npm run dev
```

The frontend will start at `http://localhost:5173/` and automatically proxy API requests to the backend.

## API Endpoints

- `GET /`: Returns a message confirming the backend is running
- `POST /diffusion`: Runs a simulation based on input parameters and returns an animated GIF showing the evolution of the simulation over time

## Supported Simulation Types

- **Diffusion**: Simple 1D diffusion of a Gaussian pulse
- **Heat Equation**: 1D heat conduction with fixed zero-temperature boundaries
- **Advection-Diffusion**: Combined advection and diffusion processes

## Features

- Interactive form for configuring simulation parameters
- Input validation for all parameters (must be positive numbers)
- Support for multiple simulation types (diffusion, heat equation, advection-diffusion)
- Real-time feedback with TailwindCSS styling
- Error handling for failed API requests
- Animated GIFs showing the evolution of simulations over time
- Responsive design 