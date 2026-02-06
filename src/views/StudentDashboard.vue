<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Html5Qrcode } from 'html5-qrcode'
import axios from 'axios'

const router = useRouter()
const backendUrl = 'https://backend-deployys-bere9s.vercel.app'

// ================= STATE SISWA =================
const student = ref({ name:'', nis:'', class:'', status:'Belum Absen', lastAttendance: null })
const studentsHadir = ref([]) 
const qrVisible = ref(false)
const scheduleVisible = ref(false)
let html5QrCode = null
let scanning = false
const guruTokenPrefix = 'ABSENSI-GURU-'
const jadwalHariIni = ref([])

// ================= AUDIO, VIBRATE & TOAST =================
const playSuccessFeedback = () => {
  // 1. Suara
  const audio = new Audio('/sounds/succes.mp3')
  audio.play().catch(() => {})
  
  // 2. Getaran (Vibrate) - Pola: 200ms getar, 100ms diam, 200ms getar
  if (window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate([200, 100, 200]);
  }
}

const toast = ref({ show:false, msg:'', type:'success' })
const showToast = (msg,type='success')=>{
  toast.value = { show:true, msg, type }
  setTimeout(()=>toast.value.show=false,3000)
}

// ================= LOGIKA RESET 24 JAM =================
const canAbsen = computed(() => {
  if (!student.value.lastAttendance) return true
  const lastTime = new Date(student.value.lastAttendance).getTime()
  const now = new Date().getTime()
  const twentyFourHours = 24 * 60 * 60 * 1000
  return (now - lastTime) > twentyFourHours
})

const displayStatus = computed(() => student.value.status)
const hariIni = computed(()=> new Date().toLocaleDateString('id-ID', { weekday: 'long' }))

// ================= DATA JADWAL =================
const jadwalAll = {
  "Senin":[{ jam:"07:10", mapel:"Konsentrasi RPL", guru:"Yaqub Hadi Permana, S.T." }, { jam:"09:25", mapel:"Pancasila", guru:"Ati Melani" }, { jam:"13:50", mapel:"Matematika", guru:"Hinda Gumiarti, M.Pd" }],
  "Selasa":[{ jam:"07:10", mapel:"Konsentrasi XII RPL-2", guru:"Yaqub Hadi Permana, S.T." }, { jam:"12:30", mapel:"Konsentrasi XII RPL-2", guru:"Fajar M. Sukmawijaya, M.Kom" }],
  "Rabu":[{ jam:"07:10", mapel:"Bahasa Jepang", guru:"Pradita Surya Arianti" }, { jam:"08:30", mapel:"Konsentrasi XII RPL-2", guru:"Yaqub Hadi Permana, S.T." }],
  "Kamis":[{ jam:"07:10", mapel:"PAB", guru:"Dikdik Juanda, S.Pd.I." }, { jam:"12:30", mapel:"Konsentrasi XII RPL-2", guru:"Yayat Ruhiyat, S.ST" }],
  "Jumat":[{ jam:"07:10", mapel:"B. Indonesia", guru:"Rubaetul Adawiyah, S.Pd" }, { jam:"10:05", mapel:"Konsentrasi XII RPL-2", guru:"Sarah Siti Sumaerah, S.T." }]
}

const loadJadwalHariIni = ()=> { jadwalHariIni.value = jadwalAll[hariIni.value] || [] }

// ================= QR SCANNER =================
const startScan = async()=>{
  if(!canAbsen.value){
    showToast('Kamu sudah absen hari ini.','error')
    return
  }
  qrVisible.value = true
  scanning = false
  setTimeout(async()=>{
    try {
      html5QrCode = new Html5Qrcode('qr-reader')
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps:15, qrbox: 250 },
        async(decodedText)=>{
          if(scanning) return
          if(!decodedText.startsWith(guruTokenPrefix)){
            showToast('QR Code Tidak Valid','error')
            if (window.navigator.vibrate) window.navigator.vibrate(100);
            return
          }
          scanning = true
          await submitAttendance(decodedText)
        }
      )
    } catch (err) {
      showToast('Kamera Bermasalah','error')
      qrVisible.value = false
    }
  },300)
}

