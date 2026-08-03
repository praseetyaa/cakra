import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { success: false, error: 'Konfigurasi server Supabase belum lengkap.' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const secretHeader = request.headers.get('x-webhook-secret') || searchParams.get('secret')
    const expectedSecret = process.env.GOOGLE_FORM_WEBHOOK_SECRET || 'cakra-google-form-secret'

    if (secretHeader && secretHeader !== expectedSecret) {
      return NextResponse.json(
        { success: false, error: 'Kunci rahasia (Webhook Secret) tidak valid.' },
        { status: 401 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch active items
    const { data: barangList, error } = await supabase
      .from('barang')
      .select('id, nama, kd_barang, kd_brng, kode_barang_lengkap, stok, satuan')
      .order('nama', { ascending: true })

    if (error) {
      console.error('Error fetching barang catalog for sync:', error)
      return NextResponse.json(
        { success: false, error: error.message || 'Gagal mengambil daftar barang.' },
        { status: 500 }
      )
    }

    const items = (barangList || []).map((b: any) => ({
      id: b.id,
      nama: b.nama,
      kode: b.kode_barang_lengkap || `${b.kd_barang || ''}${b.kd_brng || ''}`,
      stok: b.stok ?? 0,
      satuan: b.satuan || 'Pcs',
      tersedia: (b.stok ?? 0) > 0,
    }))

    // Provide pre-formatted strings for Google Form dropdown choices
    const itemNamesOnly = items.map((i) => i.nama)
    const itemNamesWithStock = items.map((i) => `${i.nama} (Stok: ${i.stok} ${i.satuan || ''})`.trim())
    const itemChoicesWithCode = items.map((i) => (i.kode ? `[${i.kode}] ${i.nama}` : i.nama))
    const itemChoicesFull = items.map((i) =>
      i.kode
        ? `[${i.kode}] ${i.nama} (Stok: ${i.stok} ${i.satuan || ''})`.trim()
        : `${i.nama} (Stok: ${i.stok} ${i.satuan || ''})`.trim()
    )

    return NextResponse.json({
      success: true,
      total: items.length,
      items: items,
      choices_names_only: itemNamesOnly,
      choices_with_stock: itemNamesWithStock,
      choices_with_code: itemChoicesWithCode,
      choices_full: itemChoicesFull,
    })
  } catch (error: unknown) {
    console.error('Sync Google Form error:', error)
    const msg = error instanceof Error ? error.message : 'Internal Server Error'
    return NextResponse.json({ success: false, error: msg }, { status: 500 })
  }
}
