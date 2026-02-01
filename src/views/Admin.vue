<template>
  <div class="layout">

    <!-- SIDEBAR -->
    <aside :class="['sidebar', sidebarOpen ? 'show' : '']">
      <div class="brand">📘 Absensi Admin</div>
      <ul class="menu">
        <li class="active">🏠 Dashboard</li>
        <li>👩‍🎓 Data Siswa</li>
        <li>👨‍🏫 Data Guru</li>
        <li>📝 Absensi</li>
        <li>📊 Laporan</li>
        <li @click="logout" class="logout">🚪 Logout</li>
      </ul>
    </aside>

    <div v-if="sidebarOpen" class="overlay" @click="sidebarOpen=false"></div>

    <!-- MAIN -->
    <div class="main">
      <header class="navbar">
        <button class="menu-btn" @click="sidebarOpen=true">☰</button>
        <div class="navbar-right">
          <span>{{ admin.name }}</span>
          <div class="avatar">A</div>
        </div>
      </header>

      <main class="content">
        <h1>Dashboard</h1>

        <!-- STATS -->
        <div class="stats">
          <div class="card blue">👩‍🎓 <div><p>Total Siswa</p><h2>{{ siswa.length }}</h2></div></div>
          <div class="card green">👨‍🏫 <div><p>Total Guru</p><h2>{{ guruCount }}</h2></div></div>
        </div>

        <!-- TAMBAH SISWA -->
        <div class="box">
          <h3>➕ Tambah Siswa</h3>
          <div class="form">
            <input v-model="formSiswa.nis" placeholder="NIS">
            <input v-model="formSiswa.name" placeholder="Nama">
            <input v-model="formSiswa.class" placeholder="Kelas">
            <button @click="tambahSiswa">Simpan</button>
          </div>
        </div>

        <!-- TABLE SISWA -->
        <div class="box">
          <h3>📋 Data Siswa</h3>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>NIS</th>
                  <th>Nama</th>
                  <th>Kelas</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in siswa" :key="s.nis">
                  <td>{{ s.nis }}</td>
                  <td>{{ s.name }}</td>
                  <td>{{ s.class }}</td>
                  <td>{{ s.status || '-' }}</td>
                  <td>
                    <button class="delete" @click="hapusSiswa(s.nis)">Hapus</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- TAMBAH GURU -->
        <div class="box">
          <h3>➕ Tambah Guru</h3>
          <div class="form">
            <input v-model="formGuru.name" placeholder="Nama">
            <input v-model="formGuru.email" placeholder="Email">
            <input v-model="formGuru.password" placeholder="Password">
            <input v-model="formGuru.mapel" placeholder="Mapel">
            <button @click="tambahGuru">Simpan</button>
          </div>
        </div>

      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { useRouter } from 'vue-router'

const router = useRouter()
const API = 'https://backend-test-n4bo.vercel.app' // ⬅️ SESUAIKAN

const sidebarOpen = ref(false)
const siswa = ref([])
const guruCount = ref(0)

const admin = ref({
  name: localStorage.getItem('name') || 'Admin'
})

const token = localStorage.getItem('token')

const axiosAuth = axios.create({
  baseURL: API,
  headers: {
    Authorization: `Bearer ${token}`
  }
})

// ===== SISWA =====
const formSiswa = ref({ nis:'', name:'', class:'' })

const loadSiswa = async () => {
  const res = await axiosAuth.get('/students')
  siswa.value = res.data
}

const tambahSiswa = async () => {
  await axiosAuth.post('/students', formSiswa.value)
  formSiswa.value = { nis:'', name:'', class:'' }
  loadSiswa()
}

const hapusSiswa = async (nis) => {
  await axiosAuth.delete(`/students/${nis}`)
  loadSiswa()
}

// ===== GURU =====
const formGuru = ref({
  name:'',
  email:'',
  password:'',
  mapel:''
})

const tambahGuru = async () => {
  await axiosAuth.post('/teachers', formGuru.value)
  guruCount.value++
  formGuru.value = { name:'', email:'', password:'', mapel:'' }
}

// ===== LOGOUT =====
const logout = () => {
  localStorage.clear()
  router.push('/login')
}

onMounted(() => {
  loadSiswa()
})
</script>

<style scoped>
*{box-sizing:border-box;font-family:Segoe UI}
.layout{display:flex;min-height:100vh;background:#f4f6f9}
.sidebar{width:240px;background:#343a40;color:#c2c7d0;position:fixed;top:0;bottom:0;transform:translateX(-100%);transition:.3s;z-index:20}
.sidebar.show{transform:translateX(0)}
.brand{height:60px;display:flex;align-items:center;justify-content:center;background:#23272b;color:white}
.menu li{padding:12px;cursor:pointer}
.menu li.active,.menu li:hover{background:#495057;color:white}
.logout{color:#ff7675}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.4)}
.main{flex:1}
.navbar{height:56px;background:white;display:flex;justify-content:space-between;align-items:center;padding:0 15px}
.menu-btn{font-size:22px;background:none;border:none}
.avatar{background:#007bff;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center}
.content{padding:20px}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px}
.card{background:white;padding:15px;display:flex;gap:10px;border-left:5px solid}
.blue{border-color:#007bff}.green{border-color:#28a745}
.box{background:white;margin-top:20px;padding:15px}
.form{display:flex;gap:10px;flex-wrap:wrap}
.form input{padding:6px}
.form button{background:#007bff;color:white;border:none;padding:6px 10px}
table{width:100%;border-collapse:collapse;margin-top:10px}
th,td{padding:8px;border-top:1px solid #ddd}
.delete{background:#dc3545;color:white;border:none;padding:4px 8px}
@media(min-width:768px){
.sidebar{transform:translateX(0)}
.main{margin-left:240px}
.menu-btn{display:none}
}
</style>
