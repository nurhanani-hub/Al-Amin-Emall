/**
 * Seed HRMS Al-Amin Emall
 * Jana data dummy realistik untuk prototaip Fasa 1
 * Jalankan: bun run db:seed  atau  bun prisma/seed.ts
 */
import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'

const db = new PrismaClient()

// ----- Util -----
function hash(s: string) {
  // simulasi hash (Fasa 2 guna bcrypt)
  return 'sim$' + createHash('sha256').update(s).digest('hex').slice(0, 24)
}
function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}
function todayAt(h: number, m: number) {
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d
}
function dateOnly(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

// ----- Malay names pelbagai kaum -----
const MALE_MALAY_FIRST = ['Ahmad', 'Muhammad', 'Mohd', 'Nik', 'Abdul', 'Wan', 'Syed', 'Aiman', 'Fahmi', 'Hakim', 'Imran', 'Johan', 'Khairul', 'Luqman', 'Mazlan', 'Nizam', 'Rizal', 'Shahrul', 'Taufiq', 'Umar', 'Zulhanif']
const FEMALE_MALAY_FIRST = ['Siti', 'Nurul', 'Aishah', 'Fatimah', 'Nadia', 'Hajar', 'Khalila', 'Liyana', 'Murni', 'Noraishah', 'Putri', 'Rohana', 'Suraya', 'Tengku', 'Wan', 'Zaleha', 'Faridah', 'Damia', 'Erin', 'Farihah']
const CHINESE_FIRST = ['Wei', 'Hui', 'Mei', 'Jia', 'Xin', 'Yan', 'Lim', 'Tan', 'Lee', 'Wong', 'Chong', 'Goh', 'Yap', 'Tang', 'Foong']
const CHINESE_LAST = ['Tan', 'Lee', 'Lim', 'Wong', 'Goh', 'Chong', 'Yap', 'Tang', 'Ong', 'Chan']
const INDIAN_FIRST = ['Arjun', 'Kumar', 'Priya', 'Lakshmi', 'Raj', 'Deepa', 'Vinod', 'Suresh', 'Anand', 'Meena', 'Kavitha', 'Ravi', 'Shanti', 'Devi']
const INDIAN_LAST = ['Kumar', 'A/L Raman', 'A/P Subramaniam', 'Menon', 'Nair', 'Iyer', 'Pillai']
const MALAY_LAST = ['bin Ali', 'bin Rahman', 'bin Hassan', 'bin Yusof', 'bin Ibrahim', 'bin Ismail', 'bin Abdullah', 'binti Omar', 'binti Aziz', 'binti Salleh', 'binti Hashim', 'binti Razak', 'binti Mohamad', 'bin Che Awang', 'binti Othman']

function genName(i: number) {
  const r = i % 10
  if (r < 5) {
    // Melayu
    const male = i % 2 === 0
    const first = male ? pick(MALE_MALAY_FIRST) : pick(FEMALE_MALAY_FIRST)
    const last = male ? pick(MALAY_LAST).replace(/binti/g, 'bin').replace(/binti/g, 'bin') : pick(MALAY_LAST)
    return first + ' ' + last
  } else if (r < 8) {
    // Cina
    return pick(CHINESE_FIRST) + ' ' + pick(CHINESE_LAST)
  } else {
    // India
    return pick(INDIAN_FIRST) + ' ' + pick(INDIAN_LAST)
  }
}

const POSITIONS: Record<string, string[]> = {
  OPERASI: ['Eksekutif Operasi', 'Penyelia Gudang', 'Staf Operasi', 'Pembantu Logistik'],
  JUALAN: ['Eksekutif Jualan', 'Staf Jualan', 'Perunding Produk', 'Juruwang'],
  PEMASARAN: ['Eksekutif Pemasaran', 'Penulis Kandungan', 'Pereka Grafik', 'Staf Media Sosial'],
  KEWANGAN: ['Eksekutif Kewangan', 'Akauntan', 'Pembantu Akaun', 'Staf Bil'],
  SUMBER_MANUSIA: ['Pegawai HR', 'Pembantu HR', 'Eksekutif Latihan', 'Staf Rekrutmen'],
}

const SKILLS_POOL = [
  { name: 'Microsoft Excel', level: 0 },
  { name: 'Google Workspace', level: 0 },
  { name: 'Asas AI & Prompt', level: 0 },
  { name: 'Khidmat Pelanggan', level: 0 },
  { name: 'Pengurusan Inventori', level: 0 },
  { name: 'Pemasaran Digital', level: 0 },
  { name: 'Analitik Jualan', level: 0 },
  { name: 'Kepimpinan', level: 0 },
  { name: 'PDPA 2010', level: 0 },
  { name: 'Komunikasi Berkesan', level: 0 },
  { name: 'Pengurusan Masa', level: 0 },
  { name: 'Pengurusan Tekanan', level: 0 },
  { name: 'Bajet Jabatan', level: 0 },
]

const CAREER_GOALS = [
  'Menjadi ketua jabatan dalam 2 tahun',
  'Meningkatkan kemahiran analitik data',
  'Beralih ke peranan pengurusan produk',
  'Mendapatkan pensijilan profesional',
  'Memperluas kepakaran dalam e-dagang',
  'Meningkatkan keupayaan kepimpinan pasukan',
]

async function main() {
  console.log('🔄 Memulakan seed HRMS Al-Amin...')

  // Bersihkan data sedia ada
  await db.notification.deleteMany()
  await db.auditLog.deleteMany()
  await db.aiOutput.deleteMany()
  await db.message.deleteMany()
  await db.conversationParticipant.deleteMany()
  await db.conversation.deleteMany()
  await db.document.deleteMany()
  await db.calendarEventParticipants.deleteMany()
  await db.calendarEvent.deleteMany()
  await db.publicHoliday.deleteMany()
  await db.courseRegistration.deleteMany()
  await db.course.deleteMany()
  await db.kpi.deleteMany()
  await db.achievement.deleteMany()
  await db.task.deleteMany()
  await db.leaveBalance.deleteMany()
  await db.leave.deleteMany()
  await db.attendance.deleteMany()
  await db.staff.deleteMany()
  await db.department.deleteMany()
  await db.role.deleteMany()
  await db.setting.deleteMany()

  // ----- Roles -----
  const roleDefs = [
    { code: 'ADMIN', label: 'Pentadbir Sistem' },
    { code: 'HR', label: 'Pegawai HR' },
    { code: 'SUPERVISOR', label: 'Ketua Jabatan / Penyelia' },
    { code: 'STAFF', label: 'Staf' },
    { code: 'EXEC', label: 'Pengurusan Atasan' },
  ]
  const roles: Record<string, string> = {}
  for (const r of roleDefs) {
    const created = await db.role.create({ data: r })
    roles[r.code] = created.id
  }

  // ----- Departments -----
  const deptDefs = [
    { code: 'OPERASI', name: 'Operasi' },
    { code: 'JUALAN', name: 'Jualan' },
    { code: 'PEMASARAN', name: 'Pemasaran' },
    { code: 'KEWANGAN', name: 'Kewangan' },
    { code: 'SUMBER_MANUSIA', name: 'Sumber Manusia' },
  ]
  const depts: Record<string, string> = {}
  for (const d of deptDefs) {
    const created = await db.department.create({ data: { code: d.code, name: d.name } })
    depts[d.code] = created.id
  }

  // ----- Staff -----
  // Reka 30 staf: 1 admin, 2 HR, 1 exec (CEO), 5 penyelia (1 per dept), 21 staf
  const staffList: { id: string; name: string; email: string; roleCode: string; deptCode: string; position: string; supervisorId?: string }[] = []

  // Admin
  const admin = await db.staff.create({
    data: {
      staffNo: 'AAE-0001',
      name: 'Ahmad Faizal bin Rahman',
      email: 'admin@al-amin.my',
      password: hash('password'),
      roleCode: 'ADMIN',
      roleId: roles['ADMIN'],
      departmentId: depts['SUMBER_MANUSIA'],
      position: 'Pentadbir Sistem',
      phone: '+60123450001',
      joinDate: daysAgo(900),
      status: 'AKTIF',
      careerGoal: 'Membangunkan sistem HRMS yang bersepadu',
      skillsJson: JSON.stringify(SKILLS_POOL.slice(0, 6).map(s => ({ ...s, level: 5 }))),
    },
  })
  staffList.push({ id: admin.id, name: admin.name, email: admin.email, roleCode: 'ADMIN', deptCode: 'SUMBER_MANUSIA', position: admin.position })

  // Exec / CEO
  const ceo = await db.staff.create({
    data: {
      staffNo: 'AAE-0002',
      name: 'Dato\' Al-Amin bin Abdullah',
      email: 'ceo@al-amin.my',
      password: hash('password'),
      roleCode: 'EXEC',
      roleId: roles['EXEC'],
      departmentId: depts['OPERASI'],
      position: 'Ketua Pegawai Eksekutif',
      phone: '+60123450002',
      joinDate: daysAgo(2500),
      status: 'AKTIF',
      careerGoal: 'Mengembangkan perniagaan e-dagang serantau',
      skillsJson: JSON.stringify([{ name: 'Kepimpinan', level: 5 }, { name: 'Strategi', level: 5 }, { name: 'Pengurusan', level: 5 }]),
    },
  })
  staffList.push({ id: ceo.id, name: ceo.name, email: ceo.email, roleCode: 'EXEC', deptCode: 'OPERASI', position: ceo.position })

  // HR team (2)
  const hrHead = await db.staff.create({
    data: {
      staffNo: 'AAE-0003',
      name: 'Noraishah binti Othman',
      email: 'noraishah.hr@al-amin.my',
      password: hash('password'),
      roleCode: 'HR',
      roleId: roles['HR'],
      departmentId: depts['SUMBER_MANUSIA'],
      position: 'Pegawai HR',
      phone: '+60123450003',
      joinDate: daysAgo(1200),
      status: 'AKTIF',
      careerGoal: 'Memperkukuh budaya kerja dan penilaian prestasi',
      skillsJson: JSON.stringify([{ name: 'Pengurusan HR', level: 5 }, { name: 'Komunikasi Berkesan', level: 4 }, { name: 'PDPA 2010', level: 4 }]),
    },
  })
  staffList.push({ id: hrHead.id, name: hrHead.name, email: hrHead.email, roleCode: 'HR', deptCode: 'SUMBER_MANUSIA', position: hrHead.position })
  // Set sebagai ketua jabatan HR
  await db.department.update({ where: { id: depts['SUMBER_MANUSIA'] }, data: { headId: hrHead.id } })

  const hrStaff = await db.staff.create({
    data: {
      staffNo: 'AAE-0004',
      name: 'Liyana binti Hashim',
      email: 'liyana.hr@al-amin.my',
      password: hash('password'),
      roleCode: 'HR',
      roleId: roles['HR'],
      departmentId: depts['SUMBER_MANUSIA'],
      position: 'Eksekutif Latihan',
      phone: '+60123450004',
      joinDate: daysAgo(600),
      status: 'AKTIF',
      supervisorId: hrHead.id,
      careerGoal: 'Membangunkan program latihan berkesan',
      skillsJson: JSON.stringify([{ name: 'Pembangunan Latihan', level: 4 }, { name: 'Google Workspace', level: 4 }]),
    },
  })
  staffList.push({ id: hrStaff.id, name: hrStaff.name, email: hrStaff.email, roleCode: 'HR', deptCode: 'SUMBER_MANUSIA', position: hrStaff.position })

  // Penyelia untuk setiap jabatan lain + staf biasa
  let staffCounter = 5
  for (const deptCode of ['OPERASI', 'JUALAN', 'PEMASARAN', 'KEWANGAN']) {
    const supName = genName(staffCounter)
    const sup = await db.staff.create({
      data: {
        staffNo: `AAE-${String(staffCounter).padStart(4, '0')}`,
        name: supName,
        email: `${supName.toLowerCase().replace(/[^a-z]/g, '.').slice(0, 20)}.${staffCounter}@al-amin.my`,
        password: hash('password'),
        roleCode: 'SUPERVISOR',
        roleId: roles['SUPERVISOR'],
        departmentId: depts[deptCode],
        position: POSITIONS[deptCode][0],
        phone: `+6012345${String(staffCounter).padStart(4, '0')}`,
        joinDate: daysAgo(rand(500, 1500)),
        status: 'AKTIF',
        supervisorId: ceo.id,
        careerGoal: pick(CAREER_GOALS),
        skillsJson: JSON.stringify(SKILLS_POOL.slice(rand(0, 3), rand(5, 8)).map(s => ({ ...s, level: rand(3, 5) }))),
      },
    })
    staffList.push({ id: sup.id, name: sup.name, email: sup.email, roleCode: 'SUPERVISOR', deptCode, position: sup.position })
    await db.department.update({ where: { id: depts[deptCode] }, data: { headId: sup.id } })
    staffCounter++

    // 4-5 staf biasa setiap jabatan
    const n = deptCode === 'OPERASI' ? 6 : 5
    for (let k = 0; k < n; k++) {
      const name = genName(staffCounter)
      const st = await db.staff.create({
        data: {
          staffNo: `AAE-${String(staffCounter).padStart(4, '0')}`,
          name,
          email: `${name.toLowerCase().replace(/[^a-z]/g, '.').slice(0, 20)}.${staffCounter}@al-amin.my`,
          password: hash('password'),
          roleCode: 'STAFF',
          roleId: roles['STAFF'],
          departmentId: depts[deptCode],
          position: pick(POSITIONS[deptCode].slice(1)),
          phone: `+6012345${String(staffCounter).padStart(4, '0')}`,
          joinDate: daysAgo(rand(60, 900)),
          status: 'AKTIF',
          supervisorId: sup.id,
          careerGoal: pick(CAREER_GOALS),
          skillsJson: JSON.stringify(SKILLS_POOL.slice(rand(0, 2), rand(4, 7)).map(s => ({ ...s, level: rand(1, 4) }))),
        },
      })
      staffList.push({ id: st.id, name: st.name, email: st.email, roleCode: 'STAFF', deptCode, position: st.position })
      staffCounter++
    }
  }
  // Tambah staf dalam HR dept juga
  for (let k = 0; k < 2; k++) {
    const name = genName(staffCounter)
    const st = await db.staff.create({
      data: {
        staffNo: `AAE-${String(staffCounter).padStart(4, '0')}`,
        name,
        email: `${name.toLowerCase().replace(/[^a-z]/g, '.').slice(0, 20)}.${staffCounter}@al-amin.my`,
        password: hash('password'),
        roleCode: 'STAFF',
        roleId: roles['STAFF'],
        departmentId: depts['SUMBER_MANUSIA'],
        position: pick(POSITIONS['SUMBER_MANUSIA'].slice(1)),
        phone: `+6012345${String(staffCounter).padStart(4, '0')}`,
        joinDate: daysAgo(rand(120, 800)),
        status: 'AKTIF',
        supervisorId: hrHead.id,
        careerGoal: pick(CAREER_GOALS),
        skillsJson: JSON.stringify(SKILLS_POOL.slice(rand(0, 2), rand(4, 7)).map(s => ({ ...s, level: rand(1, 4) }))),
      },
    })
    staffList.push({ id: st.id, name: st.name, email: st.email, roleCode: 'STAFF', deptCode: 'SUMBER_MANUSIA', position: st.position })
    staffCounter++
  }

  console.log(`✅ ${staffList.length} staf dicipta`)

  // ----- Public Holidays 2025/2026 (Persekutuan + Selangor) -----
  const holidays = [
    { name: 'Tahun Baru', date: new Date('2026-01-01'), type: 'PERSEKUTUAN', state: null },
    { name: 'Hari Thaipusam', date: new Date('2026-01-26'), type: 'NEGERI_SELANGOR', state: 'Selangor' },
    { name: 'Hari Wilayah', date: new Date('2026-02-01'), type: 'PERSEKUTUAN', state: null },
    { name: 'Tahun Baru Cina', date: new Date('2026-02-17'), type: 'PERSEKUTUAN', state: null },
    { name: 'Hari Buruh', date: new Date('2026-05-01'), type: 'PERSEKUTUAN', state: null },
    { name: 'Hari Wesak', date: new Date('2026-05-31'), type: 'PERSEKUTUAN', state: null },
    { name: 'Hari Keputeraan YDP Agong', date: new Date('2026-06-03'), type: 'PERSEKUTUAN', state: null },
    { name: 'Hari Raya Aidiladha', date: new Date('2026-06-19'), type: 'PERSEKUTUAN', state: null },
    { name: 'Hari Kebangsaan', date: new Date('2026-08-31'), type: 'PERSEKUTUAN', state: null },
    { name: 'Hari Malaysia', date: new Date('2026-09-16'), type: 'PERSEKUTUAN', state: null },
    { name: 'Hari Deepavali', date: new Date('2026-10-26'), type: 'PERSEKUTUAN', state: null },
    { name: 'Hari Krismas', date: new Date('2026-12-25'), type: 'PERSEKUTUAN', state: null },
  ]
  for (const h of holidays) {
    await db.publicHoliday.create({ data: h })
  }

  // ----- Leave balances for all staff -----
  for (const s of staffList) {
    await db.leaveBalance.createMany({
      data: [
        { staffId: s.id, type: 'TAHUNAN', balance: rand(8, 14), year: 2026 },
        { staffId: s.id, type: 'SAKIT', balance: rand(7, 14), year: 2026 },
        { staffId: s.id, type: 'KECEMASAN', balance: 3, year: 2026 },
        { staffId: s.id, type: 'BERSALIN_PATERNITI', balance: 0, year: 2026 },
      ],
    })
  }

  // ----- Attendance: 3 bulan (90 hari) untuk semua staf -----
  console.log('🔄 Menjana kehadiran 90 hari...')
  const startClock = performance.now()
  const attRecords: any[] = []
  for (const s of staffList) {
    if (s.roleCode === 'ADMIN') continue // admin tidak wajib clock
    for (let d = 90; d >= 0; d--) {
      const day = daysAgo(d)
      const dow = day.getDay()
      if (dow === 0 || dow === 6) continue // hujung minggu
      // Skip jika cuti umum
      const isHoliday = holidays.some(h => dateOnly(h.date).getTime() === dateOnly(day).getTime())
      if (isHoliday) {
        attRecords.push({
          staffId: s.id, date: dateOnly(day), status: 'CUTI_UMUM', workMins: 0,
        })
        continue
      }
      // 92% hadir, 5% terlambat, 3% tidak hadir (cuti)
      const r = Math.random()
      if (r < 0.03) {
        attRecords.push({ staffId: s.id, date: dateOnly(day), status: 'CUTI', workMins: 0 })
        continue
      }
      const late = r < 0.08
      const inH = 9, inM = late ? rand(10, 35) : rand(0, 9)
      const outH = rand(17, 18), outM = rand(0, 45)
      const cin = todayAt(0, 0)
      cin.setDate(day.getDate()); cin.setHours(inH, inM)
      const cout = todayAt(0, 0)
      cout.setDate(day.getDate()); cout.setHours(outH, outM)
      const workMins = Math.max(0, Math.round((cout.getTime() - cin.getTime()) / 60000) - 60)
      const overtimeMins = outH >= 18 ? rand(15, 90) : 0
      attRecords.push({
        staffId: s.id,
        date: dateOnly(day),
        clockIn: cin,
        clockOut: cout,
        workMins,
        overtimeMins,
        lateMins: late ? inM - 0 : 0,
        status: late ? 'TERLAMBAT' : 'HADIR',
        location: 'Pejabat Al-Amin Emall, Shah Alam',
      })
    }
  }
  // Batch insert
  for (let i = 0; i < attRecords.length; i += 500) {
    await db.attendance.createMany({ data: attRecords.slice(i, i + 500) })
  }
  console.log(`✅ ${attRecords.length} rekod kehadiran`)

  // ----- Leave applications -----
  const leaveTypes = ['TAHUNAN', 'SAKIT', 'KECEMASAN']
  const supervisors = staffList.filter(s => s.roleCode === 'SUPERVISOR' || s.roleCode === 'HR' || s.roleCode === 'EXEC')
  for (let i = 0; i < 25; i++) {
    const s = pick(staffList.filter(x => x.roleCode === 'STAFF'))
    if (!s) continue
    const startD = daysAgo(rand(1, 80))
    const days = rand(1, 3)
    const endD = new Date(startD)
    endD.setDate(endD.getDate() + days - 1)
    const type = pick(leaveTypes)
    const appr = pick(supervisors)
    const status = Math.random() < 0.7 ? 'LULUS' : (Math.random() < 0.5 ? 'DIMOHON' : 'DITOLAK')
    await db.leave.create({
      data: {
        staffId: s.id,
        type,
        startDate: startD,
        endDate: endD,
        days,
        reason: type === 'SAKIT' ? 'Demam selsema' : (type === 'KECEMASAN' ? 'Urusan keluarga kecemasan' : 'Cuti peribadi'),
        status,
        approverId: status !== 'DIMOHON' ? appr.id : null,
        approvedAt: status !== 'DIMOHON' ? daysAgo(rand(0, 5)) : null,
      },
    })
  }

  // ----- Tasks: 40 tugasan -----
  console.log('🔄 Menjana tugasan...')
  const taskTitles = [
    'Sediakan laporan jualan bulanan',
    'Kemas kini inventori gudang',
    'Semak kandungan kempen pemasaran Q1',
    'Tutup akaun bulan semasa',
    'Susun borang permohonan cuti',
    'Jalankan ujian mesin POS',
    'Semak balas maklum pelanggan e-dagang',
    'Pindahkan stok baharu ke rak',
    'Rekabentuk banner promosi Raya',
    'Audit kewangan Q2',
    'Onboard staf baharu',
    'Sediakan minit mesyuarat mingguan',
    'Kemaskini harga produk laman web',
    'Sahkan pesanan penghantaran hari ini',
    'Sediakan sijil latihan staf',
    'Bandingkan prestasi vendor logistik',
    'Luluskan permohonan kursus staf',
    'Sediakan polisi kerja jarak jauh',
    'Susun atur bilik mesyuarat',
    'Semak pematuhan PDPA',
    'Kumpul maklum balas latihan AI',
    'Tampal pengumuman hari raya',
    'Semak penyata bank bulanan',
    'Sediakan belanjawan jabatan 2026',
    'Kemaskini direktori staf',
    'Pindahkan fail kontrak vendor',
    'Selia perhimpunan bulanan',
    'Sediakan sasaran KPI Q3',
    'Semak rekod kehadiran suspek',
    'Hantar e-mel penghargaan staf',
    'Kemas kini papan capaian',
    'Pindahkan dokumen ke sistem baharu',
    'Semak laporan eksekutif',
    'Susun latihan orientasi baharu',
    'Buat penilaian prestasi tahunan',
    'Tapis resume jawatan kosong',
    'Sedia laporan trend kehadiran',
    'Audit tag produk e-dagang',
    'Kemaskini senarai harga pembekal',
    'Selia penghantaran pesanan besar',
  ]
  const priorities = ['RENDAH', 'SEDERHANA', 'TINGGI', 'KRITIKAL']
  const statuses = ['BELUM_MULA', 'DALAM_PROSES', 'SEMAKAN', 'SELESAI']
  const allAssigners = staffList.filter(s => s.roleCode === 'SUPERVISOR' || s.roleCode === 'HR' || s.roleCode === 'EXEC')
  const allAssignees = staffList.filter(s => s.roleCode === 'STAFF')
  for (let i = 0; i < 40; i++) {
    const title = taskTitles[i % taskTitles.length]
    const assignee = pick(allAssignees)
    const assigner = pick(allAssigners)
    const st = pick(statuses)
    const dueOffset = rand(-15, 25) // beberapa lewat, beberapa akan datang
    const due = daysAgo(dueOffset)
    const progress = st === 'SELESAI' ? 100 : (st === 'SEMAKAN' ? rand(70, 95) : (st === 'DALAM_PROSES' ? rand(20, 70) : 0))
    await db.task.create({
      data: {
        title,
        description: `Tugasan: ${title}. Sila selesaikan sebelum tarikh akhir dan kemas kini kemajuan secara berkala.`,
        assigneeId: assignee.id,
        assignerId: assigner.id,
        priority: pick(priorities),
        status: st,
        progress,
        dueDate: due,
        completedAt: st === 'SELESAI' ? daysAgo(rand(0, 10)) : null,
        comments: JSON.stringify([]),
        attachments: JSON.stringify([]),
      },
    })
  }

  // ----- Calendar events (mesyuarat 12) -----
  const events = [
    { title: 'Mesyuarat Pengurusan Mingguan', type: 'MESYUARAT', startH: 10, dur: 60 },
    { title: 'Mesyuarat Jualan & Operasi', type: 'MESYUARAT', startH: 14, dur: 90 },
    { title: 'Mesyuarat HR & Latihan', type: 'MESYUARAT', startH: 9, dur: 60 },
    { title: 'Taklimat Produk Baharu', type: 'MESYUARAT', startH: 11, dur: 60 },
    { title: 'Sesi Latihan Khidmat Pelanggan', type: 'LATIHAN', startH: 9, dur: 180 },
    { title: 'Bengkel Excel Lanjutan', type: 'LATIHAN', startH: 14, dur: 240 },
    { title: 'Mesyuarat Penilaian Prestasi', type: 'MESYUARAT', startH: 15, dur: 60 },
    { title: 'Townhall Syarikhat Suku Tahunan', type: 'MESYUARAT', startH: 10, dur: 120 },
    { title: 'Mesyuarat Kewangan Q3', type: 'MESYUARAT', startH: 9, dur: 90 },
    { title: 'Taklimat PDPA & Keselamatan', type: 'LATIHAN', startH: 10, dur: 120 },
    { title: 'Mesyuarat Pemasaran Khas', type: 'MESYUARAT', startH: 13, dur: 60 },
    { title: 'Perhimpunan Bulanan', type: 'MESYUARAT', startH: 8, dur: 60 },
  ]
  for (let i = 0; i < events.length; i++) {
    const e = events[i]
    const day = daysAgo(rand(0, 30))
    const start = todayAt(e.startH, 0)
    start.setDate(day.getDate())
    const end = new Date(start)
    end.setMinutes(end.getMinutes() + e.dur)
    const org = pick(allAssigners)
    const parts = allAssignees.slice(rand(0, 3), rand(6, 12)).map(s => s.id)
    const ev = await db.calendarEvent.create({
      data: {
        title: e.title,
        type: e.type,
        start,
        end,
        location: 'Bilik Mesyuarat Al-Amin, Aras 3',
        agenda: `Agenda:\n1. Pengesahan minit lepas\n2. Kemas kini status\n3. Perbincangan isu\n4. Tindakan susulan`,
        organizerId: org.id,
      },
    })
    for (const pid of parts) {
      await db.calendarEventParticipants.create({ data: { eventId: ev.id, staffId: pid } })
    }
  }

  // ----- Courses: 12 kursus -----
  console.log('🔄 Menjana kursus...')
  const courseDefs = [
    { code: 'CRS-001', title: 'Microsoft Excel Lanjutan', category: 'Kemahiran Digital', method: 'FIZIKAL', dur: 16, skills: ['Microsoft Excel'], target: ['STAFF', 'SUPERVISOR'] },
    { code: 'CRS-002', title: 'Google Workspace untuk Produktiviti', category: 'Kemahiran Digital', method: 'DALAM_TALIAN', dur: 8, skills: ['Google Workspace'], target: ['STAFF'] },
    { code: 'CRS-003', title: 'Asas AI & Prompt untuk Kerja', category: 'Kemahiran Digital', method: 'DALAM_TALIAN', dur: 6, skills: ['Asas AI & Prompt'], target: ['STAFF', 'SUPERVISOR', 'HR'] },
    { code: 'CRS-004', title: 'Khidmat Pelanggan E-Dagang', category: 'Perkhidmatan Pelanggan', method: 'FIZIKAL', dur: 8, skills: ['Khidmat Pelanggan'], target: ['STAFF'] },
    { code: 'CRS-005', title: 'Pengendalian Aduan Pelanggan', category: 'Perkhidmatan Pelanggan', method: 'FIZIKAL', dur: 6, skills: ['Khidmat Pelanggan', 'Komunikasi Berkesan'], target: ['STAFF'] },
    { code: 'CRS-006', title: 'Pengurusan Inventori & Logistik', category: 'E-Dagang dan Jualan', method: 'FIZIKAL', dur: 12, skills: ['Pengurusan Inventori'], target: ['STAFF'] },
    { code: 'CRS-007', title: 'Pemasaran Digital Asas', category: 'E-Dagang dan Jualan', method: 'DALAM_TALIAN', dur: 10, skills: ['Pemasaran Digital'], target: ['STAFF'] },
    { code: 'CRS-008', title: 'Analitik Jualan Lanjutan', category: 'E-Dagang dan Jualan', method: 'DALAM_TALIAN', dur: 8, skills: ['Analitik Jualan'], target: ['SUPERVISOR'] },
    { code: 'CRS-009', title: 'Asas Penyeliaan & Kepimpinan', category: 'Kepimpinan', method: 'FIZIKAL', dur: 16, skills: ['Kepimpinan'], target: ['SUPERVISOR'] },
    { code: 'CRS-010', title: 'Pematuhan PDPA 2010', category: 'Pematuhan dan Keselamatan', method: 'DALAM_TALIAN', dur: 4, skills: ['PDPA 2010'], target: ['STAFF', 'HR', 'SUPERVISOR'] },
    { code: 'CRS-011', title: 'Komunikasi Berkesan & Pengurusan Masa', category: 'Kemahiran Insaniah', method: 'FIZIKAL', dur: 8, skills: ['Komunikasi Berkesan', 'Pengurusan Masa'], target: ['STAFF'] },
    { code: 'CRS-012', title: 'Bajet Jabatan & Asas Perakaunan', category: 'Kewangan Asas', method: 'FIZIKAL', dur: 10, skills: ['Bajet Jabatan'], target: ['SUPERVISOR', 'EXEC'] },
  ]
  for (const c of courseDefs) {
    const startDate = daysAgo(rand(-30, 60)) // beberapa lepas, beberapa akan datang
    const endD = new Date(startDate)
    endD.setDate(endD.getDate() + Math.ceil(c.dur / 8))
    const status = startDate.getTime() < Date.now() ? 'SELESAI' : 'BERJALAN'
    await db.course.create({
      data: {
        code: c.code,
        title: c.title,
        description: `Kursus ${c.category}: ${c.title}. Sesuai untuk memperkukuh kemahiran ${c.skills.join(', ')}.`,
        category: c.category,
        provider: 'Pusat Latihan Al-Amin',
        method: c.method,
        quota: 25,
        durationHrs: c.dur,
        startDate,
        endDate: endD,
        skillsJson: JSON.stringify(c.skills),
        targetRoles: JSON.stringify(c.target),
        price: 350,
        status,
      },
    })
  }

  // ----- Course registrations: 60 -----
  const courses = await db.course.findMany()
  const staffForReg = staffList.filter(s => s.roleCode === 'STAFF' || s.roleCode === 'SUPERVISOR')
  for (let i = 0; i < 60; i++) {
    const c = pick(courses)
    const s = pick(staffForReg)
    const courseStart = c.startDate.getTime()
    const isPast = courseStart < Date.now()
    let status = 'DIMOHON'
    let attended: string | null = null
    let score: number | null = null
    let pass: boolean | null = null
    if (isPast) {
      status = 'LULUS'
      attended = Math.random() < 0.85 ? 'HADIR' : 'TIDAK_HADIR'
      if (attended === 'HADIR') {
        score = rand(60, 95)
        pass = score >= 50
      }
    } else {
      status = Math.random() < 0.7 ? 'LULUS' : 'DIMOHON'
    }
    // avoid duplicates
    const exists = await db.courseRegistration.findFirst({ where: { courseId: c.id, staffId: s.id } })
    if (exists) continue
    await db.courseRegistration.create({
      data: {
        courseId: c.id,
        staffId: s.id,
        status,
        attended,
        score,
        pass,
        feedback: attended === 'HADIR' ? pick(['Sangat membantu', 'Penceramah bagus', 'Perlu lebih masa praktikal', 'Kandungan relevan']) : null,
        approvedAt: status === 'LULUS' ? daysAgo(rand(1, 20)) : null,
      },
    })
  }

  // ----- Achievements: ~50 -----
  const achTitles = [
    { t: 'Anugerah Staf Cemerlang Bulanan', c: 'ANUGERAH', pts: 30 },
    { t: 'Sasaran Jualan Q1 Tercapai', c: 'SASARAN', pts: 25 },
    { t: 'Sijil Penyeliaan Lanjutan', c: 'SIJIL', pts: 15 },
    { t: 'Projek Penghijauan Pejabat Selesai', c: 'PROJEK', pts: 20 },
    { t: 'Anugerah Khidmat Pelanggan Terbaik', c: 'ANUGERAH', pts: 30 },
    { t: 'Sijil PDPA 2010', c: 'SIJIL', pts: 10 },
    { t: 'Projek Automasi Inventori', c: 'PROJEK', pts: 25 },
    { t: 'Sasaran Latihan Tahunan Tercapai', c: 'SASARAN', pts: 15 },
    { t: 'Penghargaan Inovasi Proses', c: 'ANUGERAH', pts: 25 },
    { t: 'Sijil Excel Lanjutan', c: 'SIJIL', pts: 10 },
  ]
  for (let i = 0; i < 50; i++) {
    const s = pick(staffForReg)
    const a = pick(achTitles)
    const giver = pick(allAssigners)
    await db.achievement.create({
      data: {
        staffId: s.id,
        title: a.t,
        category: a.c,
        date: daysAgo(rand(10, 200)),
        giverId: giver.id,
        points: a.pts,
        badge: a.c === 'ANUGERAH' ? 'lencana-emas' : (a.c === 'SIJIL' ? 'lencana-perak' : 'lencana-gangsa'),
        note: `Diiktiraf atas: ${a.t}`,
      },
    })
  }

  // ----- KPIs (SULIT) -----
  for (const s of staffList.filter(x => x.roleCode === 'STAFF' || x.roleCode === 'SUPERVISOR')) {
    const kpis = [
      { indicator: 'Produktiviti Tugasan', weight: 0.3, target: 90 },
      { indicator: 'Kehadiran', weight: 0.2, target: 95 },
      { indicator: 'Kualiti Kerja', weight: 0.3, target: 85 },
      { indicator: 'Penyertaan Latihan', weight: 0.2, target: 80 },
    ]
    let weightedSum = 0
    for (const k of kpis) {
      const actual = rand(60, 100)
      const score = Math.min(100, Math.round((actual / k.target) * 100))
      weightedSum += score * k.weight
      await db.kpi.create({
        data: {
          staffId: s.id,
          period: '2026-Q2',
          indicator: k.indicator,
          weight: k.weight,
          target: k.target,
          actual,
          score,
          finalScore: null,
          assessorId: s.supervisorId,
          accessLevel: 'STAFF_SUPERVISOR_HR',
        },
      })
    }
    // final score simpan pada rekod pertama
    const first = await db.kpi.findFirst({ where: { staffId: s.id, period: '2026-Q2' } })
    if (first) {
      await db.kpi.update({ where: { id: first.id }, data: { finalScore: Math.round(weightedSum) } })
    }
  }

  // ----- Conversations & Messages -----
  console.log('🔄 Menjana perbualan & mesej...')
  // 3 kumpulan + beberapa direct
  const grpDefs = [
    { name: 'Pengumuman Syarikhat Al-Amin', type: 'PENGUMUMAN', members: staffList.map(s => s.id) },
    { name: 'Jabatan Operasi', type: 'KUMPULAN', members: staffList.filter(s => s.deptCode === 'OPERASI').map(s => s.id) },
    { name: 'Pasukan Projek E-Dagang', type: 'KUMPULAN', members: staffList.filter(s => ['JUALAN', 'PEMASARAN', 'OPERASI'].includes(s.deptCode)).slice(0, 12).map(s => s.id) },
  ]
  const msgTemplates = [
    'Salam semua, selamat pagi!',
    'Boleh update status tugasan terkini?',
    'Mesej ini dijana untuk uji prototaip.',
    'Terima kasih atas kerjasama.',
    'Saya akan hantar laporan selepas ini.',
    'Mesyuarat ditunda ke pukul 3 petang.',
    'Nota mesyuarat sudah dimuat naik ke sistem.',
    'Sila semak e-mel untuk detail lanjut.',
    'Stok baharu sudah sampai di gudang.',
    'Bagus, teruskan usaha!',
    'Ada cadangan untuk penambahbaikan?',
    'Saya setuju dengan cadangan tersebut.',
    'Mohon kemaskini rekod kehadiran.',
    'Penghantaran pesanan hari ini lancar.',
    'Sila hadiri taklimat esok pukul 10.',
  ]
  let totalMsgs = 0
  for (const g of grpDefs) {
    const conv = await db.conversation.create({ data: { type: g.type, name: g.name } })
    let isAdmin = true
    for (const mid of g.members) {
      await db.conversationParticipant.create({ data: { conversationId: conv.id, staffId: mid, isAdmin: g.type === 'PENGUMUMAN' ? (isAdmin ? true : false) : (mid === g.members[0]) } })
      isAdmin = false
    }
    // 60-80 messages
    const nMsg = rand(60, 80)
    for (let i = 0; i < nMsg; i++) {
      const sender = pick(g.members)
      // for PENGUMUMAN only admin sends
      const actualSender = g.type === 'PENGUMUMAN' ? g.members[0] : sender
      await db.message.create({
        data: {
          conversationId: conv.id,
          senderId: actualSender,
          content: pick(msgTemplates),
          attachments: JSON.stringify([]),
          createdAt: new Date(daysAgo(rand(0, 30)).getTime() - rand(0, 3600 * 1000 * 8)),
        },
      })
      totalMsgs++
    }
  }
  // Direct conversations - 5 pairs
  for (let i = 0; i < 5; i++) {
    const a = pick(staffList)
    let b = pick(staffList)
    while (b.id === a.id) b = pick(staffList)
    const conv = await db.conversation.create({ data: { type: 'TERUS', name: null } })
    await db.conversationParticipant.createMany({ data: [{ conversationId: conv.id, staffId: a.id }, { conversationId: conv.id, staffId: b.id }] })
    for (let k = 0; k < 10; k++) {
      const sender = k % 2 === 0 ? a : b
      await db.message.create({
        data: {
          conversationId: conv.id,
          senderId: sender.id,
          content: pick(msgTemplates),
          attachments: JSON.stringify([]),
          createdAt: daysAgo(rand(0, 20)),
        },
      })
      totalMsgs++
    }
  }
  console.log(`✅ ${totalMsgs} mesej`)

  // ----- Documents: 15 -----
  const docDefs = [
    { title: 'Minit Mesyuarat Pengurusan Nov 2026', type: 'LAPORAN', fileName: 'minit-mesy-2026-11.pdf', size: 240000, mime: 'application/pdf', tags: ['mesyuarat', 'pengurusan'], access: 'SYARIKAT' },
    { title: 'Polisi Kehadiran Al-Amin v2', type: 'TEKS', fileName: 'polisi-kehadiran-v2.pdf', size: 180000, mime: 'application/pdf', tags: ['polisi', 'kehadiran'], access: 'SYARIKAT' },
    { title: 'Slaid Taklimat PDPA 2010', type: 'SLAID', fileName: 'slaid-pdpa-2026.pptx', size: 1200000, mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', tags: ['pdpa', 'latihan'], access: 'SYARIKAT' },
    { title: 'Audio Mesyuarat Townhall Q3', type: 'AUDIO', fileName: 'audio-townhall-q3.mp3', size: 4500000, mime: 'audio/mpeg', tags: ['audio', 'townhall'], access: 'SYARIKAT' },
    { title: 'Laporan Jualan Oktober 2026', type: 'LAPORAN', fileName: 'laporan-jualan-2026-10.xlsx', size: 98000, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', tags: ['jualan', 'laporan'], access: 'JABATAN' },
    { title: 'Polisi Cuti Tahunan', type: 'TEKS', fileName: 'polisi-cuti-tahunan.pdf', size: 90000, mime: 'application/pdf', tags: ['polisi', 'cuti'], access: 'SYARIKAT' },
    { title: 'Senarai Semak Staf Baharu', type: 'TEKS', fileName: 'senarai-semak-staf-baharu.docx', size: 64000, mime: 'application/msword', tags: ['onboarding', 'checklist'], access: 'JABATAN' },
    { title: 'Slaid Latihan Khidmat Pelanggan', type: 'SLAID', fileName: 'latihan-khidmat-pelanggan.pdf', size: 2200000, mime: 'application/pdf', tags: ['latihan', 'pelanggan'], access: 'SYARIKAT' },
    { title: 'Borang Penilaian Prestasi 2026', type: 'TEKS', fileName: 'borang-penilaian-prestasi-2026.pdf', size: 120000, mime: 'application/pdf', tags: ['penilaian', 'kpi'], access: 'PERIBADI' },
    { title: 'Audio Mesyuarat HR November', type: 'AUDIO', fileName: 'audio-hr-nov.m4a', size: 3200000, mime: 'audio/mp4', tags: ['audio', 'hr'], access: 'JABATAN' },
    { title: 'Pengumuman Hari Raya Aidilfitri', type: 'TEKS', fileName: 'pengumuman-raya-2026.pdf', size: 75000, mime: 'application/pdf', tags: ['pengumuman', 'raya'], access: 'SYARIKAT' },
    { title: 'Slaid Strategi Pemasaran Q4', type: 'SLAID', fileName: 'strategi-pemasaran-q4.pptx', size: 1800000, mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', tags: ['pemasaran', 'strategi'], access: 'JABATAN' },
    { title: 'Minit Mesyuarat Jualan Mingguan', type: 'LAPORAN', fileName: 'minit-jualan-mingguan.docx', size: 88000, mime: 'application/msword', tags: ['mesyuarat', 'jualan'], access: 'JABATAN' },
    { title: 'Laporan Kewangan September', type: 'LAPORAN', fileName: 'laporan-kew-2026-09.xlsx', size: 156000, mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', tags: ['kewangan', 'laporan'], access: 'PERIBADI' },
    { title: 'Buku Panduan Staf Al-Amin', type: 'TEKS', fileName: 'buku-panduan-staf.pdf', size: 540000, mime: 'application/pdf', tags: ['panduan', 'onboarding'], access: 'SYARIKAT' },
  ]
  for (let i = 0; i < docDefs.length; i++) {
    const d = docDefs[i]
    const uploader = pick(staffList)
    await db.document.create({
      data: {
        title: d.title,
        type: d.type,
        fileName: d.fileName,
        fileSize: d.size,
        mimeType: d.mime,
        dataUrl: null,
        tags: JSON.stringify(d.tags),
        accessLevel: d.access,
        uploaderId: uploader.id,
      },
    })
  }

  // ----- Settings -----
  await db.setting.createMany({
    data: [
      { key: 'bahasa', value: 'BM' },
      { key: 'timezone', value: 'Asia/Kuala_Lumpur' },
      { key: 'dateFormat', value: 'DD/MM/YYYY' },
      { key: 'currency', value: 'RM' },
      { key: 'docQuotaGB', value: '10' },
      { key: 'maxFileMB', value: '100' },
      { key: 'workStart', value: '09:00' },
      { key: 'workEnd', value: '18:00' },
      { key: 'weeklyMaxHours', value: '48' },
      { key: 'companyName', value: 'Al-Amin Emall Sdn Bhd' },
    ],
  })

  // ----- Audit logs -----
  await db.auditLog.createMany({
    data: [
      { actorId: admin.id, action: 'LOG_MASUK', detail: 'Pentadbir log masuk pertama' },
      { actorId: hrHead.id, action: 'LULUS_CUTI', detail: 'Meluluskan permohonan cuti staf' },
      { actorId: admin.id, action: 'KEMASKINI_TETAPAN', detail: 'Konfigurasi cuti umum Selangor' },
    ],
  })

  console.log(`✅ Seed selesai dalam ${Math.round(performance.now() - startClock)}ms`)
  console.log('ℹ️  Log masuk demo:')
  console.log('   admin@al-amin.my / password   (Pentadbir)')
  console.log('   noraishah.hr@al-amin.my / password (HR)')
  console.log('   ceo@al-amin.my / password (Pengurusan Atasan)')
  console.log('   mana-mana staf lain / password')
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await db.$disconnect()
    process.exit(1)
  })
