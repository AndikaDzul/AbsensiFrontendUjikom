<template>
  <div class="login-page">
    <div class="bg-circles">
      <div class="circle c1"></div>
      <div class="circle c2"></div>
    </div>

    <div v-if="loading" class="overlay">
      <div class="spinner-wrapper">
        <div class="spinner"></div>
        <div class="spinner-inner"></div>
      </div>
      <p>Memverifikasi Akun...</p>
    </div>

    <div class="login-card">
      <div class="header">
        <div class="logo-wrapper">
          <div class="logo-box">
            <i class="bi bi-shield-check"></i>
          </div>
        </div>
        <h1>ZieSen</h1>
        <p>Smart Attendance System</p>
      </div>

      <div class="role-selector">
        <div class="active-bg" :style="tabPositionStyle"></div>
        <button 
          v-for="r in ['guru', 'siswa', 'admin']" 
          :key="r"
          type="button" 
          :class="{ active: role === r }" 
          @click="role = r"
        >
          {{ r.charAt(0).toUpperCase() + r.slice(1) }}
        </button>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label><i class="bi bi-envelope"></i> Email Address</label>
          <input 
            v-model="username" 
            type="email" 
            placeholder="nama@sekolah.com" 
            required 
            autocomplete="email"
          />
        </div>

        <div class="form-group">
          <label><i class="bi bi-lock"></i> Password</label>
          <input 
            v-model="password" 
            type="password" 
            placeholder="••••••••" 
            required 
            autocomplete="current-password"
          />
        </div>

        <div class="form-utils">
          <label class="remember-me">
            <input type="checkbox"> <span>Ingat saya</span>
          </label>
          <a href="#" class="forgot-link"></a>
        </div>

        <Transition name="slide-up">
          <div v-if="error" class="error-container">
            <i class="bi bi-exclamation-circle-fill"></i>
            <span>{{ error }}</span>
          </div>
        </Transition>

        <button type="submit" class="btn-primary" :disabled="loading">
          <span v-if="!loading">
            Masuk Sebagai {{ role.charAt(0).toUpperCase() + role.slice(1) }}
            <i class="bi bi-arrow-right-short"></i>
          </span>
          <span v-else>Memproses Keamanan...</span>
        </button>
      </form>
      
      <div class="footer-note">
        <p>&copy; 2026 ZieSen Team. All rights reserved.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const backendUrl = 'https://backend-deployys-3jtk.vercel.app'
const router = useRouter()

const username = ref('')
const password = ref('')
const role = ref('siswa') // Default langsung ke Siswa
const error = ref('')
const loading = ref(false)

// Animasi Slider Tab
const tabPositionStyle = computed(() => {
  const roles = ['guru', 'siswa', 'admin']
  const index = roles.indexOf(role.value)
  return {
    transform: `translateX(${index * 100}%)`,
    width: '33.33%'
  }
})

