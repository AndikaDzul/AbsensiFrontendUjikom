<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
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

// ================= AUDIO & TOAST =================
const playSuccessSound = () => {
  const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2185/2185-preview.mp3')
  audio.play().catch(() => {})
}

const toast = ref({ show:false, msg:'', type:'success' })
const showToast = (msg,type='success')=>{
  toast.value = { show:true, msg, type }
  setTimeout(()=>toast.value.show=false,3000)
}

// ================= LOGIKA RESET 24 JAM =================
const canAbsen = computed(() => {
  if (!student.value.lastAttendance || student.value.status !== 'Hadir') return true
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

// ================= QR SCANNER (REAR CAMERA FIX) =================
const startScan = async () => {
  if (!canAbsen.value) {
    showToast('Kamu sudah absen hari ini.', 'error')
    return
  }

  qrVisible.value = true
  scanning = false

  // Pastikan DOM dirender sebelum mengakses ID "qr-reader"
  await nextTick()

  try {
    // Bersihkan jika ada instance lama
    if (html5QrCode) {
      try { await html5QrCode.stop() } catch (e) {}
      html5QrCode = null
    }

    html5QrCode = new Html5Qrcode("qr-reader")

    const config = { 
      fps: 15, 
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0 
    }

    // MEMULAI KAMERA BELAKANG (environment)
    await html5QrCode.start(
      { facingMode: { exact: "environment" } }, // Gunakan 'exact' untuk memaksa kamera belakang
      config,
      async (decodedText) => {
        if (scanning) return
        
        if (!decodedText.startsWith(guruTokenPrefix)) {
          showToast('QR Code Guru Tidak Valid', 'error')
          return
        }

        scanning = true 
        await submitAttendance(decodedText)
      }
    ).catch(async () => {
      // Fallback jika 'exact' gagal (biasanya di browser PC/Laptop yang tidak punya kamera belakang)
      await html5QrCode.start({ facingMode: "environment" }, config, async (decodedText) => {
          if (scanning) return
          if (decodedText.startsWith(guruTokenPrefix)) {
            scanning = true
            await submitAttendance(decodedText)
          }
      })
    })

  } catch (err) {
    console.error("Camera Error:", err)
    showToast('Kamera tidak ditemukan atau izin ditolak', 'error')
    qrVisible.value = false
  }
}

const stopScan = async () => {
  if (html5QrCode) {
    try {
      if (html5QrCode.isScanning) {
        await html5QrCode.stop()
      }
    } catch (e) {
      console.warn("Stop error:", e)
    } finally {
      html5QrCode = null
    }
  }
  qrVisible.value = false
}

// ================= LOGIC DATABASE =================
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
    
    playSuccessSound()
    showToast('Berhasil Absen!')
    
    setTimeout(async () => {
      await stopScan()
      loadAttendance()
    }, 800)

  } catch(err){
    showToast(err.response?.data?.message || 'Gagal kirim absensi','error')
    scanning = false 
  }
}

