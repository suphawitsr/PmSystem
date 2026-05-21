import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import EquipmentView from '../views/EquipmentView.vue'
import PmHistoryView from '../views/PmHistoryView.vue'
import LoginView from '../views/LoginView.vue'
import RegisterView from '../views/RegisterView.vue'
import StaffManagementView from '../views/StaffManagementView.vue'
import MyTasksView from '../views/MyTasksView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/register',
      name: 'register',
      component: RegisterView
    },
    {
      path: '/',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true }
    },
    {
      path: '/equipment',
      name: 'equipment',
      component: EquipmentView,
      meta: { requiresAuth: true }
    },
    {
      path: '/pm-history',
      name: 'pm-history',
      component: PmHistoryView,
      meta: { requiresAuth: true }
    },
    {
      path: '/staff',
      name: 'staff',
      component: StaffManagementView,
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/my-tasks',
      name: 'my-tasks',
      component: MyTasksView,
      meta: { requiresAuth: true, requiresStaff: true }
    }
  ]
})

router.beforeEach((to) => {
  const token = localStorage.getItem('token')
  const userStr = localStorage.getItem('user')
  const user = userStr ? JSON.parse(userStr) : null

  if (to.meta.requiresAuth && !token) {
    return '/login'
  }
  if (to.meta.requiresAdmin && user?.role !== 'ADMIN') {
    return '/'
  }
  if (to.meta.requiresStaff && user?.role !== 'STAFF') {
    return '/'
  }
  return true
})

export default router
