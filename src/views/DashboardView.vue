<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import '../config/api' // Sets axios.defaults.baseURL
import { format, isBefore, addDays, startOfMonth } from 'date-fns'
import { ExclamationTriangleIcon, CheckCircleIcon, BellIcon } from '@heroicons/vue/24/outline'

const route = useRoute()

const equipments = ref<any[]>([])
const staffs = ref<any[]>([])
const pmRecords = ref<any[]>([])
const loading = ref(true)
const user = ref<any>(JSON.parse(localStorage.getItem('user') || '{}'))

// Assign modal state
const isAssignModalOpen = ref(false)
const selectedEquipment = ref<any>(null)
const assignStaffId = ref('')
const staffSearchQuery = ref('')
const isStaffDropdownOpen = ref(false)

// Month range filter
const filterFrom = ref(format(startOfMonth(new Date()), 'yyyy-MM'))
const filterTo = ref(format(new Date(), 'yyyy-MM'))

const fetchEquipment = async () => {
  try {
    const res = await axios.get('/api/equipment')
    equipments.value = res.data
  } catch (error) {
    console.error('Failed to fetch equipment', error)
  } finally {
    loading.value = false
  }
}

const fetchPmRecords = async () => {
  try {
    const res = await axios.get('/api/pm-record')
    pmRecords.value = res.data
  } catch (error) {
    console.error('Failed to fetch PM records', error)
  }
}

const loadData = () => {
  loading.value = true
  fetchEquipment()
  fetchPmRecords()
  fetchStaffs()
}

onMounted(() => {
  loadData()
})

watch(() => route.path, () => {
  if (route.path === '/') {
    loadData()
  }
})

// Compute completed PMs within selected month range
const getCompletedInRange = computed(() => {
  const from = new Date(filterFrom.value + '-01')
  const toDate = new Date(filterTo.value + '-01')
  toDate.setMonth(toDate.getMonth() + 1)
  return pmRecords.value.filter(record => {
    const d = new Date(record.pmDate)
    return d >= from && d < toDate
  }).length
})

const getAlerts = computed(() => {
  const today = new Date()
  const threshold = addDays(today, 30)
  return equipments.value
    .filter(eq => {
      if (!eq.nextPmDate) return false
      const nextPm = new Date(eq.nextPmDate)
      return isBefore(nextPm, threshold)
    })
    .sort((a, b) => new Date(a.nextPmDate).getTime() - new Date(b.nextPmDate).getTime())
})

