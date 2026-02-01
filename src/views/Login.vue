<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const backendUrl = 'https://backend-test-n4bo.vercel.app'

const router = useRouter()
const username = ref('')
const password = ref('')
const role = ref('guru') // guru | siswa | admin
const error = ref('')
const loading = ref(false)

const handleLogin = async () => {
  error.value = ''

  if (!username.value || !password.value) {
    error.value = 'Email dan password wajib diisi'
    return
  }

  loading.value = true

  try {
    let endpoint = ''

    if (role.value === 'guru') endpoint = '/teachers/login'
    else if (role.value === 'siswa') endpoint = '/students/login'
    else if (role.value === 'admin') endpoint = '/admins/login'

    const { data } = await axios.post(`${backendUrl}${endpoint}`, {
      email: username.value,
      password: password.value
    })

    /* ================= RESET SESSION LOGIN SAJA ================= */
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('role')
    localStorage.removeItem('token')

    localStorage.removeItem('teacherId')
    localStorage.removeItem('teacherName')
    localStorage.removeItem('teacherMapel')

    localStorage.removeItem('studentId')
    localStorage.removeItem('studentName')
    localStorage.removeItem('studentNis')
    localStorage.removeItem('studentClass')

    localStorage.removeItem('adminId')
    localStorage.removeItem('adminName')
    localStorage.removeItem('adminEmail')

    /* ================= SET SESSION BARU ================= */
    localStorage.setItem('isLoggedIn', 'true')
    localStorage.setItem('role', role.value)

    if (role.value === 'guru') {
      localStorage.setItem('teacherId', data.teacherId)
      localStorage.setItem('teacherName', data.name)
      localStorage.setItem('teacherMapel', data.mapel || '')
      router.push('/dashboard')
    }

    if (role.value === 'siswa') {
      localStorage.setItem('studentId', data.studentId)
      localStorage.setItem('studentName', data.name)
      localStorage.setItem('studentNis', data.nis)
      localStorage.setItem('studentClass', data.class)
      router.push('/student-dashboard')
    }

    if (role.value === 'admin') {
      localStorage.setItem('adminId', data.adminId)
      localStorage.setItem('adminName', data.name)
      localStorage.setItem('adminEmail', data.email)
      router.push('/admin-dashboard')
    }

  } catch (err) {
    error.value = err.response?.data?.message || 'Login gagal'
    alert(error.value)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">

    <!-- Overlay Loading -->
    <div v-if="loading" class="overlay">
      <div class="spinner"></div>
      <p>Memuat...</p>
    </div>

    <div class="login-card">
      <div class="header">
        <h1>Login</h1>
        <p>Silakan login sesuai peran</p>
      </div>

      <!-- ROLE SWITCH -->
      <div class="role-switch">
        <button :class="{ active: role==='guru' }" @click="role='guru'">Guru</button>
        <button :class="{ active: role==='siswa' }" @click="role='siswa'">Siswa</button>
        <button :class="{ active: role==='admin' }" @click="role='admin'">Admin</button>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label>Email</label>
          <input v-model="username" type="email" placeholder="Email" required />
        </div>

        <div class="form-group">
          <label>Password</label>
          <input v-model="password" type="password" placeholder="Password" required />
        </div>

        <p v-if="error" class="error-msg">{{ error }}</p>

        <button type="submit" class="btn-primary">
          Login sebagai {{ role.toUpperCase() }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
/* ==== LOGIN PAGE STYLE ==== */
.login-page {
  height:100vh;
  display:flex;
  justify-content:center;
  align-items:center;
  background:#f3f4f6;
  position:relative;
}

.login-card {
  width:100%;
  max-width:400px;
  padding:32px;
  background:white;
  border-radius:12px;
  box-shadow:0 4px 12px rgba(0,0,0,0.1);
  z-index:1;
}

.header h1 {
  margin:0 0 8px 0;
  font-size:1.5rem;
  font-weight:700;
}

.header p {
  margin:0;
  color:#6b7280;
  font-size:0.95rem;
}

.role-switch {
  display:flex;
  gap:10px;
  margin-bottom:20px;
}

.role-switch button {
  flex:1;
  padding:10px;
  border-radius:8px;
  border:1px solid #e5e7eb;
  background:#f9fafb;
  cursor:pointer;
  transition:0.2s;
  font-weight:600;
}

.role-switch button.active {
  background:#4f46e5;
  color:white;
  border-color:#4f46e5;
}

.form-group {
  margin-bottom:16px;
}

.form-group input {
  width:100%;
  padding:12px;
  border-radius:8px;
  border:1px solid #e5e7eb;
  transition:0.2s;
}

.form-group input:focus {
  outline:none;
  border-color:#4f46e5;
  box-shadow:0 0 0 2px rgba(79,70,229,0.2);
}

.error-msg {
  color:#ef4444;
  margin-bottom:12px;
  font-size:0.9rem;
}

.btn-primary {
  width:100%;
  padding:12px;
  background:#4f46e5;
  color:white;
  border:none;
  border-radius:8px;
  font-weight:bold;
  cursor:pointer;
  transition:0.2s;
}

.btn-primary:hover {
  background:#4338ca;
}

/* ================= OVERLAY LOADING ================= */
.overlay {
  position:fixed;
  top:0;
  left:0;
  width:100%;
  height:100%;
  background: rgba(0,0,0,0.4);
  display:flex;
  flex-direction:column;
  justify-content:center;
  align-items:center;
  z-index:9999;
  color:white;
  font-weight:bold;
  font-size:1.1rem;
}

.spinner {
  border:6px solid rgba(255,255,255,0.3);
  border-top:6px solid white;
  border-radius:50%;
  width:50px;
  height:50px;
  animation: spin 1s linear infinite;
  margin-bottom:16px;
}

@keyframes spin {
  0% { transform:rotate(0deg); }
  100% { transform:rotate(360deg); }
}
</style>
