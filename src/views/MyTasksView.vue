<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import '../config/api' // Sets axios.defaults.baseURL
import { format, startOfMonth, endOfMonth, parseISO, isWithinInterval } from 'date-fns'
import { WrenchScrewdriverIcon, ClipboardDocumentCheckIcon, ClockIcon } from '@heroicons/vue/24/outline'

const route = useRoute()

const equipments = ref<any[]>([])
const pmRecords = ref<any[]>([])
const loading = ref(true)
const user = ref<any>(JSON.parse(localStorage.getItem('user') || '{}'))
const isPmModalOpen = ref(false)
const selectedEquipment = ref<any>(null)
const pmForm = ref({ pmDate: format(new Date(), 'yyyy-MM-dd'), details: '', cost: undefined as number | undefined })

// Date range filter for completed tasks
const filterFrom = ref(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
const filterTo = ref(format(endOfMonth(new Date()), 'yyyy-MM-dd'))

const fetchMyEquipment = async () => {
  try {
    const res = await axios.get('/api/equipment')
    // Filter only assigned to me
    equipments.value = res.data.filter((e: any) => e.assignedStaffId === user.value.id)
  } catch (error) {
    console.error(error)
  }
}

const fetchMyPmRecords = async () => {
  try {
    const res = await axios.get('/api/pm-record')
    // Filter only my records
    pmRecords.value = res.data.filter((r: any) => r.staffId === user.value.id)
  } catch (error) {
    console.error(error)
  }
}

onMounted(() => {
  fetchMyEquipment()
  fetchMyPmRecords()
  loading.value = false
})

watch(() => route.path, () => {
  if (route.path === '/my-tasks') {
    loading.value = true
    fetchMyEquipment()
    fetchMyPmRecords()
    loading.value = false
  }
})

const openPm = (eq: any) => {
  selectedEquipment.value = eq
  pmForm.value = { pmDate: format(new Date(), 'yyyy-MM-dd'), details: '', cost: undefined }
  isPmModalOpen.value = true
}

const recordPm = async () => {
  try {
    await axios.post('/api/pm-record', {
      equipmentId: selectedEquipment.value.id,
      pmDate: pmForm.value.pmDate,
      details: pmForm.value.details,
      staffId: user.value.id
      // cost will be auto-calculated by backend
    })
    isPmModalOpen.value = false
    // Refresh both equipment and PM records
    await fetchMyEquipment()
    await fetchMyPmRecords()
  } catch (error) {
    console.error('Failed to record PM', error)
  }
}

// Check if equipment was recently PM'd (within current cycle)
const isRecentlyCompleted = (equipment: any) => {
  if (!equipment.lastPmDate) return false
  const lastPm = new Date(equipment.lastPmDate)
  const nextPm = equipment.nextPmDate ? new Date(equipment.nextPmDate) : null
  const today = new Date()
  
  // If last PM is within 7 days and next PM is in the future, consider it completed for this cycle
  const daysSinceLastPm = Math.floor((today.getTime() - lastPm.getTime()) / (1000 * 60 * 60 * 24))
  return daysSinceLastPm <= 7 && nextPm && nextPm > today
}

// Filtered completed tasks based on date range
const filteredCompletedTasks = computed(() => {
  const from = parseISO(filterFrom.value)
  const to = parseISO(filterTo.value)
  
  return pmRecords.value
    .filter(record => {
      const pmDate = parseISO(record.pmDate)
      return isWithinInterval(pmDate, { start: from, end: to })
    })
    .sort((a, b) => new Date(b.pmDate).getTime() - new Date(a.pmDate).getTime())
})

const overdueCount = computed(() =>
  equipments.value.filter(e => e.nextPmDate && new Date(e.nextPmDate) < new Date()).length
)

const completedCount = computed(() => pmRecords.value.length)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap justify-between items-center gap-4">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">งานของฉัน</h2>
        <p class="text-gray-500 text-sm mt-1">อุปกรณ์ที่ได้รับมอบหมายให้รับผิดชอบ</p>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
          <ClipboardDocumentCheckIcon class="w-6 h-6" />
        </div>
        <div>
          <div class="text-sm text-gray-500">อุปกรณ์ในความรับผิดชอบ</div>
          <div class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{{ equipments.length }}</div>
        </div>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-500">
          <WrenchScrewdriverIcon class="w-6 h-6" />
        </div>
        <div>
          <div class="text-sm text-gray-500">เกินกำหนด PM</div>
          <div class="text-2xl font-bold text-red-500">{{ overdueCount }}</div>
        </div>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 flex items-center gap-4">
        <div class="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-500">
          <ClockIcon class="w-6 h-6" />
        </div>
        <div>
          <div class="text-sm text-gray-500">PM ที่เสร็จสิ้น (ทั้งหมด)</div>
          <div class="text-2xl font-bold text-emerald-500">{{ completedCount }}</div>
        </div>
      </div>
    </div>

    <!-- Equipment Table -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-medium">
            <tr>
              <th class="px-6 py-4">อุปกรณ์</th>
              <th class="px-6 py-4">กลุ่ม / Zone</th>
              <th class="px-6 py-4">Last PM</th>
              <th class="px-6 py-4">Next PM</th>
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr v-if="loading" class="animate-pulse">
              <td colspan="5" class="px-6 py-8 text-center text-gray-500">กำลังโหลด...</td>
            </tr>
            <tr v-else-if="equipments.length === 0">
              <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                ยังไม่มีอุปกรณ์ที่ได้รับมอบหมาย กรุณาติดต่อ Admin
              </td>
            </tr>
            <tr
              v-for="eq in equipments"
              :key="eq.id"
              :class="[
                'transition-colors',
                isRecentlyCompleted(eq) ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
              ]"
            >
              <td class="px-6 py-4">
                <div class="font-medium text-gray-900 dark:text-gray-100">{{ eq.name }}</div>
                <div class="text-gray-500 text-xs">{{ eq.serialNumber }}</div>
              </td>
              <td class="px-6 py-4">
                <span class="px-2.5 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-full text-xs font-medium">
                  {{ eq.equipmentGroup }}
                </span>
                <div class="text-xs text-gray-400 mt-1">{{ eq.zoneCode }}</div>
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
              </td>
              <td class="px-6 py-4 text-right">
                <button
                  v-if="!isRecentlyCompleted(eq)"
                  @click="openPm(eq)"
                  class="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 px-3 py-1.5 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-medium border border-emerald-200 dark:border-emerald-700"
                >
                  <WrenchScrewdriverIcon class="w-4 h-4" />
                  Record PM
                </button>
                <span
                  v-else
                  class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                >
                  <ClipboardDocumentCheckIcon class="w-4 h-4" />
                  บันทึก PM แล้ว
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Completed Tasks Section -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
        <div class="flex flex-wrap justify-between items-center gap-4">
          <h3 class="text-lg font-semibold flex items-center gap-2">
            <ClipboardDocumentCheckIcon class="w-5 h-5 text-emerald-500" />
            งาน PM ที่เสร็จสิ้น
            <span class="text-sm font-normal text-gray-500">({{ filteredCompletedTasks.length }} รายการ)</span>
          </h3>
          
          <!-- Date Filter -->
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-500">ช่วงเวลา:</span>
            <input
              v-model="filterFrom"
              type="date"
              class="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm bg-white dark:bg-gray-700"
            />
            <span class="text-gray-400">-</span>
            <input
              v-model="filterTo"
              type="date"
              class="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-sm bg-white dark:bg-gray-700"
            />
          </div>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-medium">
            <tr>
              <th class="px-6 py-4">วันที่ PM</th>
              <th class="px-6 py-4">อุปกรณ์</th>
              <th class="px-6 py-4">กลุ่ม / Zone</th>
              <th class="px-6 py-4">รายละเอียด</th>
              <th class="px-6 py-4 text-right">ค่าใช้จ่าย</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr v-if="filteredCompletedTasks.length === 0">
              <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                ไม่พบงาน PM ในช่วงเวลาที่เลือก
              </td>
            </tr>
            <tr
              v-for="record in filteredCompletedTasks"
              :key="record.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <td class="px-6 py-4">
                <div class="font-medium text-gray-900 dark:text-gray-100">
                  {{ format(new Date(record.pmDate), 'dd MMM yyyy') }}
                </div>
                <div class="text-xs text-gray-500">
                  {{ format(new Date(record.pmDate), 'HH:mm') }}
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="font-medium text-gray-900 dark:text-gray-100">{{ record.equipment?.name }}</div>
                <div class="text-gray-500 text-xs">{{ record.equipment?.serialNumber }}</div>
              </td>
              <td class="px-6 py-4">
                <span class="px-2.5 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-full text-xs font-medium">
                  {{ record.equipment?.equipmentGroup }}
                </span>
                <div class="text-xs text-gray-400 mt-1">{{ record.equipment?.zoneCode }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="text-sm text-gray-700 dark:text-gray-300 max-w-xs truncate" :title="record.details">
                  {{ record.details || '-' }}
                </div>
              </td>
              <td class="px-6 py-4 text-right font-medium text-emerald-600">
                {{ Number(record.cost || 0).toLocaleString() }} บาท
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- PM Modal -->
    <div v-if="isPmModalOpen" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 class="text-lg font-bold">Record PM Task</h3>
          <p class="text-sm text-gray-500">{{ selectedEquipment?.name }} ({{ selectedEquipment?.serialNumber }})</p>
        </div>
        <form @submit.prevent="recordPm" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">PM Date</label>
            <input v-model="pmForm.pmDate" type="date" required class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Log / Details</label>
            <textarea v-model="pmForm.details" rows="4" placeholder="บันทึกการทำงาน PM..." required class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700"></textarea>
          </div>
          <div class="pt-2 flex justify-end gap-3">
            <button type="button" @click="isPmModalOpen = false" class="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
            <button type="submit" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">Submit PM</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
