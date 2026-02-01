import { createRouter, createWebHistory } from 'vue-router'

// Views
import Login from '../views/Login.vue'
import AdminDashboard from '../views/Admin.vue'
import TeacherDashboard from '../views/Dashboard.vue'
import StudentDashboard from '../views/StudentDashboard.vue'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: Login },
  { 
    path: '/admin-dashboard', 
    component: AdminDashboard, 
    meta: { requiresAuth: true, role: 'admin' } 
  },
  { 
    path: '/dashboard', 
    component: TeacherDashboard, 
    meta: { requiresAuth: true, role: 'guru' } 
  },
  { 
    path: '/student-dashboard', 
    component: StudentDashboard, 
    meta: { requiresAuth: true, role: 'siswa' } 
  },
  { path: '/:pathMatch(.*)*', redirect: '/login' } // fallback
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Router Guard
router.beforeEach((to, from, next) => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true'
  const role = localStorage.getItem('role')

  if (to.meta.requiresAuth && !isLoggedIn) {
    next('/login')
  } else if (to.meta.role && to.meta.role !== role) {
    next('/login')
  } else {
    next()
  }
})

export default router
