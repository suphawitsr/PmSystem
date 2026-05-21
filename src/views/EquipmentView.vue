<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import axios from 'axios'
import '../config/api' // Sets axios.defaults.baseURL
import { format } from 'date-fns'
import { PlusIcon, PencilSquareIcon, TrashIcon, UserPlusIcon } from '@heroicons/vue/24/outline'

const equipments = ref<any[]>([])
const staffs = ref<any[]>([])
const loading = ref(true)
const user = ref<any>(JSON.parse(localStorage.getItem('user') || '{}'))
const searchQuery = ref('')

const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
const isAssignModalOpen = ref(false)
const selectedEquipment = ref<any>(null)
const assignStaffId = ref('')
const staffSearchQuery = ref('')
const isStaffDropdownOpen = ref(false)

const newEquipment = ref({
  equipmentGroup: 'COMPUTER',
  type: '',
  serialNumber: '',
  brand: '',
  model: '',
  name: '',
  zoneCode: '',
  assignedStaffId: ''
})

const editForm = ref<any>({})

const isAdmin = computed(() => user.value.role === 'ADMIN')

// Pagination
const currentPage = ref(1)
const itemsPerPage = 10

const totalPages = computed(() => Math.ceil(filteredEquipments.value.length / itemsPerPage))

const paginatedEquipments = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredEquipments.value.slice(start, end)
})

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

const visiblePages = computed(() => {
  const pages: number[] = []
  const maxVisible = 5
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages.value, start + maxVisible - 1)
  
  if (end - start + 1 < maxVisible) {
    start = Math.max(1, end - maxVisible + 1)
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})

// Assignment filter
const assignmentFilter = ref<'all' | 'assigned' | 'unassigned'>('all')

// Group and Zone filters
const groupFilter = ref<'all' | 'COMPUTER' | 'PRINTER' | 'NETWORK'>('all')
const zoneFilter = ref<string>('all')

// Get unique zones from equipment data
const availableZones = computed(() => {
  const zones = new Set<string>()
  equipments.value.forEach(e => {
    if (e.zoneCode) zones.add(e.zoneCode)
  })
  return Array.from(zones).sort()
})

const filteredEquipments = computed(() => {
  let filtered = equipments.value.filter(e =>
    !searchQuery.value ||
    e.name?.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    e.serialNumber?.toLowerCase().includes(searchQuery.value.toLowerCase())
  )
  
  // Apply assignment filter
  if (assignmentFilter.value === 'assigned') {
    filtered = filtered.filter(e => e.assignedStaffId)
  } else if (assignmentFilter.value === 'unassigned') {
    filtered = filtered.filter(e => !e.assignedStaffId)
  }
  
  // Apply group filter
  if (groupFilter.value !== 'all') {
    filtered = filtered.filter(e => e.equipmentGroup === groupFilter.value)
  }
  
  // Apply zone filter
  if (zoneFilter.value !== 'all') {
    filtered = filtered.filter(e => e.zoneCode === zoneFilter.value)
  }
  
  return filtered
})

watch([searchQuery, assignmentFilter, groupFilter, zoneFilter], () => {
  currentPage.value = 1
})

const assignedCount = computed(() => equipments.value.filter(e => e.assignedStaffId).length)
const unassignedCount = computed(() => equipments.value.filter(e => !e.assignedStaffId).length)

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

const fetchStaffs = async () => {
  if (!isAdmin.value) return
  try {
    const res = await axios.get('/user')
    staffs.value = res.data
  } catch (error) {
    console.error('Failed to fetch staffs', error)
  }
}

onMounted(() => {
  fetchEquipment()
  fetchStaffs()
})


const addEquipment = async () => {
  try {
    await axios.post('/api/equipment', newEquipment.value)
    isAddModalOpen.value = false
    newEquipment.value = { equipmentGroup: 'COMPUTER', type: '', serialNumber: '', brand: '', model: '', name: '', zoneCode: '', assignedStaffId: '' }
    fetchEquipment()
  } catch (error) {
    console.error('Failed to add equipment', error)
  }
}

const openEdit = (eq: any) => {
  editForm.value = { ...eq, assignedStaffId: eq.assignedStaffId || '' }
  isEditModalOpen.value = true
}

const saveEdit = async () => {
  try {
    const { id, assignedStaff, createdAt, lastPmDate, nextPmDate, ...payload } = editForm.value
    await axios.patch(`/api/equipment/${id}`, payload)
    isEditModalOpen.value = false
    fetchEquipment()
  } catch (error) {
    console.error('Failed to update equipment', error)
  }
}