const stopScan = async()=>{
  if(html5QrCode) { 
    try { await html5QrCode.stop(); await html5QrCode.clear() } catch(e) {}
  }
  qrVisible.value = false
}

// ================= LOGIC UPDATE DATABASE =================
const submitAttendance = async(decodedText)=>{
  try{
    const now = new Date()
    const payload = { 
      status: 'Hadir',
      qrToken: decodedText,
      timestamp: now.toISOString()
    }
    
    await axios.patch(`${backendUrl}/students/attendance/${student.value.nis}`, payload)
    
    student.value.status = 'Hadir'
    student.value.lastAttendance = now.toISOString()
    
    playSuccessFeedback() // SUARA + GETARAN
    showToast('Berhasil Absen! Selamat belajar.')

    stopScan()
    loadAttendance()
  } catch(err){
    showToast(err.response?.data?.message || 'Gagal mengirim absensi','error')
    scanning = false
  }
}

// ================= LOAD DATA =================
const loadAttendance = async ()=>{
  try{
    const res = await axios.get(`${backendUrl}/students`)
    studentsHadir.value = res.data.filter(s => s.status === 'Hadir')

    const me = res.data.find(s => s.nis === student.value.nis)
    if(me && me.status==='Hadir') {
      student.value.status = 'Hadir'
      student.value.lastAttendance = me.attendanceHistory?.[me.attendanceHistory.length-1]?.timestamp || me.updatedAt
    } else {
      student.value.status = 'Belum Absen'
    }
  } catch(err){ console.log('Syncing...') }
}

const logout = () => {
  localStorage.clear()
  router.replace('/login')
}

onMounted(()=>{
  const nis = localStorage.getItem('studentNis')
  if(!nis){ router.replace('/login'); return }
  
  student.value = { 
    name: localStorage.getItem('studentName'), 
    nis, 
    class: localStorage.getItem('studentClass'), 
    status:'Belum Absen',
    lastAttendance: null
  }
  loadJadwalHariIni()
  loadAttendance()
  
  const interval = setInterval(loadAttendance, 5000)
  onUnmounted(() => clearInterval(interval))
})

onUnmounted(()=> stopScan())
</script>

