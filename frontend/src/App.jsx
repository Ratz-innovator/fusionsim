/**
 * FusionSim Frontend Application
 * 
 * A React-based frontend for configuring and running 1D diffusion simulations
 * with interactive forms and real-time visualization.
 */

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Configuration
const API_BASE_URL = 'http://localhost:8080';

// Component definitions
const App = () => {
  // Application state
  const [formData, setFormData] = useState({
    simulation_type: "diffusion",
    nx: 50,
    dx: 1.0,
    D: 1.0,
    k: 1.0,
    velocity: 1.0,
    steps: 100,
    dt: 0.1,
    store_frames: 20
  });
  
  const [appState, setAppState] = useState({
    loading: false,
    error: null,
    imageUrl: null,
    backendStatus: 'checking'
  });
  
  const [validation, setValidation] = useState({
    nx: true,
    dx: true,
    D: true,
    k: true,
    velocity: true,
    steps: true,
    dt: true,
    store_frames: true
  });

  // Check backend connectivity on load
  useEffect(() => {
    testBackendConnection();
  }, []);

  // Get the relevant parameters based on simulation type
  const getRelevantParams = useCallback(() => {
    const commonParams = ['nx', 'dx', 'steps', 'dt', 'store_frames'];
    
    switch (formData.simulation_type) {
      case 'diffusion':
        return [...commonParams, 'D'];
      case 'heat':
        return [...commonParams, 'k'];
      case 'advection_diffusion':
        return [...commonParams, 'D', 'velocity'];
      default:
        return commonParams;
    }
  }, [formData.simulation_type]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Clear error and image when input changes
    setAppState(prev => ({
      ...prev,
      error: null
    }));
    
    // Handle simulation type change separately
    if (name === 'simulation_type') {
      setAppState(prev => ({
        ...prev,
        imageUrl: null
      }));
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      return;
    }
    
    // Parse value based on input type
    let parsedValue;
    if (name === 'nx' || name === 'steps' || name === 'store_frames') {
      parsedValue = parseInt(value, 10);
    } else {
      parsedValue = parseFloat(value);
    }
    
    // Validate input
    let isValid;
    if (name === 'velocity') {
      isValid = parsedValue !== 0;
    } else if (name === 'store_frames') {
      isValid = parsedValue > 0 && parsedValue <= 50;
    } else if (name === 'nx' || name === 'steps') {
      isValid = Number.isInteger(parsedValue) && parsedValue > 0;
    } else {
      isValid = parsedValue > 0;
    }
    
    // Update validation state
    setValidation(prev => ({
      ...prev,
      [name]: isValid
    }));

    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: parsedValue
    }));
  };

  // Check if all relevant inputs are valid
  const isFormValid = useCallback(() => {
    const relevantParams = getRelevantParams();
    return relevantParams.every(param => validation[param]) && 
           relevantParams.every(param => {
             if (param === 'velocity') return formData[param] !== 0;
             if (param === 'store_frames') return Number.isInteger(formData[param]) && formData[param] > 0 && formData[param] <= 50;
             if (param === 'nx' || param === 'steps') return Number.isInteger(formData[param]) && formData[param] > 0;
             return formData[param] > 0;
           });
  }, [formData, validation, getRelevantParams]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous results
    setAppState(prev => ({
      ...prev,
      error: null,
      imageUrl: null,
      loading: true
    }));
    
    // Validate form
    if (!isFormValid()) {
      setAppState(prev => ({
        ...prev,
        error: "All inputs must be valid numbers. Integer parameters must be whole numbers.",
        loading: false
      }));
      return;
    }
    
    // Ensure integer values are actually integers before sending
    const dataToSend = {...formData};
    if (dataToSend.nx) dataToSend.nx = Math.floor(dataToSend.nx);
    if (dataToSend.steps) dataToSend.steps = Math.floor(dataToSend.steps);
    if (dataToSend.store_frames) dataToSend.store_frames = Math.floor(dataToSend.store_frames);
    
    console.log("Sending data to server:", dataToSend);
    
    try {
      // Make API request to backend
      const response = await axios.post(`${API_BASE_URL}/diffusion`, dataToSend, {
        responseType: 'blob',  // Important for binary data like images
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'image/gif'
        }
      });
      
      // Create URL for the blob
      const url = URL.createObjectURL(new Blob([response.data], { type: 'image/gif' }));
      setAppState(prev => ({
        ...prev,
        imageUrl: url,
        loading: false
      }));
    } catch (err) {
      console.error("API Error:", err);
      
      await handleApiError(err);
    }
  };
  
  // Handle API errors
  const handleApiError = async (err) => {
    let errorMessage = "An unexpected error occurred";
    
    try {
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Error status:", err.response.status);
        
        // Read the blob data as text to see any error messages
        if (err.response.data instanceof Blob) {
          const errorText = await err.response.data.text();
          console.error("Error data:", errorText);
          
          // Try to parse as JSON
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = `Server error: ${errorJson.detail || errorJson.message || errorText}`;
          } catch {
            // Not JSON, use as is
            errorMessage = `Server error: ${errorText.substring(0, 200)}${errorText.length > 200 ? '...' : ''}`;
          }
        } else {
          errorMessage = `Server returned error: ${err.response.status} ${err.response.statusText}`;
        }
      } else if (err.request) {
        // The request was made but no response was received
        console.error("No response received:", err.request);
        errorMessage = "No response from server. Please check if the backend is running.";
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error("Error setting up request:", err.message);
        errorMessage = `Error: ${err.message}`;
      }
    } catch (parseError) {
      errorMessage = `Error: ${err.message}. Check console for details.`;
    }
    
    setAppState(prev => ({
      ...prev,
      error: errorMessage,
      loading: false
    }));
  };
  
  // Test backend connection
  const testBackendConnection = async () => {
    try {
      setAppState(prev => ({
        ...prev,
        backendStatus: 'checking'
      }));
      
      const response = await axios.get(`${API_BASE_URL}/`);
      if (response.status === 200) {
        setAppState(prev => ({
          ...prev,
          backendStatus: 'connected'
        }));
      } else {
        setAppState(prev => ({
          ...prev,
          backendStatus: 'error'
        }));
      }
    } catch (err) {
      console.error("Backend connection error:", err);
      setAppState(prev => ({
        ...prev,
        backendStatus: 'error'
      }));
    }
  };

  // Get parameter label with proper formatting
  const getParameterLabel = (param) => {
    switch (param) {
      case 'nx': return 'Grid Size (nx) - Integer';
      case 'dx': return 'Grid Spacing (dx)';
      case 'D': return 'Diffusion Coefficient (D)';
      case 'k': return 'Thermal Conductivity (k)';
      case 'velocity': return 'Advection Velocity';
      case 'steps': return 'Time Steps - Integer';
      case 'dt': return 'Time Step Size (dt)';
      case 'store_frames': return 'Animation Frames - Integer (max 50)';
      default: return param;
    }
  };
  
  // Get simulation title
  const getSimulationTitle = () => {
    switch (formData.simulation_type) {
      case 'diffusion': return 'Diffusion Simulation';
      case 'heat': return 'Heat Equation Simulation';
      case 'advection_diffusion': return 'Advection-Diffusion Simulation';
      default: return 'Simulation';
    }
  };
  
  // Get simulation description
  const getSimulationDescription = () => {
    switch (formData.simulation_type) {
      case 'diffusion':
        return (
          <div>
            <p>
              This simulation models the <strong>one-dimensional diffusion process</strong> of a substance, governed by the equation:
            </p>
            <pre className="bg-gray-100 p-2 rounded-md text-sm overflow-x-auto my-3">∂u/∂t = D * ∂²u/∂x²</pre>
            <p>
              Where <code>D</code> is the diffusion coefficient controlling how quickly the substance spreads. 
              The simulation starts with a Gaussian pulse in the center of the domain.
            </p>
          </div>
        );
      case 'heat':
        return (
          <div>
            <p>
              This simulation models <strong>one-dimensional heat conduction</strong>, governed by the equation:
            </p>
            <pre className="bg-gray-100 p-2 rounded-md text-sm overflow-x-auto my-3">∂T/∂t = k * ∂²T/∂x²</pre>
            <p>
              Where <code>k</code> is the thermal conductivity coefficient. 
              The simulation starts with a heat source in the center and fixed zero-temperature boundaries.
            </p>
          </div>
        );
      case 'advection_diffusion':
        return (
          <div>
            <p>
              This simulation models the <strong>combined advection and diffusion process</strong>, governed by the equation:
            </p>
            <pre className="bg-gray-100 p-2 rounded-md text-sm overflow-x-auto my-3">∂u/∂t + v * ∂u/∂x = D * ∂²u/∂x²</pre>
            <p>
              Where <code>v</code> is the advection velocity and <code>D</code> is the diffusion coefficient. 
              The simulation shows how a substance is simultaneously transported and spread out.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  // Extract state variables for readability
  const { loading, error, imageUrl, backendStatus } = appState;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex flex-col">
      {/* Header Component */}
      <Header 
        backendStatus={backendStatus} 
        testBackendConnection={testBackendConnection} 
      />

      <main className="container mx-auto px-4 py-6 flex-grow">
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Title Section */}
          <TitleSection title={getSimulationTitle()} />
          
          <div className="p-6">
            {/* Grid layout for form and results */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form Section */}
              <FormSection
                formData={formData}
                validation={validation}
                loading={loading}
                error={error}
                backendStatus={backendStatus}
                getRelevantParams={getRelevantParams}
                getParameterLabel={getParameterLabel}
                handleChange={handleChange}
                handleSubmit={handleSubmit}
                isFormValid={isFormValid}
              />
              
              {/* Results Section */}
              <ResultsSection imageUrl={imageUrl} />
            </div>
            
            {/* Simulation Information */}
            <div className="mt-8 bg-gray-50 p-5 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">About This Simulation</h3>
              <div className="prose max-w-none">
                {getSimulationDescription()}
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer Component */}
      <Footer />
    </div>
  );
};

