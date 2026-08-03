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

    // Flatten items if nama_barang contains comma-separated checkbox selections
    const flatItems: { nama_barang: string; jumlah: number }[] = []
    for (const rawItem of parsedItems) {
      const rawName = String(rawItem.nama_barang || rawItem.nama || rawItem.barang || '').trim()
      let itemQty = parseInt(String(rawItem.jumlah || rawItem.qty || 1), 10)
      if (isNaN(itemQty) || itemQty <= 0) itemQty = 1
      
      // If checkbox sent multiple items as comma-separated string e.g. "Item A, Item B"
      if (rawName.includes(',') && rawName.includes('[')) {
        const splitNames = rawName.split(/,\s*(?=\[)/) // Split on comma before bracket
        for (const subName of splitNames) {
          if (subName.trim()) {
            flatItems.push({ nama_barang: subName.trim(), jumlah: itemQty })
          }
        }
      } else {
        flatItems.push({ nama_barang: rawName, jumlah: itemQty })
      }
    }

    // Smart Quantity Extractor: Parse numbers near item keywords from catatan or freeform text
    const fullTextForQty = String(catatan || '').trim()
    if (fullTextForQty) {
      for (const item of flatItems) {
        const cleanedItemName = item.nama_barang.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim().toLowerCase()
        const words = cleanedItemName.split(/\s+/).filter((w) => w.length > 2)

        for (const word of words) {
          // Look for regex pattern like "word 3" or "word: 3" or "3 pcs word"
          const regexNearNumber = new RegExp(`(?:${word}[^0-9,;]*?(\\d+))|(?:(\\d+)[^0-9,;]*?${word})`, 'i')
          const match = fullTextForQty.match(regexNearNumber)
          if (match) {
            const parsedNum = parseInt(match[1] || match[2], 10)
            if (!isNaN(parsedNum) && parsedNum > 0) {
              item.jumlah = parsedNum
              break
            }
          }
        }
      }
    }

    for (const item of flatItems) {
      const rawSearchName = String(item.nama_barang).trim()
      const itemQty = item.jumlah

      if (!rawSearchName || isNaN(itemQty) || itemQty <= 0) continue

      // Extract bracketed code if present, e.g. "[1010301001000003] BALLPOINT CLICK (Stok: 3 PCS)"
      const codeMatch = rawSearchName.match(/\[(.*?)\]/)
      const extractedCode = codeMatch ? codeMatch[1].trim().toLowerCase() : ''

      // Clean name by removing [code] and any (parenthetical text like Stok: 3 PCS)
      const cleanedName = rawSearchName
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .trim()
        .toLowerCase()

      let matched = barangList.find((b) => {
        const bName = (b.nama || '').trim().toLowerCase()
        const bKode = (b.kode_barang_lengkap || `${b.kd_barang || ''}${b.kd_brng || ''}`).trim().toLowerCase()

        // 1. Match extracted code in brackets [BRG-001]
        if (extractedCode && bKode && (bKode === extractedCode || extractedCode.includes(bKode) || bKode.includes(extractedCode))) {
          return true
        }

        // 2. Match cleaned name against bName
        if (bName && cleanedName) {
          if (bName === cleanedName || bName.includes(cleanedName) || cleanedName.includes(bName)) {
            return true
          }
        }

        // 3. Substring match on bKode if present in rawSearchName
        if (bKode && bKode.length > 2 && rawSearchName.toLowerCase().includes(bKode)) {
          return true
        }

        return false
      })

      // 4. Fuzzy fallback: match any significant word (>2 chars)
      if (!matched && cleanedName) {
        const words = cleanedName.split(/\s+/).filter((w) => w.length > 2)
        matched = barangList.find((b) => {
          const bName = (b.nama || '').toLowerCase()
          return words.some((w) => bName.includes(w))
        })
      }

      if (matched) {
        resolvedItems.push({
          barang_id: matched.id,
          jumlah: itemQty,
        })
      } else {
        unmappedItems.push(rawSearchName)
        // Safe fallback: assign to first available barang so detail row is always created
        if (barangList.length > 0) {
          resolvedItems.push({
            barang_id: barangList[0].id,
            jumlah: itemQty,
          })
        }
      }
    }

    if (resolvedItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Harap sertakan minimal 1 item barang yang valid.`,
        },
        { status: 400 }
      )
    }

    // 4. Generate unique UUID for header row beforehand to prevent RLS select issues
    const newPermintaanId = crypto.randomUUID()

    // Prepare catatan with unmapped items info if any
    let finalCatatan = catatan ? String(catatan).trim() : 'Diisi otomatis via Google Form'
    if (unmappedItems.length > 0) {
      finalCatatan += ` | (Item Form: ${unmappedItems.join(', ')})`
    }

    const { error: reqError } = await supabase.from('permintaan').insert({
      id: newPermintaanId,
      pemohon_id: pemohon_id,
      pemohon_email: cleanEmail,
      pemohon_nama_manual: pemohon_id ? null : (nama || cleanEmail),
      unit_kerja: String(unit_kerja).trim(),
      keperluan: String(keperluan).trim(),
      catatan: finalCatatan,
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

    // 5. Insert details into `permintaan_detail` using pre-generated UUID
    const detailRows = resolvedItems.map((item) => ({
      permintaan_id: newPermintaanId,
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
      nomor: 'PRM-FORM',
      permintaan_id: newPermintaanId,
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