const handleLogin = async () => {
  error.value = ''
  if (!username.value || !password.value) {
    error.value = 'Email dan password tidak boleh kosong'
    return
  }

  loading.value = true
  console.log("Mencoba login...", { email: username.value, role: role.value });

  try {
    // Tentukan endpoint berdasarkan pilihan user
    let endpoint = role.value === 'guru' ? '/teachers/login' : 
                   role.value === 'siswa' ? '/students/login' : '/admins/login'

    const response = await axios.post(`${backendUrl}${endpoint}`, {
      email: username.value,
      password: password.value
    })

    const data = response.data.user || response.data
    
    // ================= LOGIKA PENYIMPANAN DATA =================
    localStorage.clear()
    localStorage.setItem('isLoggedIn', 'true')
    localStorage.setItem('role', role.value)
    
    // Role Siswa (Sesuai Logic yang Anda minta)
    if (role.value === 'siswa') {
      localStorage.setItem('studentId', data._id)
      localStorage.setItem('studentName', data.name)
      localStorage.setItem('studentNis', data.nis || '-')
      localStorage.setItem('studentClass', data.class || '-')
      if (data.status) localStorage.setItem('studentStatus', data.status)
      
      router.push('/student-dashboard')
    } 
    // Role Guru
    else if (role.value === 'guru') {
      localStorage.setItem('teacherId', data._id)
      localStorage.setItem('teacherName', data.name)
      localStorage.setItem('teacherMapel', data.mapel || '')
      router.push('/dashboard')
    } 
    // Role Admin
    else {
      localStorage.setItem('adminId', data._id)
      localStorage.setItem('adminName', data.name)
      router.push('/admin-dashboard')
    }

  } catch (err) {
    console.error("Login Error:", err)
    if (!err.response) {
      error.value = 'Server sedang offline. Pastikan backend menyala.'
    } else {
      error.value = err.response.data?.message || 'Akses ditolak. Cek email & password.'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
@import url("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css");

.login-page {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #0f172a;
  font-family: 'Plus Jakarta Sans', sans-serif;
  overflow: hidden;
  position: relative;
}

/* Background Gradients */
.bg-circles { position: absolute; width: 100%; height: 100%; z-index: 0; }
.circle { position: absolute; border-radius: 50%; filter: blur(80px); }
.c1 { width: 400px; height: 400px; background: rgba(79, 70, 229, 0.15); top: -100px; right: -50px; }
.c2 { width: 350px; height: 350px; background: rgba(14, 165, 233, 0.15); bottom: -50px; left: -50px; }

.login-card {
  width: 90%; max-width: 420px; padding: 40px;
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 28px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  z-index: 10;
}

.header { text-align: center; margin-bottom: 30px; }
.logo-box {
  width: 54px; height: 54px; margin: 0 auto 15px;
  background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  color: white; font-size: 1.8rem;
  box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
}
.header h1 { margin: 0; font-size: 1.75rem; color: #f8fafc; font-weight: 700; letter-spacing: -1px; }
.header p { color: #94a3b8; font-size: 0.9rem; margin-top: 5px; }

.role-selector {
  display: flex; background: rgba(15, 23, 42, 0.6); padding: 5px;
  border-radius: 14px; margin-bottom: 30px; position: relative;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.active-bg {
  position: absolute; height: calc(100% - 10px);
  background: rgba(255, 255, 255, 0.08); border-radius: 10px;
  transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
.role-selector button {
  flex: 1; padding: 12px; border: none; background: none;
  color: #94a3b8; font-weight: 600; cursor: pointer; z-index: 1;
}
.role-selector button.active { color: #fff; }

.form-group { margin-bottom: 22px; }
.form-group label { display: block; margin-bottom: 8px; font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; font-weight: 700; }
.form-group label i { color: #6366f1; margin-right: 5px; }
.form-group input {
  width: 100%; padding: 14px 16px; border-radius: 12px;
  background: rgba(15, 23, 42, 0.4); border: 1px solid rgba(255, 255, 255, 0.1);
  color: white; font-size: 0.95rem;
}
.form-group input:focus { outline: none; border-color: #6366f1; background: rgba(15, 23, 42, 0.6); }

.form-utils { display: flex; justify-content: space-between; margin-bottom: 25px; font-size: 0.85rem; }
.remember-me { color: #94a3b8; display: flex; align-items: center; gap: 8px; cursor: pointer; }
.forgot-link { color: #6366f1; text-decoration: none; font-weight: 600; }

.btn-primary {
  width: 100%; padding: 16px; border-radius: 12px; border: none;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%);
  color: white; font-weight: 700; cursor: pointer; transition: 0.3s;
}
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 10px 20px rgba(79, 70, 229, 0.3); }

.error-container {
  background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2);
  color: #fca5a5; padding: 12px; border-radius: 12px; margin-bottom: 20px;
  font-size: 0.85rem; display: flex; align-items: center; gap: 10px;
}

.overlay {
  position: fixed; inset: 0; background: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(8px); display: flex; flex-direction: column;
  justify-content: center; align-items: center; z-index: 9999; color: white;
}
.spinner-wrapper { position: relative; width: 60px; height: 60px; margin-bottom: 20px; }
.spinner {
  position: absolute; inset: 0; border: 3px solid rgba(99, 102, 241, 0.1);
  border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite;
}
.spinner-inner {
  position: absolute; inset: 10px; border: 3px solid rgba(168, 85, 247, 0.1);
  border-bottom-color: #a855f7; border-radius: 50%; animation: spin 1.2s linear reverse infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }
.slide-up-enter-active { transition: all 0.3s ease-out; }
.slide-up-enter-from { opacity: 0; transform: translateY(10px); }
</style>