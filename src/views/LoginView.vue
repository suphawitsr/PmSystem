<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import '../config/api' // Sets axios.defaults.baseURL

const router = useRouter()
const username = ref('')
const password = ref('')
const errorMsg = ref('')

const login = async () => {
  try {
    errorMsg.value = ''
    const res = await axios.post('/auth/login', {
      username: username.value,
      password: password.value
    })
    
    localStorage.setItem('token', res.data.access_token)
    localStorage.setItem('user', JSON.stringify(res.data.user))
    
    // Set default axios header
    axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.access_token}`
    
    router.push('/')
  } catch (error: any) {
    errorMsg.value = error.response?.data?.message || 'Login failed'
  }
}
</script>

<template>
  <div class="min-h-[80vh] flex items-center justify-center">
    <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-100 dark:border-gray-700">
      <h2 class="text-2xl font-bold text-center mb-6">Log In</h2>
      
      <div v-if="errorMsg" class="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">
        {{ errorMsg }}
      </div>

      <form @submit.prevent="login" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
          <input v-model="username" type="text" required class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
          <input v-model="password" type="password" required class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700" />
        </div>
        
        <button type="submit" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium transition-colors">
          Sign In
        </button>
      </form>
      
      <div class="mt-4 text-center text-sm text-gray-500">
        Don't have an account? 
        <router-link to="/register" class="text-indigo-600 hover:underline">Register here</router-link>
      </div>
    </div>
  </div>
</template>
