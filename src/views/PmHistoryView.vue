<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import '../config/api' // Sets axios.defaults.baseURL
import { format } from 'date-fns'
import * as XLSX from 'xlsx'
import { DocumentArrowDownIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/vue/24/outline'

const pmRecords = ref<any[]>([])
const loading = ref(true)

// Filters
const filterDateFrom = ref('')
const filterDateTo = ref('')
const filterSearch = ref('')

// Detail modal
const isDetailOpen = ref(false)
const selectedRecord = ref<any>(null)

const fetchPmRecords = async () => {
  try {
    const res = await axios.get('/api/pm-record')
    pmRecords.value = res.data
  } catch (error) {
    console.error('Failed to fetch PM records', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchPmRecords()
})

const filteredRecords = computed(() => {
  return pmRecords.value.filter(record => {
    const date = new Date(record.pmDate)
    const from = filterDateFrom.value ? new Date(filterDateFrom.value) : null
    const to = filterDateTo.value ? new Date(filterDateTo.value) : null
    const matchFrom = from ? date >= from : true
    const matchTo = to ? date <= to : true
    const matchSearch = filterSearch.value
      ? record.equipment?.name?.toLowerCase().includes(filterSearch.value.toLowerCase()) ||
        record.equipment?.serialNumber?.toLowerCase().includes(filterSearch.value.toLowerCase())
      : true
    return matchFrom && matchTo && matchSearch
  })
})

const totalExpense = computed(() => {
  return filteredRecords.value.reduce((sum, record) => sum + Number(record.cost || 0), 0)
})

const openDetail = (record: any) => {
  selectedRecord.value = record
  isDetailOpen.value = true
}

const exportExcel = () => {
  const fromLabel = filterDateFrom.value ? format(new Date(filterDateFrom.value), 'dd/MM/yyyy') : 'ทั้งหมด'
  const toLabel = filterDateTo.value ? format(new Date(filterDateTo.value), 'dd/MM/yyyy') : 'ทั้งหมด'

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.aoa_to_sheet([])

  // Check if filtering by a specific equipment (single equipment in results)
  const uniqueEquipments = [...new Set(filteredRecords.value.map(r => r.equipment?.id))]
  const isSingleEquipment = uniqueEquipments.length === 1 && uniqueEquipments[0] !== undefined
  const equipment = isSingleEquipment ? filteredRecords.value[0]?.equipment : null
  const equipmentName = equipment?.name || ''

  // Report header rows
  XLSX.utils.sheet_add_aoa(worksheet, [
    [`รายงานประวัติการ PM ของอุปกรณ์ ${equipmentName}`],
    [`ตั้งแต่: ${fromLabel}   ถึง: ${toLabel}`],
    [],
    ['ลำดับ', 'วันที่ PM', 'อุปกรณ์', 'Serial No.', 'กลุ่ม', 'Zone', 'ผู้ดำเนินการ', 'ค่าใช้จ่าย (บาท)', 'รายละเอียด'],
  ])

  // Data rows
  const dataRows = filteredRecords.value.map((r, index) => [
    index + 1,
    format(new Date(r.pmDate), 'dd/MM/yyyy'),
    r.equipment?.name || '-',
    r.equipment?.serialNumber || '-',
    r.equipment?.equipmentGroup || '-',
    r.equipment?.zoneCode || '-',
    r.staff ? (r.staff.name || r.staff.username) : 'N/A',
    Number(r.cost || 0),
    r.details || '-',
  ])

  XLSX.utils.sheet_add_aoa(worksheet, dataRows, { origin: 'A5' })

  // Total row
  const totalRowIndex = 4 + dataRows.length + 1
  XLSX.utils.sheet_add_aoa(worksheet, [
    [],
    ['', '', '', '', '', '', 'รวมค่าใช้จ่าย', filteredRecords.value.reduce((s, r) => s + Number(r.cost || 0), 0), ''],
  ], { origin: { r: totalRowIndex, c: 0 } })

  // Column widths
  worksheet['!cols'] = [
    { wch: 6 }, { wch: 14 }, { wch: 24 }, { wch: 18 }, { wch: 10 },
    { wch: 10 }, { wch: 20 }, { wch: 18 }, { wch: 40 },
  ]

  XLSX.utils.book_append_sheet(workbook, worksheet, 'PM Report')
  const filename = `รายงาน_PM_${fromLabel.replace(/\//g, '-')}_ถึง_${toLabel.replace(/\//g, '-')}.xlsx`
  XLSX.writeFile(workbook, filename)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap justify-between items-center gap-4">
      <h2 class="text-2xl font-bold tracking-tight">PM History & Reports</h2>
      <button @click="exportExcel" class="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2">
        <DocumentArrowDownIcon class="w-5 h-5" />
        Export to Excel
      </button>
    </div>

    <!-- Filters -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-wrap items-end gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ค้นหาอุปกรณ์</label>
        <div class="relative">
          <MagnifyingGlassIcon class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input v-model="filterSearch" type="text" placeholder="ชื่อ / Serial No." class="border border-gray-300 dark:border-gray-600 rounded-lg pl-9 pr-4 py-2 bg-white dark:bg-gray-700 w-52 text-sm" />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ตั้งแต่วันที่</label>
        <input v-model="filterDateFrom" type="date" class="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-sm" />
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ถึงวันที่</label>
        <input v-model="filterDateTo" type="date" class="border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 bg-white dark:bg-gray-700 text-sm" />
      </div>

      <button
        @click="filterDateFrom = ''; filterDateTo = ''; filterSearch = ''"
        class="text-sm text-gray-500 hover:text-red-500 transition-colors px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
      >
        ล้างค่า
      </button>

      <div class="ml-auto bg-indigo-50 dark:bg-indigo-900/30 px-6 py-2 rounded-lg border border-indigo-100 dark:border-indigo-800">
        <div class="text-sm text-indigo-600 dark:text-indigo-400 font-medium">รวมค่าใช้จ่าย</div>
        <div class="text-xl font-bold text-indigo-700 dark:text-indigo-300">{{ totalExpense.toLocaleString() }} THB</div>
      </div>
    </div>

    <!-- PM History Table -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-medium">
            <tr>
              <th class="px-6 py-4">ลำดับ</th>
              <th class="px-6 py-4">วันที่ PM</th>
              <th class="px-6 py-4">อุปกรณ์</th>
              <th class="px-6 py-4">กลุ่ม / Zone</th>
              <th class="px-6 py-4">ผู้ดำเนินการ</th>
              <th class="px-6 py-4">Log / Detail</th>
              <th class="px-6 py-4 text-right">ค่าใช้จ่าย (บาท)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr v-if="loading" class="animate-pulse">
              <td colspan="7" class="px-6 py-8 text-center text-gray-500">กำลังโหลด...</td>
            </tr>
            <tr v-else-if="filteredRecords.length === 0">
              <td colspan="7" class="px-6 py-8 text-center text-gray-500">ไม่พบประวัติ PM ที่ตรงกับเงื่อนไข</td>
            </tr>
            <tr
              v-for="(record, index) in filteredRecords"
              :key="record.id"
              class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <td class="px-6 py-4 text-gray-500">{{ index + 1 }}</td>
              <td class="px-6 py-4 font-medium">{{ format(new Date(record.pmDate), 'dd MMM yyyy') }}</td>
              <td class="px-6 py-4">
                <div class="font-medium text-gray-900 dark:text-gray-100">{{ record.equipment?.name }}</div>
                <div class="text-gray-500 text-xs">{{ record.equipment?.serialNumber }}</div>
              </td>
              <td class="px-6 py-4">
                <span class="px-2 py-0.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-full text-xs font-medium">
                  {{ record.equipment?.equipmentGroup }}
                </span>
                <div class="text-xs text-gray-400 mt-1">{{ record.equipment?.zoneCode }}</div>
              </td>
              <td class="px-6 py-4">
                <div class="font-medium text-gray-800 dark:text-gray-200">
                  {{ record.staff ? (record.staff.name || record.staff.username) : 'N/A' }}
                </div>
              </td>
              <td class="px-6 py-4">
                <button
                  @click="openDetail(record)"
                  class="inline-flex items-center gap-2 bg-indigo-500/80 hover:bg-indigo-600/80 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
                >
                  ดูรายละเอียด
                </button>
              </td>
              <td class="px-6 py-4 text-right font-medium text-red-500">{{ Number(record.cost).toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Detail Modal -->
    <div v-if="isDetailOpen" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
        <!-- Header with Equipment Info -->
        <div class="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
          <div class="flex items-start justify-between">
            <div class="text-white">
              <h3 class="text-xl font-bold">{{ selectedRecord?.equipment?.name }}</h3>
              <p class="text-indigo-100 text-sm mt-1">Serial: {{ selectedRecord?.equipment?.serialNumber }}</p>
            </div>
            <button @click="isDetailOpen = false" class="p-2 hover:bg-white/20 rounded-lg transition-colors text-white">
              <XMarkIcon class="w-5 h-5" />
            </button>
          </div>
        </div>

        <div class="p-6 space-y-5">
          <!-- Info Cards Grid -->
          <div class="grid grid-cols-2 gap-4">
            <!-- PM Date Card -->
            <div class="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <span class="text-blue-600 dark:text-blue-400 text-xs font-medium uppercase tracking-wider">วันที่ PM</span>
              </div>
              <div class="text-lg font-bold text-gray-900 dark:text-gray-100">
                {{ selectedRecord ? format(new Date(selectedRecord.pmDate), 'dd MMMM yyyy') : '' }}
              </div>
            </div>

            <!-- Staff Card -->
            <div class="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-100 dark:border-emerald-800">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                  <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <span class="text-emerald-600 dark:text-emerald-400 text-xs font-medium uppercase tracking-wider">ผู้ดำเนินการ</span>
              </div>
              <div class="text-lg font-bold text-gray-900 dark:text-gray-100">
                {{ selectedRecord?.staff ? (selectedRecord.staff.name || selectedRecord.staff.username) : 'N/A' }}
              </div>
            </div>

            <!-- Equipment Group Card -->
            <div class="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                  <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span class="text-purple-600 dark:text-purple-400 text-xs font-medium uppercase tracking-wider">กลุ่มอุปกรณ์</span>
              </div>
              <div class="text-lg font-bold text-gray-900 dark:text-gray-100">
                {{ selectedRecord?.equipment?.equipmentGroup }}
              </div>
              <div class="text-sm text-gray-500">{{ selectedRecord?.equipment?.type }}</div>
            </div>

            <!-- Cost Card -->
            <div class="bg-rose-50 dark:bg-rose-900/20 rounded-xl p-4 border border-rose-100 dark:border-rose-800">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center">
                  <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span class="text-rose-600 dark:text-rose-400 text-xs font-medium uppercase tracking-wider">ค่าใช้จ่าย</span>
              </div>
              <div class="text-lg font-bold text-rose-600">
                {{ Number(selectedRecord?.cost || 0).toLocaleString() }} บาท
              </div>
            </div>
          </div>

          <!-- Details Section -->
          <div class="bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-700 rounded-t-xl">
              <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">📝 Log / รายละเอียด</span>
            </div>
            <div class="p-4">
              <div v-if="selectedRecord?.details" class="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                {{ selectedRecord.details }}
              </div>
              <div v-else class="text-sm text-gray-400 italic text-center py-4">
                (ไม่มีรายละเอียดเพิ่มเติม)
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="flex justify-end pt-2">
            <button @click="isDetailOpen = false" class="px-6 py-2.5 bg-gray-800 hover:bg-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 text-white rounded-lg font-medium transition-colors">
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