const deleteEquipment = async (id: string) => {
  if (!confirm('ต้องการลบอุปกรณ์นี้ใช่ไหม?')) return
  try {
    await axios.delete(`/api/equipment/${id}`)
    fetchEquipment()
  } catch (error) {
    console.error('Failed to delete equipment', error)
    alert('ไม่สามารถลบได้ (อาจมีประวัติ PM ที่เชื่อมอยู่)')
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

const selectedStaffName = computed(() => {
  if (!assignStaffId.value) return ''
  const staff = staffs.value.find(s => s.id === assignStaffId.value)
  return staff ? (staff.name || staff.username) : ''
})

const saveAssign = async () => {
  try {
    await axios.patch(`/api/equipment/${selectedEquipment.value.id}`, {
      assignedStaffId: assignStaffId.value || null
    })
    isAssignModalOpen.value = false
    staffSearchQuery.value = ''
    fetchEquipment()
  } catch (error) {
    console.error('Failed to assign staff', error)
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap justify-between items-center gap-4">
      <h2 class="text-2xl font-bold tracking-tight">Equipment Management</h2>
      <div class="flex items-center gap-3">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="ค้นหาชื่อ / Serial No."
          class="pl-4 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-indigo-500 w-52"
        />
        <select
          v-model="groupFilter"
          class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">ทุกกลุ่ม</option>
          <option value="COMPUTER">Computer</option>
          <option value="PRINTER">Printer</option>
          <option value="NETWORK">Network</option>
        </select>
        <select
          v-model="zoneFilter"
          class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-indigo-500"
        >
          <option value="all">ทุกโซน</option>
          <option v-for="zone in availableZones" :key="zone" :value="zone">{{ zone }}</option>
        </select>
        <button
          v-if="isAdmin"
          @click="isAddModalOpen = true"
          class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
        >
          <PlusIcon class="w-5 h-5" />
          Add Equipment
        </button>
      </div>
    </div>

    <!-- Staff notice -->
    <div v-if="!isAdmin" class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-700 dark:text-blue-300">
      💡 ดูข้อมูลอุปกรณ์ทั้งหมดในระบบ — สำหรับการ Record PM ไปที่หน้า <router-link to="/my-tasks" class="underline font-medium">งานของฉัน</router-link>
    </div>

    <!-- Assignment Filter Tabs -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-2">
      <div class="flex gap-2">
        <button
          @click="assignmentFilter = 'all'"
          :class="[
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
            assignmentFilter === 'all'
              ? 'bg-indigo-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          ]"
        >
          <span>ทั้งหมด</span>
          <span class="bg-white/20 px-2 py-0.5 rounded-full text-xs">{{ equipments.length }}</span>
        </button>
        <button
          @click="assignmentFilter = 'assigned'"
          :class="[
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
            assignmentFilter === 'assigned'
              ? 'bg-emerald-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          ]"
        >
          <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Assigned</span>
          <span class="bg-white/20 px-2 py-0.5 rounded-full text-xs">{{ assignedCount }}</span>
        </button>
        <button
          @click="assignmentFilter = 'unassigned'"
          :class="[
            'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
            assignmentFilter === 'unassigned'
              ? 'bg-amber-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          ]"
        >
          <span class="w-2 h-2 rounded-full bg-amber-500"></span>
          <span>Unassigned</span>
          <span class="bg-white/20 px-2 py-0.5 rounded-full text-xs">{{ unassignedCount }}</span>
        </button>
      </div>
    </div>

    <!-- Equipment Table -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-medium">
            <tr>
              <th class="px-6 py-4">ชื่อ / SN</th>
              <th class="px-6 py-4">กลุ่ม</th>
              <th class="px-6 py-4">Brand / Model</th>
              <th class="px-6 py-4">Zone</th>
              <th class="px-6 py-4">สถานะ</th>
              <th class="px-6 py-4">Last PM</th>
              <th class="px-6 py-4">Next PM</th>
              <th v-if="isAdmin" class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr v-if="loading" class="animate-pulse">
              <td colspan="7" class="px-6 py-8 text-center text-gray-500">กำลังโหลดข้อมูล...</td>
            </tr>
            <tr v-else-if="filteredEquipments.length === 0">
              <td colspan="7" class="px-6 py-8 text-center text-gray-500">ไม่พบอุปกรณ์</td>
            </tr>
            <tr
              v-for="eq in paginatedEquipments"
              :key="eq.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <td class="px-6 py-4">
                <div class="font-medium text-gray-900 dark:text-gray-100">{{ eq.name }}</div>
                <div class="text-gray-500 text-xs">{{ eq.serialNumber }}</div>
              </td>
              <td class="px-6 py-4">
                <span class="px-2.5 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-full text-xs font-medium">
                  {{ eq.equipmentGroup }}
                </span>
              </td>
              <td class="px-6 py-4 text-gray-700 dark:text-gray-300">{{ eq.brand }} {{ eq.model }}</td>
              <td class="px-6 py-4 text-gray-700 dark:text-gray-300">{{ eq.zoneCode }}</td>
              <td class="px-6 py-4">
                <div v-if="eq.assignedStaffId" class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <div>
                    <span class="px-2 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 rounded-full text-xs font-medium">
                      Assigned
                    </span>
                    <div class="text-xs text-gray-500 mt-1">{{ eq.assignedStaff?.name || eq.assignedStaff?.username || 'Staff' }}</div>
                  </div>
                </div>
                <div v-else class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full bg-amber-500"></span>
                  <span class="px-2 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 rounded-full text-xs font-medium">
                    Unassigned
                  </span>
                </div>
              </td>
              <td class="px-6 py-4 text-gray-500">
                {{ eq.lastPmDate ? format(new Date(eq.lastPmDate), 'dd MMM yyyy') : 'N/A' }}
              </td>
              <td
                class="px-6 py-4 font-medium"
                :class="eq.nextPmDate && new Date(eq.nextPmDate) < new Date() ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'"
              >
                {{ eq.nextPmDate ? format(new Date(eq.nextPmDate), 'dd MMM yyyy') : 'N/A' }}
                <span v-if="eq.nextPmDate && new Date(eq.nextPmDate) < new Date()" class="ml-1 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">เกินกำหนด</span>
                <span v-else-if="!eq.assignedStaffId" class="ml-1 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">รอมอบหมาย</span>
              </td>
              <!-- Admin actions only -->
              <td v-if="isAdmin" class="px-6 py-4 text-right space-x-1">
                <button
                  @click="openAssign(eq)"
                  class="text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 p-2 rounded-lg transition-colors inline-flex items-center gap-1"
                  title="Assign Staff"
                >
                  <UserPlusIcon class="w-4 h-4" />
                  <span class="text-xs font-medium">Assign</span>
                </button>
                <button
                  @click="openEdit(eq)"
                  class="text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 p-2 rounded-lg transition-colors inline-flex items-center gap-1"
                  title="Edit Equipment"
                >
                  <PencilSquareIcon class="w-4 h-4" />
                </button>
                <button
                  @click="deleteEquipment(eq.id)"
                  class="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg transition-colors inline-flex items-center gap-1"
                  title="Delete Equipment"
                >
                  <TrashIcon class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div class="text-sm text-gray-500">
          แสดง {{ (currentPage - 1) * itemsPerPage + 1 }} - {{ Math.min(currentPage * itemsPerPage, filteredEquipments.length) }} จาก {{ filteredEquipments.length }} รายการ
        </div>
        <div class="flex items-center gap-1">
          <button
            @click="goToPage(currentPage - 1)"
            :disabled="currentPage === 1"
            class="px-3 py-1 rounded-lg text-sm font-medium transition-colors"
            :class="currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'"
          >
            ←
          </button>
          
          <button
            v-if="visiblePages[0] > 1"
            @click="goToPage(1)"
            class="px-3 py-1 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            1
          </button>
          <span v-if="visiblePages[0] > 2" class="px-2 text-gray-400">...</span>
          
          <button
            v-for="page in visiblePages"
            :key="page"
            @click="goToPage(page)"
            class="px-3 py-1 rounded-lg text-sm font-medium transition-colors"
            :class="currentPage === page 
              ? 'bg-indigo-600 text-white' 
              : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'"
          >
            {{ page }}
          </button>
          
          <span v-if="visiblePages[visiblePages.length - 1] < totalPages - 1" class="px-2 text-gray-400">...</span>
          <button
            v-if="visiblePages[visiblePages.length - 1] < totalPages"
            @click="goToPage(totalPages)"
            class="px-3 py-1 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            {{ totalPages }}
          </button>
          
          <button
            @click="goToPage(currentPage + 1)"
            :disabled="currentPage === totalPages"
            class="px-3 py-1 rounded-lg text-sm font-medium transition-colors"
            :class="currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'"
          >
            →
          </button>
        </div>
      </div>
    </div>

    <!-- Add Equipment Modal -->
    <div v-if="isAddModalOpen" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 class="text-lg font-bold">Add New Equipment</h3>
        </div>
        <form @submit.prevent="addEquipment" class="p-6 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group</label>
              <select v-model="newEquipment.equipmentGroup" class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700">
                <option value="COMPUTER">Computer</option>
                <option value="PRINTER">Printer</option>
                <option value="NETWORK">Network</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <input v-model="newEquipment.type" type="text" placeholder="e.g. LASER, DOTMATRIX" class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Serial Number</label>
              <input v-model="newEquipment.serialNumber" type="text" required class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Brand</label>
              <input v-model="newEquipment.brand" type="text" required class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Model</label>
              <input v-model="newEquipment.model" type="text" required class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Zone Code</label>
              <input v-model="newEquipment.zoneCode" type="text" required class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700" />
            </div>
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Equipment Name</label>
              <input v-model="newEquipment.name" type="text" required class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700" />
            </div>
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign to Staff (Optional)</label>
              <select v-model="newEquipment.assignedStaffId" class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700">
                <option value="">Unassigned</option>
                <option v-for="s in staffs.filter(s => s.role === 'STAFF')" :key="s.id" :value="s.id">{{ s.name }} ({{ s.username }})</option>
              </select>
            </div>
          </div>
          <div class="pt-4 flex justify-end gap-3">
            <button type="button" @click="isAddModalOpen = false" class="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
            <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">Save Equipment</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Equipment Modal -->
    <div v-if="isEditModalOpen" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 class="text-lg font-bold">Edit Equipment</h3>
        </div>
        <form @submit.prevent="saveEdit" class="p-6 space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Group</label>
              <select v-model="editForm.equipmentGroup" class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700">
                <option value="COMPUTER">Computer</option>
                <option value="PRINTER">Printer</option>
                <option value="NETWORK">Network</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <input v-model="editForm.type" type="text" class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Serial Number</label>
              <input v-model="editForm.serialNumber" type="text" required class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Brand</label>
              <input v-model="editForm.brand" type="text" class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Model</label>
              <input v-model="editForm.model" type="text" class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Zone Code</label>
              <input v-model="editForm.zoneCode" type="text" class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700" />
            </div>
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Equipment Name</label>
              <input v-model="editForm.name" type="text" required class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700" />
            </div>
            <div class="col-span-2">
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assign to Staff</label>
              <select v-model="editForm.assignedStaffId" class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700">
                <option value="">Unassigned</option>
                <option v-for="s in staffs.filter(s => s.role === 'STAFF')" :key="s.id" :value="s.id">{{ s.name }} ({{ s.username }})</option>
              </select>
            </div>
          </div>
          <div class="pt-4 flex justify-end gap-3">
            <button type="button" @click="isEditModalOpen = false" class="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
            <button type="submit" class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">Save Changes</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Assign Staff Modal -->
    <div v-if="isAssignModalOpen" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 class="text-lg font-bold">Assign Staff</h3>
          <p class="text-sm text-gray-500">{{ selectedEquipment?.name }} ({{ selectedEquipment?.serialNumber }})</p>
        </div>
        <div class="p-6 space-y-4">
          <div class="relative">
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Staff</label>
            <div class="relative">
              <input
                v-model="staffSearchQuery"
                @focus="isStaffDropdownOpen = true"
                type="text"
                :placeholder="selectedStaffName || 'พิมพ์ชื่อหรือ Username เพื่อค้นหา...'
"
                class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 pr-10"
              />
              <button
                v-if="assignStaffId"
                @click="assignStaffId = ''; staffSearchQuery = ''"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            <div
              v-if="isStaffDropdownOpen"
              class="absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto"
            >
              <div
                @click="selectStaff(''); isStaffDropdownOpen = false"
                class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-gray-500"
              >
                Unassigned
              </div>
              <div
                v-for="s in filteredStaffs"
                :key="s.id"
                @click="selectStaff(s.id)"
                class="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer"
                :class="{ 'bg-indigo-50 dark:bg-indigo-900/30': assignStaffId === s.id }"
              >
                <div class="font-medium">{{ s.name || s.username }}</div>
                <div v-if="s.name && s.username" class="text-xs text-gray-500">{{ s.username }}</div>
              </div>
              <div v-if="filteredStaffs.length === 0" class="px-3 py-2 text-gray-400 text-sm">
                ไม่พบผู้ใช้
              </div>
            </div>
            <div
              v-if="isStaffDropdownOpen"
              @click="isStaffDropdownOpen = false"
              class="fixed inset-0 z-40"
            ></div>
          </div>
          <div class="flex justify-end gap-3">
            <button @click="isAssignModalOpen = false" class="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
            <button @click="saveAssign" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">Save Assignment</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
