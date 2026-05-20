<script setup lang="ts">
import { ref, computed, watchEffect, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import {
  HomeIcon,
  ComputerDesktopIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/vue/24/outline'
import axios from 'axios'

const route = useRoute()
const router = useRouter()

const isAuthRoute = computed(() => ['login'].includes(route.name as string))
const user = ref<any>(null)
const assignedEquipments = ref<any[]>([])
const notifOpen = ref(false)

// Helper function to check if equipment needs PM (not recently completed)
const isRecentlyCompleted = (equipment: any) => {
  if (!equipment.lastPmDate) return false
  const lastPm = new Date(equipment.lastPmDate)
  const nextPm = equipment.nextPmDate ? new Date(equipment.nextPmDate) : null
  const today = new Date()
  const daysSinceLastPm = Math.floor((today.getTime() - lastPm.getTime()) / (1000 * 60 * 60 * 24))
  return daysSinceLastPm <= 7 && nextPm && nextPm > today
}

// Computed count of pending tasks (equipment that needs PM attention)
const pendingCount = computed(() => {
  return assignedEquipments.value.filter(eq => !isRecentlyCompleted(eq)).length
})

// Filtered pending equipment for notifications
const pendingEquipments = computed(() => {
  return assignedEquipments.value.filter(eq => !isRecentlyCompleted(eq))
})

const fetchAssigned = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/equipment')
    assignedEquipments.value = res.data.filter((e: any) => e.assignedStaffId === user.value.id)
  } catch {}
}

watchEffect(() => {
  const userStr = localStorage.getItem('user')
  const token = localStorage.getItem('token')
  if (userStr && token) {
    user.value = JSON.parse(userStr)
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    if (user.value.role === 'STAFF') {
      fetchAssigned()
    }
  } else {
    user.value = null
  }
})

// Re-read localStorage on route change to update user state after login
watch(() => route.path, () => {
  const userStr = localStorage.getItem('user')
  const token = localStorage.getItem('token')
  if (userStr && token) {
    const parsedUser = JSON.parse(userStr)
    // Only update if different to avoid unnecessary re-renders
    if (JSON.stringify(user.value) !== JSON.stringify(parsedUser)) {
      user.value = parsedUser
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      if (user.value?.role === 'STAFF') {
        fetchAssigned()
      }
    }
  } else {
    user.value = null
  }
})

const logout = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  user.value = null
  assignedEquipments.value = []
  delete axios.defaults.headers.common['Authorization']
  router.push('/login')
}

const goToMyTasks = () => {
  notifOpen.value = false
  router.push('/my-tasks')
}
</script>

<template>
  <div class="flex h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100">
    <!-- Sidebar -->
    <aside v-if="!isAuthRoute" class="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300">
      <div class="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-700">
        <h1 class="text-xl font-bold text-indigo-600 dark:text-indigo-400">PM System</h1>
      </div>

      <nav class="flex-1 overflow-y-auto py-4">
        <ul class="space-y-1 px-3">
          <li>
            <RouterLink
              to="/"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              active-class="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
            >
              <HomeIcon class="w-5 h-5" />
              Dashboard
            </RouterLink>
          </li>

          <!-- Staff: My Tasks link -->
          <li v-if="user?.role === 'STAFF'">
            <RouterLink
              to="/my-tasks"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              active-class="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
            >
              <ClipboardDocumentCheckIcon class="w-5 h-5" />
              งานของฉัน
              <span v-if="pendingCount > 0" class="ml-auto bg-indigo-600 text-white text-xs rounded-full px-2 py-0.5">{{ pendingCount }}</span>
            </RouterLink>
          </li>

          <li>
            <RouterLink
              to="/equipment"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              active-class="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
            >
              <ComputerDesktopIcon class="w-5 h-5" />
              Equipment
            </RouterLink>
          </li>

          <li>
            <RouterLink
              to="/pm-history"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              active-class="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
            >
              <ClipboardDocumentListIcon class="w-5 h-5" />
              PM History
            </RouterLink>
          </li>

          <!-- Admin only -->
          <li v-if="user?.role === 'ADMIN'">
            <RouterLink
              to="/staff"
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              active-class="bg-indigo-50 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300"
            >
              <UsersIcon class="w-5 h-5" />
              User Management
            </RouterLink>
          </li>
        </ul>
      </nav>

      <!-- Role badge -->
      <div class="px-4 pb-2">
        <div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
          <div class="w-7 h-7 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold uppercase text-xs">
            {{ (user?.name || user?.username || 'A')[0] }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-xs font-medium truncate">{{ user?.name || user?.username }}</div>
            <div class="text-xs text-gray-400">{{ user?.role }}</div>
          </div>
        </div>
      </div>

      <div class="p-4 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 text-center">
        &copy; 2026 PM System
      </div>
    </aside>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col overflow-hidden">
      <!-- Header -->
      <header v-if="!isAuthRoute" class="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-8 z-10 shadow-sm">
        <div class="text-sm font-medium text-gray-500">
          Welcome back, <span class="text-gray-900 dark:text-gray-100 font-semibold">{{ user?.name || user?.username }}</span>
        </div>

        <div class="flex items-center gap-3">
          <!-- Staff notification bell -->
          <div v-if="user?.role === 'STAFF'" class="relative">
            <button
              @click="notifOpen = !notifOpen"
              class="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <BellIcon class="w-5 h-5 text-gray-500" />
              <span
                v-if="pendingCount > 0"
                class="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold"
              >{{ pendingCount }}</span>
            </button>

            <!-- Notification dropdown -->
            <div
              v-if="notifOpen"
              class="absolute right-0 top-12 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
            >
              <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <span class="font-semibold text-sm">งานที่ได้รับมอบหมาย</span>
                <span class="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{{ pendingCount }} รายการ</span>
              </div>
              <ul v-if="pendingEquipments.length > 0" class="max-h-64 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                <li
                  v-for="eq in pendingEquipments"
                  :key="eq.id"
                  class="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div class="text-sm font-medium">{{ eq.name }}</div>
                  <div class="text-xs text-gray-400">{{ eq.serialNumber }} · {{ eq.zoneCode }}</div>
                  <div class="text-xs mt-1" :class="eq.nextPmDate && new Date(eq.nextPmDate) < new Date() ? 'text-red-500 font-medium' : 'text-gray-400'">
                    Next PM: {{ eq.nextPmDate ? new Date(eq.nextPmDate).toLocaleDateString('th-TH') : 'N/A' }}
                  </div>
                </li>
              </ul>
              <div v-else class="px-4 py-8 text-center text-gray-500 text-sm">
                ไม่มีงานที่ต้องจัดการในขณะนี้
              </div>
              <div class="p-3 border-t border-gray-100 dark:border-gray-700">
                <button @click="goToMyTasks" class="w-full text-center text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-medium">
                  ดูงานทั้งหมด →
                </button>
              </div>
            </div>
          </div>

          <button @click="logout" class="flex items-center gap-2 text-gray-500 hover:text-red-500 transition-colors px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm" title="Log Out">
            <ArrowRightOnRectangleIcon class="w-5 h-5" />
            Logout
          </button>
        </div>
      </header>

      <!-- Page Content -->
      <div class="flex-1 overflow-auto bg-gray-50 dark:bg-gray-900" :class="{ 'p-8': !isAuthRoute }">
        <RouterView v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </RouterView>
      </div>
    </main>
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
