import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import ZAI from 'z-ai-web-dev-sdk'

async function getZai() {
  return await ZAI.create()
}

async function saveOutput(userId: string, type: string, input: string, output: string) {
  return await db.aiOutput.create({ data: { userId, type, input, output, reviewed: false } })
}

// GET - sejarah output AI pengguna
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const outputs = await db.aiOutput.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })
  return NextResponse.json({ outputs })
}

// POST - pelbagai aksi AI
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Tidak log masuk' }, { status: 401 })
  const body = await req.json()
  const { action } = body

  try {
    const zai = await getZai()

    // ===== FR-1001: Penjana Bahan HR =====
    if (action === 'GENERATE_HR_MATERIAL') {
      const { materialType, language, context } = body
      // materialType: surat_tawaran, surat_amaran, memo, polisi, perihal_tugas, skrip_orientasi
      const typeLabels: Record<string, string> = {
        surat_tawaran: 'surat tawaran kerja',
        surat_amaran: 'surat amaran',
        memo: 'memo dalaman',
        polisi: 'draf polisi',
        perihal_tugas: 'perihal tugas (job description)',
        skrip_orientasi: 'skrip orientasi staf baharu',
      }
      const langLabel = language === 'EN' ? 'English' : 'Bahasa Malaysia'
      const prompt = `Anda adalah pembantu HR untuk Al-Amin Emall Sdn Bhd, sebuah syarikat e-dagang di Shah Alam, Malaysia.
Tugas: Jana ${typeLabels[materialType] ?? 'dokumen HR'} dalam ${langLabel}.
Konteks tambahan: ${context ?? '(tiada)'}
Syarat:
- Gunakan format profesional yang sesuai untuk Malaysia
- Sertakan tajuk, ruang tarikh, dan tandatangan jika berkenaan
- Padankan dengan Akta Kerja 1955 dan PDPA 2010 jika relevan
- Jangan sertakan data peribadi sebenar; gunakan ruang kosong [Nama], [Tarikh], dll
Output: hanya dokumen, dalam Markdown.`
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: 'Anda penulis dokumen HR profesional Malaysia.' },
          { role: 'user', content: prompt },
        ],
        thinking: { type: 'disabled' },
      })
      const output = completion.choices[0]?.message?.content ?? ''
      await saveOutput(session.id, 'BAHAN_HR', prompt, output)
      return NextResponse.json({ output, label: 'Dijana AI — perlu semakan manusia' })
    }

    // ===== FR-1002: Cadangan Kursus Peribadi =====
    if (action === 'RECOMMEND_COURSES') {
      const targetStaffId = body.staffId ?? session.id
      // Hak akses: sendiri, penyelia langsung, HR
      let canAccess = targetStaffId === session.id
      if (!canAccess && ['HR', 'ADMIN'].includes(session.roleCode)) canAccess = true
      if (!canAccess && session.roleCode === 'SUPERVISOR') {
        const sub = await db.staff.findFirst({ where: { id: targetStaffId, supervisorId: session.id } })
        canAccess = !!sub
      }
      if (!canAccess) return NextResponse.json({ error: 'Tiada akses kepada profil staf' }, { status: 403 })

      const staff = await db.staff.findUnique({
        where: { id: targetStaffId },
        include: { department: true },
      })
      if (!staff) return NextResponse.json({ error: 'Staf tidak dijumpai' }, { status: 404 })
      // Ambil kursus tersedia & sejarah pendaftaran
      const courses = await db.course.findMany({ where: { status: { in: ['DICADANG', 'BERJALAN'] } } })
      const myRegs = await db.courseRegistration.findMany({
        where: { staffId: targetStaffId },
        include: { course: true },
      })
      const skills = JSON.parse(staff.skillsJson || '[]')
      const takenCourseIds = new Set(myRegs.map(r => r.courseId))
      const available = courses.filter(c => !takenCourseIds.has(c.id))

      const prompt = `Anda pembantu HR untuk Al-Amin Emall. Berdasarkan profil staf dan katalog kursus, cadangkan 3-5 kursus paling sesuai dalam Bahasa Malaysia.

PROFIL STAF (dinamakan tanpa nama jika perlu):
- Jawatan: ${staff.position}
- Jabatan: ${staff.department?.name}
- Matlamat kerjaya: ${staff.careerGoal ?? 'tidak dinyatakan'}
- Kemahiran sedia ada (skala 1-5): ${skills.map((s: any) => `${s.name}=${s.level}`).join(', ') || 'tiada'}

KURSUS TERSEDIA:
${available.map(c => `- ID:${c.id} | ${c.title} | Kategori:${c.category} | Kemahiran:${c.skillsJson} | Sasaran:${c.targetRoles} | Mula:${new Date(c.startDate).toLocaleDateString('ms-MY')} | Tempoh:${c.durationHrs}j | Kaedah:${c.method}`).join('\n')}

Sejarah kursus diambil: ${myRegs.length ? myRegs.map(r => `${r.course.title} (${r.status})`).join(', ') : 'tiada'}

Output sebagai JSON array sahaja dengan format:
[{"courseId":"...","reason":"sebab cadangan dalam BM (skill gap / matlamat kerjaya)","priority":"Tinggi|Sederhana|Tahap"}]`
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: 'Anda penasihat pembangunan staf HR. Hantar JSON sahaja.' },
          { role: 'user', content: prompt },
        ],
        thinking: { type: 'disabled' },
      })
      const raw = completion.choices[0]?.message?.content ?? '[]'
      let recommendations: any[] = []
      try {
        const match = raw.match(/\[[\s\S]*\]/)
        recommendations = match ? JSON.parse(match[0]) : []
      } catch { recommendations = [] }
      // Gabung dengan maklumat kursus
      const enriched = recommendations.map(r => {
        const c = available.find(x => x.id === r.courseId)
        return c ? { ...r, course: c } : null
      }).filter(Boolean)
      await saveOutput(session.id, 'CADANGAN_KURSUS', `Staf ${staff.id}`, JSON.stringify(enriched))
      return NextResponse.json({ recommendations: enriched, raw })
    }

    // ===== FR-1003: Ringkasan Mesyuarat =====
    if (action === 'SUMMARIZE_MEETING') {
      const { notes, meetingTitle } = body
      if (!notes) return NextResponse.json({ error: 'Nota mesyuarat diperlukan' }, { status: 400 })
      const prompt = `Anda pembantu mesyuarat. Berdasarkan nota/transkrip mesyuarat berikut, sediakan dalam Bahasa Malaysia:

Mesyuarat: ${meetingTitle ?? 'Mesyuarat Al-Amin'}

Nota/Transkrip:
${notes}

Sila hasilkan:
1. **Ringkasan** - 3-5 ayat
2. **Keputusan Utama** - senarai bullet
3. **Senarai Tindakan** - jadual: Tindakan | Penanggungjawab | Tarikh Akhir (jika disebut)
4. **Isu Terbuka** - senarai
Format Markdown.`
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: 'Anda pembantu mesyuarat profesional Malaysia.' },
          { role: 'user', content: prompt },
        ],
        thinking: { type: 'disabled' },
      })
      const output = completion.choices[0]?.message?.content ?? ''
      await saveOutput(session.id, 'RINGKASAN_MESYUARAT', notes, output)
      return NextResponse.json({ output })
    }

    // ===== FR-1004: Chatbot Soal Jawab HR =====
    if (action === 'CHATBOT') {
      const { question, history } = body
      const policyContext = `Polisi HR Al-Amin Emall (ringkasan):
- Waktu kerja: Isnin-Jumaat 9:00-18:00, rehat 60 minit
- Cuti tahunan: 8-14 hari/tahun mengikut tempoh perkhidmatan (Akta Kerja 1955)
- Cuti sakit: 14 hari/tahun (perlu sijil MC jika >2 hari)
- Cuti kecemasan: 3 hari/tahun
- Cuti bersalin/paterniti: 60 hari (bersalin), 3 hari (paterniti)
- Kerja lebih masa: dibayar 1.5x (hari biasa), 2x (hujung minggu)
- Kehadiran: Clock In sebelum 9:05, Clock Out selepas 18:00
- PDPA 2010: data peribadi dilindungi, akses terhad
- Latihan: setiap staf digalakkan minima 40 jam latihan/tahun
- Kuota dokumen: 10 GB/staf`
      const messages: any[] = [
        { role: 'assistant', content: `Anda chatbot HR Al-Amin Emall Malaysia. Jawab soalan staf dalam Bahasa Malaysia berdasarkan polisi berikut. Jika tidak pasti, cadangkan hubungi HR.

${policyContext}` },
      ]
      if (Array.isArray(history)) {
        for (const h of history.slice(-6)) messages.push(h)
      }
      messages.push({ role: 'user', content: question })
      const completion = await zai.chat.completions.create({
        messages,
        thinking: { type: 'disabled' },
      })
      const output = completion.choices[0]?.message?.content ?? ''
      await saveOutput(session.id, 'CHATBOT', question, output)
      return NextResponse.json({ output })
    }

    // ===== FR-1005: Penjana Pelan Pembangunan Individu (IDP) =====
    if (action === 'GENERATE_IDP') {
      const targetStaffId = body.staffId ?? session.id
      let canAccess = targetStaffId === session.id
      if (!canAccess && ['HR', 'ADMIN'].includes(session.roleCode)) canAccess = true
      if (!canAccess && session.roleCode === 'SUPERVISOR') {
        const sub = await db.staff.findFirst({ where: { id: targetStaffId, supervisorId: session.id } })
        canAccess = !!sub
      }
      if (!canAccess) return NextResponse.json({ error: 'Tiada akses kepada data KPI staf' }, { status: 403 })

      const staff = await db.staff.findUnique({
        where: { id: targetStaffId },
        include: { department: true },
      })
      if (!staff) return NextResponse.json({ error: 'Staf tidak dijumpai' }, { status: 404 })
      const kpis = await db.kpi.findMany({ where: { staffId: targetStaffId } })
      const myRegs = await db.courseRegistration.findMany({ where: { staffId: targetStaffId }, include: { course: true } })
      const skills = JSON.parse(staff.skillsJson || '[]')
      const period = body.period ?? '6 bulan'

      // Anonymize: tiada nama sebenar dihantar
      const prompt = `Anda pembangun IDP (Individual Development Plan) untuk staf Al-Amin Emall Malaysia.
Berdasarkan data berikut (dinamakan tanpa nama), hasilkan pelan pembangunan ${period} dalam Bahasa Malaysia.

PERANAN/JAWATAN: ${staff.position}
JABATAN: ${staff.department?.name}
MATLAMAT KERJAYA: ${staff.careerGoal ?? 'tidak dinyatakan'}
KEMAHIRAN SEDIA ADA: ${skills.map((s: any) => `${s.name} (tahap ${s.level}/5)`).join(', ') || 'tiada'}
SKOR KPI SEMASA (SULIT, rujukan sahaja):
${kpis.map(k => `- ${k.indicator}: ${k.actual ?? 0}/${k.target} (markah ${k.score ?? 0})`).join('\n') || 'tiada data'}
LATIHAN DIIKUTI: ${myRegs.map(r => `${r.course.title} (${r.attended ?? 'pending'})`).join(', ') || 'tiada'}

Hasilkan IDP dengan:
1. **Matlamat Pembangunan** (3-5 matlamat SMART)
2. **Pelan Tindakan** - jadual: Matlamat | Aktiviti/Latihan | Penanggungjawab | Tarikh Akhir
3. **Sokongan Diperlukan** - latihan, bimbingan, alat
4. **Penunjuk Kejayaan** - KPI/Pengukuran
5. **Risiko & Mitigasi**
Format Markdown.`
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: 'Anda pakar pembangunan staf HR Malaysia.' },
          { role: 'user', content: prompt },
        ],
        thinking: { type: 'disabled' },
      })
      const output = completion.choices[0]?.message?.content ?? ''
      await saveOutput(session.id, 'IDP', `Staf ${staff.id} - ${period}`, output)
      return NextResponse.json({ output, label: 'Dijana AI — Data KPI dan IDP adalah SULIT' })
    }

    // ===== Tanda output sebagai disemak =====
    if (action === 'MARK_REVIEWED') {
      const { outputId } = body
      const updated = await db.aiOutput.update({ where: { id: outputId }, data: { reviewed: true } })
      return NextResponse.json({ output: updated })
    }

    return NextResponse.json({ error: 'Tindakan AI tidak diketahui' }, { status: 400 })
  } catch (e: any) {
    console.error('AI API error:', e)
    return NextResponse.json({ error: 'Ralat AI: ' + (e?.message ?? e) }, { status: 500 })
  }
}