<template>
  <div class="app-container">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css" rel="stylesheet">

    <transition name="toast-fade">
      <div v-if="toast.show" class="custom-toast" :class="toast.type">
        <i :class="toast.type === 'success' ? 'bi bi-check-circle-fill' : 'bi bi-exclamation-triangle-fill'"></i>
        {{ toast.msg }}
      </div>
    </transition>

    <nav class="navbar navbar-light bg-white sticky-top shadow-sm px-3 py-3">
      <div class="container-fluid p-0">
        <div class="d-flex align-items-center">
          <div class="user-avatar-glow me-3">{{ student.name?.[0] }}</div>
          <div>
            <h6 class="mb-0 fw-bold text-dark">{{ student.name }}</h6>
            <small class="text-muted">{{ student.class }} • {{ student.nis }}</small>
          </div>
        </div>
        <button @click="logout" class="btn btn-light btn-sm rounded-pill px-3 text-danger fw-bold">
          <i class="bi bi-box-arrow-right me-1"></i> Keluar
        </button>
      </div>
    </nav>

    <main class="container px-4 mt-4">
      <section class="status-card border-0 shadow-sm mb-4" :class="student.status === 'Hadir' ? 'status-active' : 'status-pending'">
        <div class="card-body p-4 text-white">
          <div class="d-flex justify-content-between">
            <span class="opacity-75 small">Status Kehadiran Hari Ini</span>
            <i class="bi bi-calendar3 opacity-75"></i>
          </div>
          <h2 class="display-6 fw-bold my-2">{{ displayStatus }}</h2>
          <div class="d-flex align-items-center mt-3">
            <div class="status-indicator me-2"></div>
            <span class="small" v-if="student.status==='Hadir'">Presensi tercatat pada {{ new Date(student.lastAttendance).toLocaleTimeString() }}</span>
            <span class="small" v-else>{{ hariIni }}, {{ new Date().toLocaleDateString('id-ID') }}</span>
          </div>
        </div>
      </section>

      <div class="row g-3 mb-4">
        <div class="col-6">
          <button class="action-btn-main btn shadow-sm w-100 py-4" 
                  @click="startScan" 
                  :disabled="!canAbsen"
                  :class="!canAbsen ? 'disabled-btn' : 'scan-btn-active'">
            <i class="bi bi-qr-code-scan d-block mb-2"></i>
            <span>Scan Absen</span>
          </button>
        </div>
        <div class="col-6">
          <button class="action-btn-main btn btn-white border-0 shadow-sm w-100 py-4" @click="scheduleVisible = true">
            <i class="bi bi-calendar-week d-block mb-2 text-primary"></i>
            <span>Jadwal Mapel</span>
          </button>
        </div>
      </div>

      <div class="section-title d-flex justify-content-between align-items-center mb-3">
        <h6 class="fw-bold m-0"><i class="bi bi-people-fill me-2 text-primary"></i>Siswa Sudah Hadir</h6>
        <span class="badge bg-primary-subtle text-primary rounded-pill px-3 py-2">{{ studentsHadir.length }} Orang</span>
      </div>

      <div class="attendance-list shadow-sm bg-white rounded-4 overflow-hidden mb-5">
        <div class="scroll-container py-2">
          <div v-for="s in studentsHadir" :key="s.nis" class="student-row px-3 py-3 d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center">
              <div class="mini-avatar-list me-3">{{ s.name[0] }}</div>
              <div>
                <p class="mb-0 fw-bold small text-dark">{{ s.name }}</p>
                <small class="text-muted smaller">{{ s.nis }} • {{ s.class }}</small>
              </div>
            </div>
            <span class="status-badge"><i class="bi bi-patch-check-fill me-1"></i>Hadir</span>
          </div>
          <div v-if="studentsHadir.length === 0" class="text-center py-5">
            <i class="bi bi-person-dash text-muted display-4 d-block mb-2"></i>
            <p class="text-muted small">Belum ada siswa yang hadir</p>
          </div>
        </div>
      </div>
    </main>

    <transition name="sheet">
      <div v-if="scheduleVisible" class="sheet-overlay" @click.self="scheduleVisible=false">
        <div class="sheet-content shadow-lg">
          <div class="sheet-handle mb-4"></div>
          <div class="d-flex justify-content-between align-items-center mb-4">
            <h5 class="fw-bold text-dark m-0"><i class="bi bi-clock-history me-2 text-primary"></i>Jadwal {{ hariIni }}</h5>
            <button @click="scheduleVisible=false" class="btn-close-custom"><i class="bi bi-x-lg"></i></button>
          </div>
          
          <div class="schedule-items overflow-auto" style="max-height: 60vh;">
            <div v-for="(j,i) in jadwalHariIni" :key="i" class="schedule-card-item p-3 mb-3 d-flex align-items-center">
              <div class="time-box me-3">{{ j.jam }}</div>
              <div>
                <strong class="d-block text-dark small">{{ j.mapel }}</strong>
                <small class="text-muted smaller"><i class="bi bi-person me-1"></i>{{ j.guru }}</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="qrVisible" class="scanner-fullscreen">
        <div class="scanner-nav p-3 d-flex justify-content-between align-items-center text-white">
          <button @click="stopScan" class="btn btn-link text-white text-decoration-none fw-bold">
            <i class="bi bi-chevron-left me-1"></i> Kembali
          </button>
          <span class="fw-bold">Scan QR Kehadiran</span>
          <div style="width: 70px"></div>
        </div>
        
        <div class="scanner-container">
          <div id="qr-reader" class="qr-box shadow-lg"></div>
          <div class="scan-overlay">
            <div class="scan-frame"></div>
          </div>
        </div>
        
        <div class="scanner-footer p-4 text-center text-white opacity-75">
          <i class="bi bi-lightning-charge-fill me-2 text-warning"></i>
          Arahkan kamera ke QR Code yang diberikan Guru
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap');

