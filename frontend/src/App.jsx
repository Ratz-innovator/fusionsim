import { useState, useEffect } from 'react';
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
  const [backendStatus, setBackendStatus] = useState('checking');
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

  // Test backend connection
  const testBackendConnection = async () => {
    try {
      setBackendStatus('checking');
      const response = await axios.get(`${API_BASE_URL}/`);
      if (response.status === 200) {
        setBackendStatus('connected');
      } else {
        setBackendStatus('error');
      }
    } catch (err) {
      console.error("Backend connection error:", err);
      setBackendStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-md py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 rounded-full w-10 h-10 flex items-center justify-center text-white font-bold text-xl">F</div>
            <h1 className="text-2xl font-bold text-gray-800">FusionSim</h1>
          </div>
          <div className="text-sm px-3 py-1 rounded-full flex items-center">
            {backendStatus === 'connected' && (
              <span className="flex items-center text-green-700">
                <span className="w-2 h-2 bg-green-600 rounded-full mr-2"></span>
                Backend Connected
              </span>
            )}
            {backendStatus === 'checking' && (
              <span className="flex items-center text-yellow-700">
                <span className="w-2 h-2 bg-yellow-600 rounded-full mr-2"></span>
                Checking Connection
              </span>
            )}
            {backendStatus === 'error' && (
              <span className="flex items-center text-red-700">
                <span className="w-2 h-2 bg-red-600 rounded-full mr-2"></span>
                Backend Disconnected
                <button 
                  className="ml-2 text-blue-600 underline text-xs"
                  onClick={testBackendConnection}
                >
                  Retry
                </button>
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 flex-grow">
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
            <h2 className="text-2xl font-bold">{getSimulationTitle()}</h2>
            <p className="mt-1 text-blue-100">Configure parameters and visualize your simulation</p>
          </div>
          
          <div className="p-6">
            {/* Grid layout for form and results */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form section */}
              <div className="bg-gray-50 p-5 rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Simulation Parameters</h3>
                
                <form onSubmit={handleSubmit}>
                  {/* Simulation Type */}
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
                  
                  {/* Dynamic form fields based on simulation type */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {getRelevantParams().map(param => (
                      <div key={param} className="mb-4">
                        <label className="block text-gray-700 font-medium mb-2" htmlFor={param}>
                          {getParameterLabel(param)}
                        </label>
                        <input
                          type="number"
                          id={param}
                          name={param}
                          value={formData[param]}
                          onChange={handleChange}
                          className={`w-full p-2 border rounded-md focus:outline-none focus:ring-2 ${
                            validation[param] ? 'border-gray-300 focus:ring-blue-500' : 'border-red-500 focus:ring-red-500'
                          }`}
                          step={param === 'nx' || param === 'steps' || param === 'store_frames' ? "1" : "0.1"}
                        />
                        {!validation[param] && (
                          <p className="mt-1 text-red-600 text-sm">
                            {param === 'velocity' ? 'Velocity cannot be zero.' : 
                             param === 'store_frames' ? 'Must be a positive integer up to 50.' :
                             param === 'nx' || param === 'steps' ? 'Must be a positive integer.' :
                             'Must be a positive number.'}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Submit button */}
                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={loading || !isFormValid() || backendStatus !== 'connected'}
                      className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors ${
                        loading ? 'bg-gray-500' : 
                        !isFormValid() || backendStatus !== 'connected' ? 'bg-gray-400 cursor-not-allowed' : 
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
                  
                  {/* Error message */}
                  {error && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                      <strong>Error:</strong> {error}
                    </div>
                  )}
                </form>
              </div>
              
              {/* Results section */}
              <div className="bg-gray-50 p-5 rounded-lg shadow-sm flex flex-col">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Simulation Results</h3>
                
                <div className="flex-grow flex items-center justify-center bg-white border border-gray-200 rounded-md p-4">
                  {imageUrl ? (
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
                  ) : (
                    <div className="text-center text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <p className="text-lg font-medium">No Simulation Results Yet</p>
                      <p className="mt-2">Configure parameters and run a simulation to see results here.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Simulation Information */}
            <div className="mt-8 bg-gray-50 p-5 rounded-lg shadow-sm">
              <h3 className="text-lg font-semibold text-gray-700 mb-4">About This Simulation</h3>
              
              <div className="prose max-w-none">
                {formData.simulation_type === 'diffusion' && (
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
                )}
                
                {formData.simulation_type === 'heat' && (
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
                )}
                
                {formData.simulation_type === 'advection_diffusion' && (
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
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
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
    </div>
  );
};

export default App; 