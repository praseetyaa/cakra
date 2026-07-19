'use server'

import { createClient } from '@/lib/supabase/server'

export interface RiwayatBarangKeluarItem {
  id: string
  created_at: string
  jumlah: number
  keterangan: string | null
  barang: {
    nama: string
    satuan: string
  }
  permintaan: {
    id: string
    nomor: string
    unit_kerja: string
  } | null
  pemohon: {
    nama_lengkap: string
  } | null
}

export async function getRiwayatBarangKeluar(): Promise<RiwayatBarangKeluarItem[]> {
  const supabase = await createClient()

  // 1. Fetch riwayat_stok where jenis is 'keluar'
  const { data: logs, error: logsError } = await supabase
    .from('riwayat_stok')
    .select('*')
    .eq('jenis', 'keluar')
    .order('created_at', { ascending: false })

  if (logsError) {
    console.error('Error fetching stock history logs:', logsError)
    return []
  }

  if (!logs || logs.length === 0) {
    return []
  }

  // 2. Fetch related barang
  const barangIds = Array.from(new Set(logs.map((log) => log.barang_id).filter(Boolean)))
  const { data: barangList, error: barangError } = await supabase
    .from('barang')
    .select('id, nama, satuan')
    .in('id', barangIds)

  if (barangError) {
    console.error('Error fetching related barang for history:', barangError)
  }

  const barangMap = new Map((barangList || []).map((b) => [b.id, b]))

  // 3. Fetch related permintaan
  const referensiIds = Array.from(new Set(logs.map((log) => log.referensi_id).filter(Boolean)))
  let permintaanMap = new Map()
  let profileMap = new Map()

  if (referensiIds.length > 0) {
    const { data: permintaanList, error: permintaanError } = await supabase
      .from('permintaan')
      .select('id, nomor, unit_kerja, pemohon_id')
      .in('id', referensiIds)

    if (permintaanError) {
      console.error('Error fetching related permintaan for history:', permintaanError)
    }

    const pList = permintaanList || []
    permintaanMap = new Map(pList.map((p) => [p.id, p]))

    // 4. Fetch related profiles for pemohon_id
    const pemohonIds = Array.from(new Set(pList.map((p) => p.pemohon_id).filter(Boolean)))
    if (pemohonIds.length > 0) {
      const { data: profilesList, error: profilesError } = await supabase
        .from('profiles')
        .select('id, nama_lengkap')
        .in('id', pemohonIds)

      if (profilesError) {
        console.error('Error fetching related profiles for history:', profilesError)
      }

      profileMap = new Map((profilesList || []).map((prof) => [prof.id, prof]))
    }
  }

  // 5. Combine and format data
  return logs.map((log) => {
    const barang = barangMap.get(log.barang_id) || { nama: 'Barang Terhapus', satuan: 'Unit' }
    const permintaan = log.referensi_id ? permintaanMap.get(log.referensi_id) : null
    const pemohon = permintaan ? profileMap.get(permintaan.pemohon_id) : null

    return {
      id: log.id,
      created_at: log.created_at,
      jumlah: Math.abs(log.jumlah), // display positive quantity
      keterangan: log.keterangan,
      barang: {
        nama: barang.nama,
        satuan: barang.satuan,
      },
      permintaan: permintaan
        ? {
            id: permintaan.id,
            nomor: permintaan.nomor,
            unit_kerja: permintaan.unit_kerja,
          }
        : null,
      pemohon: pemohon
        ? {
            nama_lengkap: pemohon.nama_lengkap,
          }
        : null,
    }
  })
}
