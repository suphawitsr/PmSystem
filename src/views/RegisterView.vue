<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'
import '../config/api' // Sets axios.defaults.baseURL

const router = useRouter()
const name = ref('')
const username = ref('')
const password = ref('')
const role = ref('STAFF')
const errorMsg = ref('')

const register = async () => {
  try {
    errorMsg.value = ''
    await axios.post('/auth/register', {
      name: name.value,
      username: username.value,
      password: password.value,
      role: role.value
    })
    
    // Log in automatically or just redirect
    router.push('/login')
  } catch (error: any) {
    errorMsg.value = error.response?.data?.message || 'Registration failed'
  }
}
</script>

<template>
  <div class="min-h-[80vh] flex items-center justify-center">
    <div class="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md border border-gray-100 dark:border-gray-700">
      <h2 class="text-2xl font-bold text-center mb-6">Register Staff</h2>
      
      <div v-if="errorMsg" class="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm text-center">
        {{ errorMsg }}
      </div>

      <form @submit.prevent="register" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
          <input v-model="name" type="text" required class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
          <input v-model="username" type="text" required class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
          <input v-model="password" type="password" required class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
          <select v-model="role" class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700">
            <option value="STAFF">Staff</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>
        
        <button type="submit" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg font-medium transition-colors">
          Create Account
        </button>
      </form>
      
      <div class="mt-4 text-center text-sm text-gray-500">
        Already have an account? 
        <router-link to="/login" class="text-emerald-600 hover:underline">Log in</router-link>
      </div>
    </div>
  </div>
</template>