const daysUntil = (dateStr: string) => {
  const diff = new Date(dateStr).getTime() - new Date().getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const isAdmin = computed(() => user.value.role === 'ADMIN')

const fetchStaffs = async () => {
  if (!isAdmin.value) return
  try {
    const res = await axios.get('/user')
    staffs.value = res.data
  } catch (error) {
    console.error('Failed to fetch staffs', error)
  }
}

const openAssign = (eq: any) => {
  selectedEquipment.value = eq
  assignStaffId.value = eq.assignedStaffId || ''
  staffSearchQuery.value = ''
  isStaffDropdownOpen.value = false
  isAssignModalOpen.value = true
}

const filteredStaffs = computed(() => {
  const staffList = staffs.value.filter(s => s.role === 'STAFF')
  if (!staffSearchQuery.value) return staffList
  const query = staffSearchQuery.value.toLowerCase()
  return staffList.filter(s =>
    (s.name && s.name.toLowerCase().includes(query)) ||
    (s.username && s.username.toLowerCase().includes(query))
  )
})

const selectStaff = (staffId: string) => {
  assignStaffId.value = staffId
  isStaffDropdownOpen.value = false
}

const saveAssign = async () => {
  try {
    await axios.patch(`/api/equipment/${selectedEquipment.value.id}`, {
      assignedStaffId: assignStaffId.value || null
    })
    isAssignModalOpen.value = false
    staffSearchQuery.value = ''
    await fetchEquipment()
  } catch (error) {
    console.error('Failed to assign staff', error)
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-wrap justify-between items-center gap-4">
      <h2 class="text-2xl font-bold tracking-tight">Dashboard Overview</h2>

      <!-- Month Range Picker -->
      <div class="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-xl shadow-sm">
        <span class="text-sm font-medium text-gray-500">ช่วงเดือน:</span>
        <div class="flex items-center gap-2">
          <input
            v-model="filterFrom"
            type="month"
            class="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500"
          />
          <span class="text-gray-400 text-sm">ถึง</span>
          <input
            v-model="filterTo"
            type="month"
            class="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col justify-between">
        <div class="text-gray-500 dark:text-gray-400 text-sm font-medium">Total Equipment</div>
        <div class="text-3xl font-bold mt-2 text-indigo-600 dark:text-indigo-400">{{ equipments.length }}</div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col justify-between">
        <div class="text-gray-500 dark:text-gray-400 text-sm font-medium">PM Alerts (Due Soon)</div>
        <div class="text-3xl font-bold mt-2 text-red-500">{{ getAlerts.length }}</div>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col justify-between">
        <div class="text-gray-500 dark:text-gray-400 text-sm font-medium">
          PM ที่เสร็จแล้ว ({{ filterFrom }} – {{ filterTo }})
        </div>
        <div class="text-3xl font-bold mt-2 text-emerald-500 flex items-center gap-2">
          <CheckCircleIcon class="w-6 h-6" /> {{ getCompletedInRange }}
        </div>
      </div>
    </div>

    <!-- Staff: My Assigned Equipment Banner -->
    <div v-if="user.role === 'STAFF'" class="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-xl p-5 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <BellIcon class="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        <div>
          <div class="font-semibold text-indigo-800 dark:text-indigo-200">งานที่ได้รับมอบหมาย</div>
          <div class="text-sm text-indigo-600 dark:text-indigo-300">
            คุณมี {{ equipments.filter(e => e.assignedStaffId === user.id).length }} รายการที่รับผิดชอบ
          </div>
        </div>
      </div>
      <router-link to="/my-tasks" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
        ดูงานของฉัน →
      </router-link>
    </div>

    <!-- Upcoming PM Alerts -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
        <h3 class="text-lg font-semibold flex items-center gap-2">
          <ExclamationTriangleIcon class="w-5 h-5 text-amber-500" />
          Upcoming PM Alerts
          <span class="ml-2 text-xs text-gray-400 font-normal">(อุปกรณ์ที่ต้อง PM ภายใน 30 วัน)</span>
        </h3>
      </div>

      <div v-if="loading" class="p-8 text-center text-gray-500">Loading...</div>

      <div v-else-if="getAlerts.length === 0" class="p-8 text-center text-gray-500">
        ไม่มีอุปกรณ์ที่ต้อง PM ในช่วง 30 วันข้างหน้า 🎉
      </div>

      <ul v-else class="divide-y divide-gray-100 dark:divide-gray-700">
        <li
          v-for="eq in getAlerts"
          :key="eq.id"
          class="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div class="flex items-center gap-4">
            <div
              class="w-10 h-10 rounded-full flex items-center justify-center"
              :class="daysUntil(eq.nextPmDate) < 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'"
            >
              <ExclamationTriangleIcon class="w-5 h-5" />
            </div>
            <div>
              <div class="font-medium text-gray-900 dark:text-white">{{ eq.name }} <span class="text-gray-400 font-normal text-sm">({{ eq.serialNumber }})</span></div>
              <div class="text-sm text-gray-500">{{ eq.brand }} {{ eq.model }} · Zone: {{ eq.zoneCode }}</div>
              <div class="text-xs mt-1 flex items-center gap-1">
                <span
                  :class="eq.assignedStaffId ? 'text-emerald-600' : 'text-amber-600'"
                >
                  <span class="w-1.5 h-1.5 rounded-full inline-block mr-1"
                    :class="eq.assignedStaffId ? 'bg-emerald-500' : 'bg-amber-500'"
                  ></span>
                  {{ eq.assignedStaff?.name ? `มอบหมายให้: ${eq.assignedStaff.name}` : 'ยังไม่ได้มอบหมาย' }}
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-3 sm:flex-shrink-0">
            <div class="text-right">
              <div
                class="text-sm font-semibold"
                :class="daysUntil(eq.nextPmDate) < 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'"
              >
                {{ daysUntil(eq.nextPmDate) < 0 ? 'เกินกำหนด' : `อีก ${daysUntil(eq.nextPmDate)} วัน` }}
              </div>
              <div class="text-xs text-gray-500">Due: {{ format(new Date(eq.nextPmDate), 'dd MMM yyyy') }}</div>
            </div>

            <div class="flex items-center gap-2">
              <!-- Show status badge -->
              <span
                v-if="eq.assignedStaffId"
                class="px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 rounded-full text-xs font-medium"
              >
                Assigned
              </span>
              <span
                v-else
                class="px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 rounded-full text-xs font-medium"
              >
                Unassigned
              </span>

              <!-- Admin: Quick Assign button -->
              <button
                v-if="user.role === 'ADMIN'"
                @click="openAssign(eq)"
                class="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                จัดการ
              </button>
            </div>
          </div>
        </li>
      </ul>
    </div>

  </div>

  <!-- Assign Staff Modal -->
  <div v-if="isAssignModalOpen" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-indigo-600 to-purple-600">
        <h3 class="text-lg font-bold text-white">มอบหมายงาน PM</h3>
        <p class="text-sm text-indigo-100">{{ selectedEquipment?.name }}</p>
      </div>

      <div class="flex flex-col max-h-[80vh]">
        <!-- Scrollable Content -->
        <div class="p-6 space-y-5 overflow-y-auto flex-1">
          <!-- Equipment Details Card -->
          <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 space-y-3">
          <h4 class="font-semibold text-gray-800 dark:text-gray-200 text-sm uppercase tracking-wide">รายละเอียดอุปกรณ์</h4>

          <div class="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span class="text-gray-500 dark:text-gray-400">Serial Number:</span>
              <div class="font-medium text-gray-800 dark:text-gray-200">{{ selectedEquipment?.serialNumber || '-' }}</div>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">กลุ่ม:</span>
              <div class="font-medium text-gray-800 dark:text-gray-200">{{ selectedEquipment?.equipmentGroup || '-' }}</div>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">ประเภท:</span>
              <div class="font-medium text-gray-800 dark:text-gray-200">{{ selectedEquipment?.type || '-' }}</div>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">Zone:</span>
              <div class="font-medium text-gray-800 dark:text-gray-200">{{ selectedEquipment?.zoneCode || '-' }}</div>
            </div>
            <div class="col-span-2">
              <span class="text-gray-500 dark:text-gray-400">แบรนด์/รุ่น:</span>
              <div class="font-medium text-gray-800 dark:text-gray-200">{{ selectedEquipment?.brand }} {{ selectedEquipment?.model }}</div>
            </div>
          </div>

          <div class="border-t border-gray-200 dark:border-gray-600 pt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <span class="text-gray-500 dark:text-gray-400">PM ล่าสุด:</span>
              <div class="font-medium text-emerald-600">
                {{ selectedEquipment?.lastPmDate ? format(new Date(selectedEquipment.lastPmDate), 'dd MMM yyyy') : 'ยังไม่มี' }}
              </div>
            </div>
            <div>
              <span class="text-gray-500 dark:text-gray-400">PM ถัดไป:</span>
              <div class="font-medium" :class="daysUntil(selectedEquipment?.nextPmDate) < 0 ? 'text-red-600' : 'text-amber-600'">
                {{ selectedEquipment?.nextPmDate ? format(new Date(selectedEquipment.nextPmDate), 'dd MMM yyyy') : 'N/A' }}
                <span v-if="selectedEquipment?.nextPmDate" class="text-xs">
                  ({{ daysUntil(selectedEquipment?.nextPmDate) < 0 ? 'เกินกำหนด' : `อีก ${daysUntil(selectedEquipment?.nextPmDate)} วัน` }})
                </span>
              </div>
            </div>
          </div>

          <!-- Current Assignment -->
          <div class="border-t border-gray-200 dark:border-gray-600 pt-3">
            <span class="text-gray-500 dark:text-gray-400 text-sm">ผู้รับผิดชอบปัจจุบัน:</span>
            <div class="flex items-center gap-2 mt-1">
              <span v-if="selectedEquipment?.assignedStaff" class="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full text-sm font-medium">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                {{ selectedEquipment.assignedStaff.name || selectedEquipment.assignedStaff.username }}
              </span>
              <span v-else class="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full text-sm">
                <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                ยังไม่ได้มอบหมาย
              </span>
            </div>
          </div>
        </div>

        <!-- Staff Selection -->
        <div class="space-y-3">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            เลือกผู้รับผิดชอบใหม่
            <span class="text-gray-400 font-normal">(พิมพ์ชื่อหรือ Username เพื่อค้นหา)</span>
          </label>

          <!-- Search Input -->
          <div class="relative">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"></path>
              </svg>
            </div>
            <input
              v-model="staffSearchQuery"
              @focus="isStaffDropdownOpen = true"
              type="text"
              placeholder="ค้นหาชื่อหรือ Username..."
              class="w-full border border-gray-300 dark:border-gray-600 rounded-lg pl-10 pr-10 py-2.5 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            <button
              v-if="staffSearchQuery || assignStaffId"
              @click="assignStaffId = ''; staffSearchQuery = ''"
              class="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <!-- Selected Staff Preview -->
          <div v-if="assignStaffId" class="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700 rounded-lg px-4 py-2">
            <div class="flex items-center justify-between">
              <div>
                <div class="font-medium text-indigo-900 dark:text-indigo-200">
                  {{ staffs.find(s => s.id === assignStaffId)?.name || staffs.find(s => s.id === assignStaffId)?.username }}
                </div>
                <div v-if="staffs.find(s => s.id === assignStaffId)?.name" class="text-xs text-indigo-600 dark:text-indigo-400">
                  @{{ staffs.find(s => s.id === assignStaffId)?.username }}
                </div>
              </div>
              <span class="text-xs bg-indigo-600 text-white px-2 py-1 rounded-full font-medium">เลือกแล้ว</span>
            </div>
          </div>

          <!-- Staff List - Compact Table View -->
          <div class="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
            <div class="max-h-56 overflow-y-auto">
              <table class="w-full text-sm">
                <thead class="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th class="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400">ชื่อ</th>
                    <th class="text-left px-3 py-2 font-medium text-gray-600 dark:text-gray-400">Username</th>
                    <th class="text-center px-3 py-2 font-medium text-gray-600 dark:text-gray-400 w-16">สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  <!-- Unassign option -->
                  <tr
                    @click="selectStaff('')"
                    class="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700"
                    :class="{ 'bg-indigo-50 dark:bg-indigo-900/20': !assignStaffId }"
                  >
                    <td colspan="2" class="px-3 py-2 text-gray-500 italic">
                      — ยังไม่มอบหมาย (Unassign) —
                    </td>
                    <td class="px-3 py-2 text-center">
                      <span v-if="!assignStaffId" class="text-indigo-600 font-bold">✓</span>
                    </td>
                  </tr>

                  <!-- Staff Items -->
                  <tr
                    v-for="s in filteredStaffs"
                    :key="s.id"
                    @click="selectStaff(s.id)"
                    class="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-0"
                    :class="{ 'bg-indigo-50 dark:bg-indigo-900/20': assignStaffId === s.id }"
                  >
                    <td class="px-3 py-2 font-medium text-gray-900 dark:text-gray-200">{{ s.name || s.username }}</td>
                    <td class="px-3 py-2 text-gray-500">{{ s.username }}</td>
                    <td class="px-3 py-2 text-center">
                      <span v-if="assignStaffId === s.id" class="text-indigo-600 font-bold">✓</span>
                    </td>
                  </tr>

                  <tr v-if="filteredStaffs.length === 0">
                    <td colspan="3" class="px-4 py-4 text-center text-gray-400">
                      ไม่พบผู้ใช้ที่ตรงกับ "{{ staffSearchQuery }}"
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Click outside to close dropdown -->
          <div
            v-if="isStaffDropdownOpen"
            @click="isStaffDropdownOpen = false"
            class="fixed inset-0 z-40"
          ></div>
        </div>

        <!-- Sticky Footer Actions -->
        <div class="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
          <button @click="isAssignModalOpen = false" class="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors">ยกเลิก</button>
          <button @click="saveAssign" class="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm">
            บันทึก
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
