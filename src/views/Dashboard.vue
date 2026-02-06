<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import QRCode from 'qrcode'
import axios from 'axios'

const router = useRouter()
const backendUrl = 'https://backend-deployys-bere9s.vercel.app'

// ================= STATE =================
const user = ref({ name:'', role:'guru', mapel:'' })
const students = ref([])
const searchQuery = ref('')
const showHistoryFor = ref(null)
const activeTab = ref('hadir')

// ===== QR GURU =====
const guruToken = 'ABSENSI-GURU-2026'
const guruQr = ref('')
let qrInterval = null
const showQrModal = ref(false)

// ================= DARK MODE =================
const darkMode = ref(localStorage.getItem('darkMode') === 'true')
const toggleDarkMode = () => {
  darkMode.value = !darkMode.value
  localStorage.setItem('darkMode', darkMode.value)
}

// ================= TOAST =================
const toastVisible = ref(false)
const toastMessage = ref('')
const toastType = ref('success')
const showToast = (msg, type='success') => {
  toastMessage.value = msg
  toastType.value = type
  toastVisible.value = true
  setTimeout(() => toastVisible.value = false, 3000)
}

// ================= COMPUTED =================
const avatarInitial = computed(() =>
  user.value.name ? user.value.name[0].toUpperCase() : 'G'
)

const filteredStudents = computed(() => {
  let list = students.value
  if (activeTab.value === 'hadir') {
    list = list.filter(s => s.status && s.status !== '')
  } else if (activeTab.value === 'belum') {
    list = list.filter(s => !s.status || s.status === '')
  }

  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.nis.includes(q)
    )
  }
  return list
})

const hadirCount = computed(() =>
  students.value.filter(s => s.status === 'Hadir').length
)

// ================= LOGIC =================
const loadStudents = async () => {
  try {
    const res = await axios.get(`${backendUrl}/students`)
    students.value = res.data.map(s => ({ ...s, history: s.history || [] }))
  } catch(err) {
    console.error('Load siswa gagal:', err)
  }
}

const resetAllAttendance = async () => {
  if(!confirm('Bersihkan semua data kehadiran hari ini?')) return
  try {
    for (const s of students.value) {
      await axios.patch(`${backendUrl}/students/attendance/${s.nis}`, {
        status: '',
        method: 'system'
      })
      s.status = ''
    }
    showToast('Database kehadiran telah direset')
    loadStudents()
  } catch (e) {
    showToast('Gagal mereset data', 'error')
  }
}

const logout = () => {
  localStorage.clear()
  router.replace('/login')
}

const generateQr = async () => {
  const qrData = `${guruToken}-${Date.now()}`
  guruQr.value = await QRCode.toDataURL(qrData)
}

const toggleHistory = (nis) => {
  showHistoryFor.value = showHistoryFor.value === nis ? null : nis
}

onMounted(async () => {
  user.value.name = localStorage.getItem('teacherName') || 'Guru'
  await loadStudents()
  await generateQr()
  qrInterval = setInterval(generateQr, 20000)
})

onUnmounted(() => {
  if(qrInterval) clearInterval(qrInterval)
})
</script>

