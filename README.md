# FusionSim

<p align="center">
  <img src="https://user-images.githubusercontent.com/YOUR_ID/YOUR_REPO/main/logo.png" alt="FusionSim" width="200"/>
</p>

<p align="center">
  <b>A powerful web application for running 1D diffusion simulations</b><br>
  Built with FastAPI, React, and FiPy
</p>

<p align="center">
  <a href="#overview">Overview</a> •
  <a href="#features">Features</a> •
  <a href="#screenshots">Screenshots</a> •
  <a href="#installation">Installation</a> •
  <a href="#usage">Usage</a> •
  <a href="#supported-simulations">Supported Simulations</a> •
  <a href="#technology-stack">Technology Stack</a> •
  <a href="#about-the-developer">About the Developer</a> •
  <a href="#license">License</a>
</p>

---

## Overview

FusionSim is an interactive web application designed to simulate and visualize one-dimensional diffusion processes. It provides an intuitive interface for configuring simulation parameters and generates animated visualizations of the simulation results in real-time.

The project demonstrates the application of numerical methods to solve partial differential equations, offering educational value for students and researchers interested in computational physics and mathematical modeling.

## Features

- 🧮 **Interactive Simulation Configuration**: Set custom parameters including grid size, time steps, and diffusion coefficients
- 🔄 **Multiple Simulation Types**: Support for diffusion, heat equation, and advection-diffusion processes
- 📊 **Real-time Visualization**: Watch simulations evolve through dynamic GIF animations
- 🔍 **Parameter Validation**: Comprehensive input validation for all parameters
- 💻 **Modern UI/UX**: Clean, responsive interface built with React and styled with TailwindCSS
- ⚡ **Fast Backend**: Efficient simulation processing with FastAPI
- 🛡️ **Error Handling**: Robust error feedback for both client-side and server-side issues

## Screenshots

*Simulation examples will appear here after running the application*

## Installation

### Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn

### Backend Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/Ratz-innovator/fusionsim.git
   cd fusionsim
   ```

2. Install the required Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Start the backend server:
   ```bash
   python main.py
   ```
   The backend will be available at `http://localhost:8080/`.

### Frontend Setup

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
   The frontend will be available at `http://localhost:5173/`.

## Usage

1. Choose a simulation type from the dropdown menu (Diffusion, Heat Equation, or Advection-Diffusion)
2. Adjust the simulation parameters according to your needs
3. Click the "Run Simulation" button to start the process
4. Wait for the simulation to complete and view the results in the animated GIF
5. Experiment with different parameters to observe their effects on the simulation

## Supported Simulations

### Diffusion

Simple 1D diffusion governed by the equation:
```
∂u/∂t = D * ∂²u/∂x²
```
where `D` is the diffusion coefficient.

### Heat Equation

1D heat conduction with fixed zero-temperature boundaries:
```
∂T/∂t = k * ∂²T/∂x²
```
where `k` is the thermal conductivity.

### Advection-Diffusion

Combined advection and diffusion processes:
```
∂u/∂t + v * ∂u/∂x = D * ∂²u/∂x²
```
where `v` is the advection velocity and `D` is the diffusion coefficient.

## Technology Stack

### Backend
- **FastAPI**: High-performance Python web framework
- **FiPy**: Finite volume PDE solver library
- **Matplotlib**: Visualization library for creating plots
- **NumPy**: Numerical computing library
- **Pydantic**: Data validation and settings management

### Frontend
- **React**: JavaScript library for building user interfaces
- **TailwindCSS**: Utility-first CSS framework
- **Axios**: Promise-based HTTP client
- **Vite**: Next-generation frontend tooling

## About the Developer

This project was entirely designed and implemented by me, Ratnesh Kumar, a self-taught developer passionate about computational physics and web development. With no formal education in computer science, I've learned programming principles, numerical methods, and web technologies through online resources, documentation, and persistent problem-solving.

FusionSim represents not just a technical achievement, but a testament to the power of self-directed learning and the accessibility of programming knowledge in today's digital landscape. The project demonstrates my ability to integrate complex mathematical concepts with modern web technologies to create useful applications.

From implementing differential equations in Python to designing a responsive frontend in React, every aspect of this project was built through self-study and determination. I'm proud to share this work as an example of what's possible through dedicated independent learning.

## License

This project is licensed under the MIT License.

---

<p align="center">
  Made with ❤️ by Ratnesh Kumar, a self-taught developer
</p> 