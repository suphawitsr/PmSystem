<script setup lang="ts">
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { PlusIcon, KeyIcon, TrashIcon, PencilSquareIcon } from '@heroicons/vue/24/outline'

const staffs = ref<any[]>([])
const loading = ref(true)

const isAddModalOpen = ref(false)
const isEditModalOpen = ref(false)
const isEditPasswordModalOpen = ref(false)
const selectedStaff = ref<any>(null)

const newStaff = ref({
  username: '',
  password: '',
  name: '',
  role: 'STAFF'
})

const editForm = ref({
  name: '',
  role: 'STAFF',
  password: ''
})

const fetchStaffs = async () => {
  try {
    const res = await axios.get('http://localhost:3000/user')
    staffs.value = res.data
  } catch (error) {
    console.error('Failed to fetch staffs', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchStaffs()
})

const addStaff = async () => {
  try {
    await axios.post('http://localhost:3000/auth/register', newStaff.value)
    isAddModalOpen.value = false
    newStaff.value = { username: '', password: '', name: '', role: 'STAFF' }
    fetchStaffs()
  } catch (error) {
    console.error('Failed to add staff', error)
    alert('Error adding staff. Username might be taken.')
  }
}

const openEditModal = (staff: any) => {
  selectedStaff.value = staff
  editForm.value = {
    name: staff.name,
    role: staff.role,
    password: ''
  }
  isEditModalOpen.value = true
}

const openEditPasswordModal = (staff: any) => {
  selectedStaff.value = staff
  editForm.value.password = ''
  isEditPasswordModalOpen.value = true
}

const updateStaff = async () => {
  try {
    const payload: any = {
      name: editForm.value.name,
      role: editForm.value.role
    }
    if (editForm.value.password) {
      payload.password = editForm.value.password
    }
    await axios.patch(`http://localhost:3000/user/${selectedStaff.value.id}`, payload)
    isEditModalOpen.value = false
    editForm.value = { name: '', role: 'STAFF', password: '' }
    fetchStaffs()
    alert('User updated successfully')
  } catch (error) {
    console.error('Failed to update staff', error)
    alert('Error updating user')
  }
}

const updatePassword = async () => {
  if (!editForm.value.password) return
  try {
    await axios.patch(`http://localhost:3000/user/${selectedStaff.value.id}`, { password: editForm.value.password })
    isEditPasswordModalOpen.value = false
    editForm.value.password = ''
    alert('Password updated successfully')
  } catch (error) {
    console.error('Failed to update password', error)
  }
}

const deleteStaff = async (id: string) => {
  if (!confirm('Are you sure you want to delete this staff?')) return
  try {
    await axios.delete(`http://localhost:3000/user/${id}`)
    fetchStaffs()
  } catch (error) {
    console.error('Failed to delete staff', error)
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h2 class="text-2xl font-bold tracking-tight">Staff Management</h2>
      <button @click="isAddModalOpen = true" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2">
        <PlusIcon class="w-5 h-5" />
        Add User
      </button>
    </div>

    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-medium">
            <tr>
              <th class="px-6 py-4">Name</th>
              <th class="px-6 py-4">Username</th>
              <th class="px-6 py-4">Role</th>
              <th class="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-700">
            <tr v-if="loading" class="animate-pulse">
              <td colspan="4" class="px-6 py-8 text-center text-gray-500">Loading staffs...</td>
            </tr>
            <tr v-else-if="staffs.length === 0">
              <td colspan="4" class="px-6 py-8 text-center text-gray-500">No staff found.</td>
            </tr>
            <tr v-for="staff in staffs" :key="staff.id" class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <td class="px-6 py-4 font-medium">{{ staff.name }}</td>
              <td class="px-6 py-4">{{ staff.username }}</td>
              <td class="px-6 py-4">
                <span class="px-2.5 py-1 rounded-full text-xs font-medium" :class="staff.role === 'ADMIN' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'">
                  {{ staff.role }}
                </span>
              </td>
              <td class="px-6 py-4 text-right space-x-1">
                <button @click="openEditModal(staff)" class="text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 p-2 rounded-lg transition-colors inline-flex items-center gap-1" title="Edit User">
                  <PencilSquareIcon class="w-4 h-4" />
                  <span class="text-xs font-medium">Edit</span>
                </button>
                <button @click="openEditPasswordModal(staff)" class="text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/30 p-2 rounded-lg transition-colors inline-flex items-center gap-1" title="Change Password">
                  <KeyIcon class="w-4 h-4" />
                  <span class="text-xs font-medium">Password</span>
                </button>
                <button @click="deleteStaff(staff.id)" class="text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 p-2 rounded-lg transition-colors inline-flex items-center gap-1" title="Delete User">
                  <TrashIcon class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add Staff Modal -->
    <div v-if="isAddModalOpen" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 class="text-lg font-bold">Add New User</h3>
        </div>
        <form @submit.prevent="addStaff" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
            <input v-model="newStaff.name" type="text" required class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
            <input v-model="newStaff.username" type="text" required class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input v-model="newStaff.password" type="password" required class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
            <select v-model="newStaff.role" class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700">
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div class="pt-4 flex justify-end gap-3">
            <button type="button" @click="isAddModalOpen = false" class="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
            <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">Add User</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit User Modal -->
    <div v-if="isEditModalOpen" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 class="text-lg font-bold">Edit User</h3>
          <p class="text-sm text-gray-500">{{ selectedStaff?.username }}</p>
        </div>
        <form @submit.prevent="updateStaff" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
            <input v-model="editForm.name" type="text" required class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700" />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
            <select v-model="editForm.role" class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700">
              <option value="STAFF">Staff</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Password <span class="text-gray-400 font-normal">(เว้นว่างหากไม่ต้องการเปลี่ยน)</span>
            </label>
            <input v-model="editForm.password" type="password" placeholder="Enter new password (optional)" class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700" />
          </div>
          <div class="pt-4 flex justify-end gap-3">
            <button type="button" @click="isEditModalOpen = false" class="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
            <button type="submit" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">Save Changes</button>
          </div>
        </form>
      </div>
    </div>

    <!-- Edit Password Modal -->
    <div v-if="isEditPasswordModalOpen" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h3 class="text-lg font-bold">Change Password</h3>
          <p class="text-sm text-gray-500">For {{ selectedStaff?.username }}</p>
        </div>
        <form @submit.prevent="updatePassword" class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
            <input v-model="editForm.password" type="password" required class="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700" />
          </div>
          <div class="pt-4 flex justify-end gap-3">
            <button type="button" @click="isEditPasswordModalOpen = false" class="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancel</button>
            <button type="submit" class="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">Save Password</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