<template>
<div :class="['app-container', darkMode ? 'dark-theme' : 'light-theme']">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css" rel="stylesheet">

  <Transition name="toast">
    <div v-if="toastVisible" class="custom-toast" :class="toastType">
      <i :class="toastType === 'success' ? 'bi bi-check-circle-fill' : 'bi bi-exclamation-triangle-fill'"></i>
      {{ toastMessage }}
    </div>
  </Transition>

  <nav class="teacher-nav px-3">
    <div class="nav-content-web">
      <div class="d-flex align-items-center gap-3">
        <div class="teacher-avatar shadow-sm">{{ avatarInitial }}</div>
        <div class="teacher-meta">
          <small class="text-muted d-block" style="font-size: 0.7rem;">Panel Pengajar</small>
          <span class="fw-bold">{{ user.name }}</span>
        </div>
      </div>
      <div class="d-flex gap-2">
        <button @click="toggleDarkMode" class="icon-btn">
          <i :class="darkMode ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill'"></i>
        </button>
        <button @click="logout" class="icon-btn text-danger">
          <i class="bi bi-power"></i>
        </button>
      </div>
    </div>
  </nav>

  <main class="container py-4" style="max-width: 600px;">
    <section class="dashboard-hero mb-4 shadow-sm">
      <div class="row align-items-center g-0">
        <div class="col-7 p-4">
          <h4 class="fw-bold mb-1 text-white">Monitoring</h4>
          <p class="text-white-50 small mb-0">Kehadiran Siswa Real-time</p>
        </div>
        <div class="col-5 p-3">
          <div class="stat-card-inner">
            <span class="d-block small text-white-50">HADIR</span>
            <h2 class="fw-black m-0 text-white">{{ hadirCount }}<small class="fs-6 opacity-50">/{{ students.length }}</small></h2>
          </div>
        </div>
      </div>
    </section>

    <button @click="showQrModal=true" class="qr-trigger-card mb-4 border-0 shadow-sm w-100 p-3">
      <div class="d-flex align-items-center gap-3">
        <div class="qr-icon-box">
          <i class="bi bi-qr-code text-primary fs-3"></i>
        </div>
        <div class="text-start flex-grow-1">
          <h6 class="fw-bold mb-0">Tampilkan QR Absensi</h6>
          <small class="text-muted">Siswa melakukan scan melalui ponsel</small>
        </div>
        <i class="bi bi-chevron-right text-muted"></i>
      </div>
    </button>

    <section class="list-section bg-white rounded-4 shadow-sm overflow-hidden mb-4">
      <div class="p-3 border-bottom">
        <div class="tab-pill-container mb-3">
          <button @click="activeTab = 'hadir'" :class="{ active: activeTab === 'hadir' }">Hadir</button>
          <button @click="activeTab = 'belum'" :class="{ active: activeTab === 'belum' }">Belum</button>
          <button @click="activeTab = 'semua'" :class="{ active: activeTab === 'semua' }">Semua</button>
        </div>
        <div class="search-input-group">
          <i class="bi bi-search"></i>
          <input v-model="searchQuery" placeholder="Cari nama atau NIS..." />
        </div>
      </div>

      <div class="list-body">
        <TransitionGroup name="stagger">
          <div v-for="s in filteredStudents" :key="s.nis" class="student-item-row p-3">
            <div class="d-flex align-items-center justify-content-between">
              <div class="d-flex align-items-center gap-3">
                <div class="student-initial">{{ s.name[0] }}</div>
                <div>
                  <h6 class="mb-0 fw-bold small">{{ s.name }}</h6>
                  <small class="text-muted smaller">{{ s.nis }} • {{ s.class || 'XII RPL' }}</small>
                </div>
              </div>
              <span :class="['status-tag', s.status ? 'tag-hadir' : 'tag-pending']">
                <i :class="s.status ? 'bi bi-check-circle-fill' : 'bi bi-clock'"></i>
                {{ s.status || 'Belum' }}
              </span>
            </div>
            
            <div v-if="s.status" class="mt-2 pt-2 border-top-dashed d-flex justify-content-between align-items-center">
               <button @click="toggleHistory(s.nis)" class="btn-detail">
                 {{ showHistoryFor === s.nis ? 'Sembunyikan' : 'Lihat Detail Waktu' }}
               </button>
               <small v-if="showHistoryFor === s.nis" class="text-primary fw-bold smaller">
                 <i class="bi bi-stopwatch me-1"></i>07:15 WIB
               </small>
            </div>
          </div>
        </TransitionGroup>

        <div v-if="filteredStudents.length === 0" class="text-center py-5">
          <i class="bi bi-folder2-open display-4 text-muted mb-2"></i>
          <p class="text-muted small">Data tidak ditemukan</p>
        </div>
      </div>
    </section>

    <button @click="resetAllAttendance" class="btn-reset-data">
      <i class="bi bi-trash3 me-2"></i> Reset Kehadiran Hari Ini
    </button>
  </main>

  <Transition name="sheet">
    <div v-if="showQrModal" class="sheet-overlay" @click.self="showQrModal=false">
      <div class="sheet-content">
        <div class="drag-handle mb-4"></div>
        <div class="text-center mb-4">
          <h5 class="fw-bold mb-1">QR Code Presensi</h5>
          <p class="text-muted small">Berlaku untuk mata pelajaran saat ini</p>
        </div>
        
        <div class="qr-display-area shadow-sm">
          <img :src="guruQr" class="img-fluid rounded-3" alt="QR Code" />
          <div class="qr-progress-bar">
            <div class="bar-fill"></div>
          </div>
        </div>

        <div class="mt-4 p-3 bg-light rounded-3 text-center">
          <small class="text-muted d-block mb-1">Status Sinyal QR</small>
          <span class="badge bg-success-subtle text-success border border-success-subtle">
            <i class="bi bi-broadcast me-1"></i> Terhubung & Aktif
          </span>
        </div>
        
        <button @click="showQrModal=false" class="btn btn-dark w-100 rounded-pill py-3 mt-4 fw-bold">
          Selesai / Tutup
        </button>
      </div>
    </div>
  </Transition>
</div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');

.app-container {
  font-family: 'Plus Jakarta Sans', sans-serif;
  min-height: 100vh;
  transition: background 0.3s;
}