// Header component
const Header = ({ backendStatus, testBackendConnection }) => (
  <header className="bg-white shadow-md py-4">
    <div className="container mx-auto px-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="bg-blue-600 rounded-full w-10 h-10 flex items-center justify-center text-white font-bold text-xl">F</div>
        <h1 className="text-2xl font-bold text-gray-800">FusionSim</h1>
      </div>
      <BackendStatus status={backendStatus} onRetry={testBackendConnection} />
    </div>
  </header>
);

// Backend status indicator
const BackendStatus = ({ status, onRetry }) => {
  const statusConfig = {
    connected: { 
      text: 'Backend Connected', 
      color: 'text-green-700', 
      dotColor: 'bg-green-600' 
    },
    checking: { 
      text: 'Checking Connection', 
      color: 'text-yellow-700', 
      dotColor: 'bg-yellow-600' 
    },
    error: { 
      text: 'Backend Disconnected', 
      color: 'text-red-700', 
      dotColor: 'bg-red-600',
      showRetry: true
    }
  };
  
  const config = statusConfig[status] || statusConfig.checking;
  
  return (
    <div className="text-sm px-3 py-1 rounded-full flex items-center">
      <span className={`flex items-center ${config.color}`}>
        <span className={`w-2 h-2 ${config.dotColor} rounded-full mr-2`}></span>
        {config.text}
        {config.showRetry && (
          <button 
            className="ml-2 text-blue-600 underline text-xs"
            onClick={onRetry}
          >
            Retry
          </button>
        )}
      </span>
    </div>
  );
};