const loadAttendance = async ()=>{
  try{
    const res = await axios.get(`${backendUrl}/students`)
    studentsHadir.value = res.data.filter(s => s.status === 'Hadir')
    const me = res.data.find(s => s.nis === student.value.nis)
    if(me && me.status==='Hadir') {
      student.value.status = 'Hadir'
      student.value.lastAttendance = me.attendanceHistory?.[me.attendanceHistory.length-1]?.timestamp || me.updatedAt
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
    name: localStorage.getItem('studentName'), nis, 
    class: localStorage.getItem('studentClass'), status:'Belum Absen', lastAttendance: null
  }
  loadJadwalHariIni()
  loadAttendance()
  const interval = setInterval(loadAttendance, 10000)
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
            <h6 class="mb-0 fw-bold text-dark text-truncate" style="max-width: 150px;">{{ student.name }}</h6>
            <small class="text-muted">{{ student.class }}</small>
          </div>
        </div>
        <button @click="logout" class="btn btn-light btn-sm rounded-pill px-3 text-danger fw-bold">
          <i class="bi bi-box-arrow-right"></i>
        </button>
      </div>
    </nav>

    <main class="container px-4 mt-4">
      <section class="status-card shadow-sm mb-4" :class="student.status === 'Hadir' ? 'status-active' : 'status-pending'">
        <div class="card-body p-4 text-white">
          <div class="d-flex justify-content-between opacity-75 small mb-2">
            <span>KEHADIRAN HARI INI</span>
            <i class="bi bi-shield-check"></i>
          </div>
          <h2 class="display-6 fw-bold mb-3">{{ displayStatus }}</h2>
          <div class="d-flex align-items-center">
            <div class="pulse-dot me-2"></div>
            <span class="small opacity-90">{{ hariIni }}, {{ new Date().toLocaleDateString('id-ID') }}</span>
          </div>
        </div>
      </section>

      <div class="row g-3 mb-4">
        <div class="col-6">
          <button class="action-card btn w-100 py-4 shadow-sm" @click="startScan" :disabled="!canAbsen" :class="!canAbsen ? 'disabled-card' : 'scan-active'">
            <i class="bi bi-qr-code-scan d-block mb-2 fs-2"></i>
            <span class="fw-bold small">ABSEN</span>
          </button>
        </div>
        <div class="col-6">
          <button class="action-card btn btn-white w-100 py-4 shadow-sm" @click="scheduleVisible = true">
            <i class="bi bi-calendar-week d-block mb-2 fs-2 text-primary"></i>
            <span class="fw-bold small">JADWAL</span>
          </button>
        </div>
      </div>

      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="fw-bold m-0 text-dark"><i class="bi bi-people-fill me-2 text-primary"></i>Sudah Absen</h6>
        <span class="badge bg-primary-subtle text-primary rounded-pill">{{ studentsHadir.length }} Siswa</span>
      </div>

      <div class="attendance-list shadow-sm bg-white rounded-4 overflow-hidden mb-5">
        <div class="scroll-container">
          <div v-for="s in studentsHadir" :key="s.nis" class="student-row px-3 py-3 d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center">
              <div class="mini-avatar me-3">{{ s.name[0] }}</div>
              <div>
                <p class="mb-0 fw-bold small text-dark">{{ s.name }}</p>
                <small class="text-muted smaller">{{ s.nis }}</small>
              </div>
            </div>
            <span class="status-tag"><i class="bi bi-check-circle-fill me-1"></i>Hadir</span>
          </div>
          <div v-if="studentsHadir.length === 0" class="text-center py-5">
            <i class="bi bi-inbox text-muted fs-1 d-block mb-2"></i>
            <p class="text-muted small m-0">Belum ada data masuk</p>
          </div>
        </div>
      </div>
    </main>

    <transition name="fade">
      <div v-if="qrVisible" class="scanner-fullscreen">
        <div class="scanner-nav p-3 d-flex justify-content-between align-items-center text-white">
          <button @click="stopScan" class="btn btn-outline-light btn-sm rounded-pill px-3">
            <i class="bi bi-x-lg me-1"></i> Tutup
          </button>
          <span class="small fw-bold letter-spacing-1">SCAN QR GURU</span>
          <div style="width: 70px"></div>
        </div>
        
        <div class="scanner-body">
          <div id="qr-reader"></div>
          <div class="scan-overlay">
            <div class="scan-frame">
              <div class="corner t-l"></div><div class="corner t-r"></div>
              <div class="corner b-l"></div><div class="corner b-r"></div>
              <div class="scan-line"></div>
            </div>
            <p class="text-white small mt-5 opacity-75">Gunakan kamera belakang</p>
          </div>
        </div>
        <div class="scanner-footer p-4 text-center">
          <div class="spinner-grow spinner-grow-sm text-primary me-2"></div>
          <span class="text-white small">Mencari Kode QR...</span>
        </div>
      </div>
    </transition>

    <transition name="sheet">
      <div v-if="scheduleVisible" class="sheet-overlay" @click.self="scheduleVisible=false">
        <div class="sheet-content">
          <div class="sheet-handle"></div>
          <div class="d-flex justify-content-between align-items-center mb-4">
             <h5 class="fw-bold m-0 text-dark">Jadwal {{ hariIni }}</h5>
             <button @click="scheduleVisible=false" class="btn-close"></button>
          </div>
          <div class="schedule-items">
            <div v-for="(j,i) in jadwalHariIni" :key="i" class="schedule-card-item p-3 mb-3">
              <div class="d-flex align-items-center">
                <div class="time-box me-3">
                  <span class="fw-bold text-primary smaller">{{ j.jam }}</span>
                </div>
                <div>
                  <strong class="d-block text-dark small mb-1">{{ j.mapel }}</strong>
                  <div class="text-muted smaller d-flex align-items-center">
                    <i class="bi bi-person me-1"></i> {{ j.guru }}
                  </div>
                </div>
              </div>
            </div>
            <div v-if="jadwalHariIni.length === 0" class="text-center py-4">
               <p class="text-muted">Tidak ada jadwal hari ini.</p>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');

.app-container {
  font-family: 'Plus Jakarta Sans', sans-serif;
  background-color: #f8fafc;
  min-height: 100vh;
  max-width: 500px;
  margin: 0 auto;
  position: relative;
  overflow-x: hidden;
}

/* User Profile */
.user-avatar-glow {
  width: 42px; height: 42px;
  background: linear-gradient(135deg, #6366f1, #4f46e5);
  color: white; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

/* Status Banner */
.status-card { border-radius: 28px; border: none; overflow: hidden; transition: 0.4s; }
.status-pending { background: linear-gradient(135deg, #1e293b, #334155); }
.status-active { 
  background: linear-gradient(135deg, #10b981, #059669); 
  box-shadow: 0 12px 24px rgba(16, 185, 129, 0.25) !important;
}

/* Animations */
.pulse-dot { width: 8px; height: 8px; background: #fff; border-radius: 50%; animation: pulse 2s infinite; }
@keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.7); } 70% { box-shadow: 0 0 0 10px rgba(255,255,255,0); } 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); } }

/* Cards */
.action-card { background: white; border-radius: 24px; border: 1px solid #f1f5f9; transition: 0.2s; }
.action-card:active { transform: scale(0.95); }
.scan-active { color: #6366f1; border: 1px solid #e0e7ff; }
.disabled-card { background: #f1f5f9 !important; color: #94a3b8 !important; border: none; }

.attendance-list { height: 350px; border-radius: 24px; border: 1px solid #f1f5f9; }
.scroll-container { height: 100%; overflow-y: auto; }
.student-row { border-bottom: 1px solid #f8fafc; }
.mini-avatar { width: 38px; height: 38px; background: #f0f3ff; color: #6366f1; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.8rem; }
.status-tag { font-size: 0.7rem; font-weight: 700; color: #059669; background: #ecfdf5; padding: 5px 12px; border-radius: 10px; }

/* SCANNER UI CORE */
.scanner-fullscreen { position:fixed; inset:0; background:#000; z-index:9999; display:flex; flex-direction:column; }
.scanner-nav { z-index: 10; background: rgba(0,0,0,0.5); }
.scanner-body { flex:1; position:relative; background: #000; overflow: hidden; }

/* QR BOX FIX */
#qr-reader { width: 100% !important; height: 100% !important; border: none !important; }
#qr-reader video { width: 100% !important; height: 100% !important; object-fit: cover !important; }

.scan-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; z-index: 5; }
.scan-frame { width: 260px; height: 260px; position: relative; }
.corner { position: absolute; width: 30px; height: 30px; border: 4px solid #6366f1; }
.t-l { top: 0; left: 0; border-right: none; border-bottom: none; border-radius: 15px 0 0 0; }
.t-r { top: 0; right: 0; border-left: none; border-bottom: none; border-radius: 0 15px 0 0; }
.b-l { bottom: 0; left: 0; border-right: none; border-top: none; border-radius: 0 0 0 15px; }
.b-r { bottom: 0; right: 0; border-left: none; border-top: none; border-radius: 0 0 15px 0; }
.scan-line { position: absolute; width: 100%; height: 2px; background: #6366f1; box-shadow: 0 0 15px #6366f1; animation: moveLine 2.5s infinite linear; }
@keyframes moveLine { 0% { top: 0% } 50% { top: 100% } 100% { top: 0% } }

/* Bottom Sheet */
.sheet-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); z-index: 2000; display: flex; align-items: flex-end; }
.sheet-content { background: white; width: 100%; border-radius: 30px 30px 0 0; padding: 25px; animation: slideUp 0.4s ease-out; }
.schedule-card-item { background: #f8fafc; border-radius: 18px; border: 1px solid #f1f5f9; }
.time-box { background: #eef2ff; padding: 5px 10px; border-radius: 10px; }

/* Toast */
.custom-toast { position: fixed; top: 25px; left: 50%; transform: translateX(-50%); z-index: 10000; padding: 12px 24px; border-radius: 15px; color: white; display: flex; align-items: center; gap: 10px; font-weight: 700; box-shadow: 0 10px 20px rgba(0,0,0,0.2); background: #1e293b; }
.custom-toast.error { background: #ef4444; }

/* Global Transitions */
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
</style>