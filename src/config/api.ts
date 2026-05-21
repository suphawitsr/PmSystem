import axios from 'axios'

// Use environment variable or fallback to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://pm-backend-2ni8.onrender.com'

// Set axios defaults
axios.defaults.baseURL = API_BASE_URL

export { API_BASE_URL }
export default axios
