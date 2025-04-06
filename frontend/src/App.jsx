import { useState } from 'react';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080';

const App = () => {
  // State for form inputs
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
  
  // State for UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
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

  // Get the relevant parameters based on simulation type
  const getRelevantParams = () => {
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
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    // Clear error and image when input changes
    setError(null);
    
    if (name === 'simulation_type') {
      setImageUrl(null); // Clear image when changing simulation type
      setFormData({
        ...formData,
        [name]: value
      });
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
    
    setValidation({
      ...validation,
      [name]: isValid
    });

    setFormData({
      ...formData,
      [name]: parsedValue
    });
  };

  // Check if all relevant inputs are valid
  const isFormValid = () => {
    const relevantParams = getRelevantParams();
    return relevantParams.every(param => validation[param]) && 
           relevantParams.every(param => {
             if (param === 'velocity') return formData[param] !== 0;
             if (param === 'store_frames') return Number.isInteger(formData[param]) && formData[param] > 0 && formData[param] <= 50;
             if (param === 'nx' || param === 'steps') return Number.isInteger(formData[param]) && formData[param] > 0;
             return formData[param] > 0;
           });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous results
    setError(null);
    setImageUrl(null);
    
    // Validate form
    if (!isFormValid()) {
      setError("All inputs must be valid numbers. Integer parameters must be whole numbers.");
      return;
    }
    
    // Ensure integer values are actually integers before sending
    const dataToSend = {...formData};
    if (dataToSend.nx) dataToSend.nx = Math.floor(dataToSend.nx);
    if (dataToSend.steps) dataToSend.steps = Math.floor(dataToSend.steps);
    if (dataToSend.store_frames) dataToSend.store_frames = Math.floor(dataToSend.store_frames);
    
    console.log("Sending data to server:", dataToSend);
    
    // Set loading state
    setLoading(true);
    
    try {
      // Make API request to backend with direct URL
      const response = await axios.post(`${API_BASE_URL}/diffusion`, dataToSend, {
        responseType: 'blob',  // Important for binary data like images
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'image/gif'
        }
      });
      
      // Create URL for the blob
      const url = URL.createObjectURL(new Blob([response.data], { type: 'image/gif' }));
      setImageUrl(url);
    } catch (err) {
      console.error("API Error:", err);
      
      // Try to extract more detailed error information
      if (err.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error("Error status:", err.response.status);
        console.error("Error headers:", err.response.headers);
        
        // Read the blob data as text to see any error messages
        if (err.response.data instanceof Blob) {
          try {
            const errorText = await err.response.data.text();
            console.error("Error data:", errorText);
            
            // Try to parse as JSON
            try {
              const errorJson = JSON.parse(errorText);
              setError(`Server error: ${errorJson.detail || errorJson.message || errorText}`);
            } catch {
              // Not JSON, use as is
              setError(`Server error: ${errorText.substring(0, 200)}${errorText.length > 200 ? '...' : ''}`);
            }
          } catch (textErr) {
            setError(`Error: ${err.message}. Check console for details.`);
          }
        } else {
          setError(`Server returned error: ${err.response.status} ${err.response.statusText}`);
        }
      } else if (err.request) {
        // The request was made but no response was received
        console.error("No response received:", err.request);
        setError("No response from server. Please check if the backend is running.");
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error("Error setting up request:", err.message);
        setError(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Get parameter label
  const getParameterLabel = (param) => {
    switch (param) {
      case 'nx': return 'Grid Size (nx) - Integer';
      case 'dx': return 'Grid Spacing (dx)';
      case 'D': return 'Diffusion Coefficient (D)';
      case 'k': return 'Thermal Conductivity (k)';
      case 'velocity': return 'Advection Velocity';
      case 'steps': return 'Time Steps - Integer';
      case 'dt': return 'Time Step Size (dt)';
      case 'store_frames': return 'Animation Frames (1-50) - Integer';
      default: return param;
    }
  };

  // Get simulation title based on type
  const getSimulationTitle = () => {
    switch (formData.simulation_type) {
      case 'diffusion': return 'Diffusion Simulation';
      case 'heat': return 'Heat Equation Simulation';
      case 'advection_diffusion': return 'Advection-Diffusion Simulation';
      default: return 'Simulation';
    }
  };

  // Add this function before the return statement
  const testBackendConnection = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/`);
      console.log("Backend connection test:", response.data);
      return true;
    } catch (err) {
      console.error("Backend connection test failed:", err);
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-6">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">
          FusionSim 1D {getSimulationTitle()}
        </h1>
        
        {/* Error message */}
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-md mb-4">
            <p className="text-sm">{error}</p>
            <button 
              className="mt-2 text-xs text-blue-600 hover:text-blue-800"
              onClick={() => testBackendConnection()
                .then(connected => {
                  if (connected) {
                    setError("Backend is running but there was an error with the simulation request.");
                  } else {
                    setError("Cannot connect to backend. Is the server running at " + API_BASE_URL + "?");
                  }
                })
              }
            >
              Test backend connection
            </button>
          </div>
        )}
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Simulation Type Selector */}
          <div>
            <label htmlFor="simulation_type" className="block text-sm font-medium text-gray-700">
              Simulation Type
            </label>
            <select
              id="simulation_type"
              name="simulation_type"
              value={formData.simulation_type}
              onChange={handleChange}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="diffusion">Diffusion</option>
              <option value="heat">Heat Equation</option>
              <option value="advection_diffusion">Advection-Diffusion</option>
            </select>
          </div>
          
          {/* Dynamic form fields based on simulation type */}
          {getRelevantParams().map(param => (
            <div key={param}>
              <label htmlFor={param} className="block text-sm font-medium text-gray-700">
                {getParameterLabel(param)}
              </label>
              <input
                type="number"
                step={param === 'nx' || param === 'steps' || param === 'store_frames' ? "1" : "0.1"}
                name={param}
                id={param}
                value={formData[param]}
                onChange={handleChange}
                className={`mt-1 block w-full px-3 py-2 border ${
                  validation[param] ? 'border-gray-300' : 'border-red-500'
                } rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
                required
                min={param === 'velocity' ? null : (param === 'nx' || param === 'steps' || param === 'store_frames' ? "1" : "0.1")}
                max={param === 'store_frames' ? "50" : null}
              />
              {param === 'store_frames' && (
                <p className="mt-1 text-xs text-gray-500">More frames = smoother animation but longer processing time</p>
              )}
              {(param === 'nx' || param === 'steps' || param === 'store_frames') && (
                <p className="mt-1 text-xs text-red-500 font-semibold">Must be a whole number!</p>
              )}
            </div>
          ))}
          
          {/* Submit button */}
          <div>
            <button
              type="submit"
              disabled={loading || !isFormValid()}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                loading || !isFormValid() 
                  ? 'bg-indigo-300 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
              }`}
            >
              {loading ? 'Running Simulation...' : 'Run Simulation'}
            </button>
          </div>
        </form>
        
        {/* Simulation result */}
        {imageUrl && (
          <div className="mt-6">
            <h2 className="text-lg font-medium text-gray-900 mb-2">Simulation Animation</h2>
            <img 
              src={imageUrl} 
              alt="Simulation Animation" 
              className="w-full h-auto border border-gray-300 rounded-md"
            />
            <p className="mt-2 text-sm text-gray-600 italic">
              Animation shows the evolution of the simulation over time
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App; 