.light-theme { background-color: #f8fafc; color: #1e293b; }
.dark-theme { background-color: #0f172a; color: #f1f5f9; }

/* NAVBAR */
.teacher-nav {
  height: 70px;
  background: rgba(255,255,255,0.8);
  backdrop-filter: blur(10px);
  position: sticky; top: 0; z-index: 100;
  border-bottom: 1px solid rgba(0,0,0,0.05);
}
.dark-theme .teacher-nav { background: rgba(30, 41, 59, 0.8); border-color: rgba(255,255,255,0.05); }

.nav-content-web {
  max-width: 600px; margin: 0 auto;
  height: 100%; display: flex; align-items: center; justify-content: space-between;
}

.teacher-avatar {
  width: 40px; height: 40px; border-radius: 12px;
  background: linear-gradient(135deg, #6366f1, #4338ca);
  color: white; display: flex; align-items: center; justify-content: center; font-weight: 800;
}

.icon-btn {
  width: 38px; height: 38px; border-radius: 50%; border: none;
  background: #f1f5f9; display: flex; align-items: center; justify-content: center;
  transition: 0.2s;
}
.dark-theme .icon-btn { background: #1e293b; color: white; }

/* HERO */
.dashboard-hero {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  border-radius: 24px;
  overflow: hidden;
  position: relative;
}
.stat-card-inner {
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(5px);
  border-radius: 18px;
  padding: 15px;
  text-align: center;
}

/* QR TRIGGER */
.qr-trigger-card {
  background: white;
  border-radius: 20px;
  transition: transform 0.2s;
}
.dark-theme .qr-trigger-card { background: #1e293b; }
.qr-trigger-card:active { transform: scale(0.98); }
.qr-icon-box {
  width: 54px; height: 54px; border-radius: 15px;
  background: #eef2ff; display: flex; align-items: center; justify-content: center;
}

/* TABS & SEARCH */
.tab-pill-container {
  display: flex; gap: 5px; background: #f1f5f9; padding: 5px; border-radius: 12px;
}
.dark-theme .tab-pill-container { background: #0f172a; }
.tab-pill-container button {
  flex: 1; border: none; padding: 8px; border-radius: 8px;
  font-size: 0.8rem; font-weight: 700; background: transparent; color: #64748b;
}
.tab-pill-container button.active { background: white; color: #6366f1; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.dark-theme .tab-pill-container button.active { background: #1e293b; color: white; }

.search-input-group {
  position: relative; display: flex; align-items: center;
}
.search-input-group i { position: absolute; left: 12px; color: #94a3b8; }
.search-input-group input {
  width: 100%; border: 1px solid #e2e8f0; border-radius: 12px;
  padding: 10px 10px 10px 40px; font-size: 0.85rem; outline: none;
}
.dark-theme .search-input-group input { background: #0f172a; border-color: #334155; color: white; }

/* LIST ITEM */
.student-item-row { border-bottom: 1px solid #f1f5f9; }
.dark-theme .student-item-row { border-color: rgba(255,255,255,0.05); }
.student-initial {
  width: 36px; height: 36px; border-radius: 50%; background: #f8fafc;
  display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem;
}
.dark-theme .student-initial { background: #0f172a; }

.status-tag {
  font-size: 0.65rem; font-weight: 800; padding: 4px 10px; border-radius: 8px;
  display: flex; align-items: center; gap: 5px;
}
.tag-hadir { background: #dcfce7; color: #15803d; }
.tag-pending { background: #f1f5f9; color: #94a3b8; }

.btn-detail {
  background: none; border: none; color: #6366f1; font-size: 0.7rem; font-weight: 700; padding: 0;
}

.border-top-dashed { border-top: 1px dashed #e2e8f0; }

/* MODAL / SHEET */
.sheet-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5);
  backdrop-filter: blur(4px); z-index: 2000; display: flex; align-items: flex-end;
}
.sheet-content {
  background: white; width: 100%; border-radius: 30px 30px 0 0;
  padding: 25px; animation: slideUp 0.4s ease-out;
}
.dark-theme .sheet-content { background: #1e293b; }
.drag-handle { width: 40px; height: 5px; background: #e2e8f0; border-radius: 5px; margin: 0 auto; }

.qr-display-area {
  background: white; padding: 25px; border-radius: 24px; text-align: center;
}
.qr-progress-bar {
  height: 4px; background: #f1f5f9; border-radius: 2px; margin-top: 20px; overflow: hidden;
}
.bar-fill {
  height: 100%; background: #6366f1; width: 100%;
  animation: qrTimer 20s linear infinite;
}

/* TOAST */
.custom-toast {
  position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
  z-index: 3000; padding: 12px 24px; border-radius: 16px; color: white;
  font-weight: 600; box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  display: flex; align-items: center; gap: 10px;
}
.custom-toast.success { background: #1e293b; }

.btn-reset-data {
  width: 100%; border: 1.5px dashed #ef4444; color: #ef4444;
  background: transparent; border-radius: 15px; padding: 12px; font-weight: 700;
  font-size: 0.8rem; transition: 0.2s;
}
.btn-reset-data:hover { background: rgba(239, 68, 68, 0.05); }

@keyframes qrTimer { from { width: 100%; } to { width: 0%; } }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

.smaller { font-size: 0.7rem; }
</style>