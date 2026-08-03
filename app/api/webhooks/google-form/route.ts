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

    let {
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

    // Support items as parsed Array or JSON stringified
    let parsedItems = items
    if (typeof items === 'string') {
      try {
        parsedItems = JSON.parse(items)
      } catch {
        parsedItems = []
      }
    }

    if (!parsedItems || !Array.isArray(parsedItems) || parsedItems.length === 0) {
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

    for (const item of parsedItems) {
      const rawSearchName = String(item.nama_barang || item.nama || item.barang || '').trim()
      const itemQty = parseInt(String(item.jumlah || item.qty || 1), 10)

      if (!rawSearchName || isNaN(itemQty) || itemQty <= 0) continue

      // Extract bracketed code if present, e.g. "[1010301001000003] BALLPOINT CLICK (Stok: 3 PCS)"
      const codeMatch = rawSearchName.match(/\[(.*?)\]/)
      const extractedCode = codeMatch ? codeMatch[1].trim().toLowerCase() : ''

      // Clean name by removing [code] and (stok...)
      const cleanedName = rawSearchName
        .replace(/\[.*?\]/g, '')
        .replace(/\(stok:.*?\)/gi, '')
        .replace(/\(stok.*?\)/gi, '')
        .trim()
        .toLowerCase()

      const matched = barangList.find((b) => {
        const bName = (b.nama || '').trim().toLowerCase()
        const bKode = (b.kode_barang_lengkap || `${b.kd_barang || ''}${b.kd_brng || ''}`).trim().toLowerCase()

        // 1. Exact or substring match on extracted code
        if (extractedCode && bKode && (bKode === extractedCode || extractedCode.includes(bKode))) {
          return true
        }

        // 2. Exact or substring match on item code
        if (bKode && (bKode === cleanedName || cleanedName.includes(bKode))) {
          return true
        }

        // 3. Name comparison
        if (bName && cleanedName) {
          return (
            bName === cleanedName ||
            bName.includes(cleanedName) ||
            cleanedName.includes(bName)
          )
        }

        return false
      })

      if (matched) {
        resolvedItems.push({
          barang_id: matched.id,
          jumlah: itemQty,
        })
      } else {
        unmappedItems.push(rawSearchName)
      }
    }

    if (resolvedItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Item barang tidak ditemukan/cocok di database CAKRA. Item yang dikirim: ${unmappedItems.join(', ')}`,
          unmapped_items: unmappedItems,
        },
        { status: 400 }
      )
    }

    // 4. Insert header row into `permintaan` with .select() to get generated id & nomor
    let mePermintaanId: string | null = null
    let meNomor: string = 'PRM-FORM'

    const { data: insertedPermintaan, error: reqError } = await supabase
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
      .select('id, nomor')
      .single()

    if (reqError) {
      console.error('Error inserting webhook permintaan with select:', reqError)
      // Fallback in case RLS blocks insert with select: try basic insert then query
      const { error: fallbackReqError } = await supabase.from('permintaan').insert({
        pemohon_id: pemohon_id,
        pemohon_email: cleanEmail,
        pemohon_nama_manual: pemohon_id ? null : (nama || cleanEmail),
        unit_kerja: String(unit_kerja).trim(),
        keperluan: String(keperluan).trim(),
        catatan: catatan ? String(catatan).trim() : 'Diisi otomatis via Google Form',
        sumber: 'form',
        status: 'menunggu',
      })

      if (fallbackReqError) {
        return NextResponse.json(
          { success: false, error: fallbackReqError.message || 'Gagal menyimpan header permintaan.' },
          { status: 500 }
        )
      }

      const { data: fetchedPermintaan } = await supabase
        .from('permintaan')
        .select('id, nomor')
        .eq('pemohon_email', cleanEmail)
        .eq('sumber', 'form')
        .order('tanggal', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (fetchedPermintaan) {
        mePermintaanId = fetchedPermintaan.id
        meNomor = fetchedPermintaan.nomor
      }
    } else if (insertedPermintaan) {
      mePermintaanId = insertedPermintaan.id
      meNomor = insertedPermintaan.nomor
    }

    if (!mePermintaanId) {
      return NextResponse.json(
        { success: false, error: 'Gagal mendapatkan ID header permintaan yang baru dibuat.' },
        { status: 500 }
      )
    }

    // 5. Insert details into `permintaan_detail` if permintaan.id resolved and items resolved
    const detailRows = resolvedItems.map((item) => ({
      permintaan_id: mePermintaanId,
      barang_id: item.barang_id,
      jumlah: item.jumlah,
    }))

    const { error: detailError } = await supabase.from('permintaan_detail').insert(detailRows)

    if (detailError) {
      console.error('Error inserting webhook permintaan_detail:', detailError)
      return NextResponse.json(
        {
          success: false,
          error: `Gagal menyimpan detail barang ke database: ${detailError.message} (Code: ${detailError.code})`,
        },
        { status: 500 }
      )
    }

    // 6. Create notification entry if notification table exists
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
      nomor: meNomor,
      permintaan_id: mePermintaanId,
      message: `Permintaan berhasil masuk dari Google Form!`,
      resolved_count: resolvedItems.length,
      unmapped_items: unmappedItems.length > 0 ? unmappedItems : undefined,
    })
  } catch (error: unknown) {
    console.error('Webhook Google Form error:', error)
    const msg = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
