import axios from 'axios'

// Production API URL
const API_BASE_URL = 'https://pm-backend-2ni8.onrender.com'

// Set axios defaults
axios.defaults.baseURL = API_BASE_URL

export { API_BASE_URL }
export default axios