// Title Section
const TitleSection = ({ title }) => (
  <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
    <h2 className="text-2xl font-bold">{title}</h2>
    <p className="mt-1 text-blue-100">Configure parameters and visualize your simulation</p>
  </div>
);

// Form Section
const FormSection = ({ 
  formData, 
  validation, 
  loading, 
  error, 
  backendStatus, 
  getRelevantParams, 
  getParameterLabel, 
  handleChange, 
  handleSubmit, 
  isFormValid 
}) => (
  <div className="bg-gray-50 p-5 rounded-lg shadow-sm">
    <h3 className="text-lg font-semibold text-gray-700 mb-4">Simulation Parameters</h3>
    
    <form onSubmit={handleSubmit}>
      {/* Simulation Type Selector */}
      <div className="mb-5">
        <label className="block text-gray-700 font-medium mb-2" htmlFor="simulation_type">
          Simulation Type
        </label>
        <select
          id="simulation_type"
          name="simulation_type"
          value={formData.simulation_type}
          onChange={handleChange}
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="diffusion">Diffusion</option>
          <option value="heat">Heat Equation</option>
          <option value="advection_diffusion">Advection-Diffusion</option>
        </select>
      </div>
      
      {/* Dynamic Parameter Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {getRelevantParams().map(param => (
          <ParameterField
            key={param}
            param={param}
            value={formData[param]}
            isValid={validation[param]}
            label={getParameterLabel(param)}
            onChange={handleChange}
          />
        ))}
      </div>
      
      {/* Submit Button */}
      <SubmitButton 
        loading={loading} 
        disabled={loading || !isFormValid() || backendStatus !== 'connected'} 
      />
      
      {/* Error Display */}
      {error && <ErrorMessage message={error} />}
    </form>
  </div>
);

