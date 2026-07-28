import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { success: false, error: 'Konfigurasi server Supabase belum lengkap.' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    const body = await request.json()

    // 1. Secret Key Verification
    const secretHeader = request.headers.get('x-webhook-secret') || body.secret
    const expectedSecret = process.env.GOOGLE_FORM_WEBHOOK_SECRET || 'cakra-google-form-secret'

    if (secretHeader && secretHeader !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Kunci rahasia (Webhook Secret) tidak valid.' },
        { status: 401 }
      )
    }

    const {
      email,
      nama,
      unit_kerja,
      keperluan,
      catatan,
      items,
    } = body

    if (!email || !unit_kerja || !keperluan) {
      return NextResponse.json(
        { success: false, error: 'Email pemohon, unit kerja, dan keperluan wajib diisi.' },
        { status: 400 }
      )
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Harap sertakan minimal 1 item barang yang diminta.' },
        { status: 400 }
      )
    }

    // 2. Check if email belongs to an existing registered profile
    let pemohon_id: string | null = null
    const cleanEmail = String(email).trim().toLowerCase()

    try {
      const { data: profile } = await supabase
        .from('profiles_with_email')
        .select('id')
        .eq('email', cleanEmail)
        .maybeSingle()

      if (profile?.id) {
        pemohon_id = profile.id
      }
    } catch (err) {
      console.warn('Error querying profiles_with_email view:', err)
    }

    // 3. Resolve items to barang_id in database
    const resolvedItems: { barang_id: string; jumlah: number }[] = []
    const unmappedItems: string[] = []

    const { data: allBarang, error: barangErr } = await supabase
      .from('barang')
      .select('id, nama, kd_barang, kd_brng, kode_barang_lengkap')

    if (barangErr) {
      console.error('Error fetching barang list:', barangErr)
    }

    const barangList = allBarang || []

    for (const item of items) {
      const searchItemName = String(item.nama_barang || item.nama || '').trim().toLowerCase()
      const itemQty = parseInt(String(item.jumlah || 1), 10)

      if (!searchItemName || isNaN(itemQty) || itemQty <= 0) continue

      const matched = barangList.find((b) => {
        const bName = (b.nama || '').toLowerCase()
        const bKode = (b.kode_barang_lengkap || `${b.kd_barang || ''}${b.kd_brng || ''}`).toLowerCase()
        return (
          bName === searchItemName ||
          bName.includes(searchItemName) ||
          searchItemName.includes(bName) ||
          (bKode && bKode === searchItemName)
        )
      })

      if (matched) {
        resolvedItems.push({
          barang_id: matched.id,
          jumlah: itemQty,
        })
      } else {
        unmappedItems.push(searchItemName)
      }
    }

    if (resolvedItems.length === 0 && barangList.length > 0) {
      resolvedItems.push({
        barang_id: barangList[0].id,
        jumlah: 1,
      })
    }

    // 4. Insert header row into `permintaan` without .select() to avoid RLS 42501 select check errors
    const { error: reqError } = await supabase
      .from('permintaan')
      .insert({
        pemohon_id: pemohon_id,
        pemohon_email: cleanEmail,
        pemohon_nama_manual: pemohon_id ? null : (nama || cleanEmail),
        unit_kerja: String(unit_kerja).trim(),
        keperluan: String(keperluan).trim(),
        catatan: catatan ? String(catatan).trim() : 'Diisi otomatis via Google Form',
        sumber: 'form',
        status: 'menunggu',
      })

    if (reqError) {
      console.error('Error inserting webhook permintaan:', reqError)
      return NextResponse.json(
        { success: false, error: reqError.message || 'Gagal menyimpan header permintaan.' },
        { status: 500 }
      )
    }

    // 5. Query latest inserted row to get permintaan.id for details
    const { data: permintaan } = await supabase
      .from('permintaan')
      .select('*')
      .eq('pemohon_email', cleanEmail)
      .eq('sumber', 'form')
      .order('tanggal', { ascending: false })
      .limit(1)
      .maybeSingle()

    // 6. Insert details into `permintaan_detail` if permintaan.id resolved
    if (permintaan?.id && resolvedItems.length > 0) {
      const detailRows = resolvedItems.map((item) => ({
        permintaan_id: permintaan.id,
        barang_id: item.barang_id,
        jumlah: item.jumlah,
      }))

      const { error: detailError } = await supabase.from('permintaan_detail').insert(detailRows)

      if (detailError) {
        console.error('Error inserting webhook permintaan_detail:', detailError)
      }
    }

    // Create notification entry if notification table exists
    try {
      await supabase.from('notifikasi').insert({
        title: 'Permintaan Google Form Baru',
        message: `Permintaan masuk dari Google Form (${cleanEmail})`,
        role_target: 'pengelola',
        dibaca: false,
      })
    } catch {
      // Ignore notification creation errors
    }

    return NextResponse.json({
      success: true,
      nomor: permintaan?.nomor || 'PRM-FORM',
      permintaan_id: permintaan?.id || null,
      message: `Permintaan berhasil masuk dari Google Form!`,
      unmapped_items: unmappedItems.length > 0 ? unmappedItems : undefined,
    })
  } catch (error: unknown) {
    console.error('Webhook Google Form error:', error)
    const msg = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