.app-container {
  font-family: 'Plus Jakarta Sans', sans-serif;
  background-color: #fcfdfe;
  min-height: 100vh;
  max-width: 480px;
  margin: 0 auto;
  color: #2D3748;
}

/* UI Elements */
.user-avatar-glow {
  width: 42px;
  height: 42px;
  background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%);
  color: white;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(66, 153, 225, 0.3);
}

.status-card {
  border-radius: 28px;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.status-pending { background: linear-gradient(135deg, #718096 0%, #4a5568 100%); }
.status-active { 
  background: linear-gradient(135deg, #48bb78 0%, #2f855a 100%); 
  box-shadow: 0 10px 20px rgba(72, 187, 120, 0.2) !important;
}

.status-indicator {
  width: 8px;
  height: 8px;
  background-color: #fff;
  border-radius: 50%;
  box-shadow: 0 0 8px #fff;
}

.action-btn-main {
  border-radius: 24px;
  background: white;
  transition: all 0.2s;
}

.action-btn-main i { font-size: 1.8rem; }
.action-btn-main:active { transform: scale(0.95); }

.scan-btn-active {
  border: 1px solid #ebf4ff;
  color: #3182ce;
}

.disabled-btn {
  background: #edf2f7 !important;
  color: #a0aec0 !important;
  border: none !important;
}

/* List UI */
.mini-avatar-list {
  width: 38px;
  height: 38px;
  background: #ebf8ff;
  color: #3182ce;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
}

.student-row { border-bottom: 1px solid #f7fafc; }
.status-badge {
  font-size: 0.65rem;
  font-weight: 800;
  color: #38a169;
  background: #f0fff4;
  padding: 5px 12px;
  border-radius: 10px;
  text-transform: uppercase;
}

/* Bottom Sheet */
.sheet-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(2px);
  z-index: 1050;
  display: flex;
  align-items: flex-end;
}

.sheet-content {
  background: white;
  width: 100%;
  border-radius: 32px 32px 0 0;
  padding: 24px;
  animation: slideUp 0.4s ease-out;
}

.sheet-handle {
  width: 45px;
  height: 5px;
  background: #e2e8f0;
  border-radius: 10px;
  margin: 0 auto;
}

.schedule-card-item {
  background: #f8fafc;
  border-radius: 18px;
}

.time-box {
  background: #3182ce;
  color: white;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
}

/* Toast */
.custom-toast {
  position: fixed;
  top: 25px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  padding: 14px 24px;
  border-radius: 20px;
  color: white;
  font-weight: 600;
  box-shadow: 0 10px 25px rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 280px;
}
.toast.success { background: #2f855a; }
.toast.error { background: #e53e3e; }

/* Scanner */
.scanner-fullscreen {
  position: fixed;
  inset: 0;
  background: #000;
  z-index: 2000;
  display: flex;
  flex-direction: column;
}

.scanner-container {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scan-frame {
  width: 260px;
  height: 260px;
  border: 3px solid #4299e1;
  border-radius: 30px;
  position: relative;
  box-shadow: 0 0 0 1000px rgba(0,0,0,0.6);
}

.scan-frame::after {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: #4299e1;
  box-shadow: 0 0 15px #4299e1;
  animation: scanAnim 2s infinite linear;
}

@keyframes scanAnim {
  0% { top: 0; }
  100% { top: 100%; }
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

.smaller { font-size: 0.75rem; }
.btn-close-custom {
  background: #f7fafc;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  color: #a0aec0;
}
</style>