// Parameter Input Field
const ParameterField = ({ param, value, isValid, label, onChange }) => {
  const isInteger = param === 'nx' || param === 'steps' || param === 'store_frames';
  
  const getErrorMessage = () => {
    if (param === 'velocity') return 'Velocity cannot be zero.';
    if (param === 'store_frames') return 'Must be a positive integer up to 50.';
    if (isInteger) return 'Must be a positive integer.';
    return 'Must be a positive number.';
  };
  
  return (
    <div className="mb-4">
      <label className="block text-gray-700 font-medium mb-2" htmlFor={param}>
        {label}
      </label>
      <input
        type="number"
        id={param}
        name={param}
        value={value}
        onChange={onChange}
        className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 ${
          isValid ? 'border-gray-300 focus:ring-blue-500' : 'border-red-500 focus:ring-red-500'
        }`}
        step={isInteger ? "1" : "0.1"}
      />
      {!isValid && (
        <p className="mt-1 text-red-600 text-sm">
          {getErrorMessage()}
        </p>
      )}
    </div>
  );
};

// Submit Button with Loading State
const SubmitButton = ({ loading, disabled }) => (
  <div className="mt-6">
    <button
      type="submit"
      disabled={disabled}
      className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors ${
        loading ? 'bg-gray-500' : 
        disabled ? 'bg-gray-400 cursor-not-allowed' : 
        'bg-blue-600 hover:bg-blue-700'
      }`}
    >
      {loading ? (
        <span className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Running Simulation...
        </span>
      ) : 'Run Simulation'}
    </button>
  </div>
);

// Error Message Display
const ErrorMessage = ({ message }) => (
  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
    <strong>Error:</strong> {message}
  </div>
);

// Results Section
const ResultsSection = ({ imageUrl }) => (
  <div className="bg-gray-50 p-5 rounded-lg shadow-sm flex flex-col">
    <h3 className="text-lg font-semibold text-gray-700 mb-4">Simulation Results</h3>
    
    <div className="flex-grow flex items-center justify-center bg-white border border-gray-200 rounded-md p-4">
      {imageUrl ? (
        <SimulationResult imageUrl={imageUrl} />
      ) : (
        <NoResultsPlaceholder />
      )}
    </div>
  </div>
);

// Simulation Result Display
const SimulationResult = ({ imageUrl }) => (
  <div className="text-center">
    <img 
      src={imageUrl} 
      alt="Simulation Result" 
      className="max-w-full h-auto rounded-md shadow-sm mx-auto"
    />
    <p className="mt-3 text-gray-600 text-sm">
      The animation shows how the system evolves over time based on your parameters.
    </p>
  </div>
);

// No Results Placeholder
const NoResultsPlaceholder = () => (
  <div className="text-center text-gray-500">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
    <p className="text-lg font-medium">No Simulation Results Yet</p>
    <p className="mt-2">Configure parameters and run a simulation to see results here.</p>
  </div>
);

// Footer Component
const Footer = () => (
  <footer className="bg-gray-800 text-white py-6 mt-10">
    <div className="container mx-auto px-4">
      <div className="flex flex-col md:flex-row justify-between items-center">
        <div className="mb-4 md:mb-0">
          <div className="flex items-center">
            <div className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-white font-bold text-sm mr-2">F</div>
            <span className="font-semibold text-lg">FusionSim</span>
          </div>
          <p className="text-gray-400 text-sm mt-1">A powerful 1D diffusion simulation tool</p>
        </div>
        
        <div className="text-center md:text-right">
          <p className="text-sm text-gray-400">Made with ❤️ by a self-taught developer</p>
          <p className="text-xs text-gray-500 mt-1">© {new Date().getFullYear()} FusionSim. All rights reserved.</p>
        </div>
      </div>
    </div>
  </footer>
);

export default App; 