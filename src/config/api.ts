import axios from 'axios'

// Production API URL
const API_BASE_URL = 'https://pm-backend-2ni8.onrender.com'

// Set axios defaults
axios.defaults.baseURL = API_BASE_URL

// Always attach the latest token from localStorage on every request
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export { API_BASE_URL }
export default axios
