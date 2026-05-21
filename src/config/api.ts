import axios from 'axios'

// Use environment variable or fallback to localhost
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

// Set axios defaults
axios.defaults.baseURL = API_BASE_URL

export { API_BASE_URL }
export default axios
