'use server'

import { createClient } from '@/lib/supabase/server'
import { getRiwayatBarangKeluar } from './riwayat'

export interface StockReportItem {
  nama: string
  kategori: string
  satuan: string
  stok: number
  stok_minimum: number
  lokasi: string
  status: string
}

export interface OutgoingReportItem {
  tanggal: string
  nomor: string
  pemohon: string
  unit_kerja: string
  nama_barang: string
  jumlah: number
  satuan: string
  keterangan: string
}

export async function getReportData(
  type: 'keluar' | 'stok' | 'menipis',
  month?: number,
  year?: number
): Promise<unknown[]> {
  const supabase = await createClient()

  if (type === 'stok' || type === 'menipis') {
    let query = supabase
      .from('barang')
      .select(`
        id,
        nama,
        satuan,
        stok,
        stok_minimum,
        lokasi,
        status,
        kategori_barang ( nama )
      `)
      .order('nama', { ascending: true })

    if (type === 'menipis') {
      query = query.eq('status', 'Menipis')
    }

    const { data, error } = await query
    if (error) {
      console.error('Error fetching report stock:', error)
      return []
    }
    return (data || []).map((item) => ({
      nama: item.nama,
      kategori: Array.isArray(item.kategori_barang)
        ? (item.kategori_barang[0] as { nama: string })?.nama || 'Tanpa Kategori'
        : (item.kategori_barang as { nama: string } | null)?.nama || 'Tanpa Kategori',
      satuan: item.satuan,
      stok: item.stok,
      stok_minimum: item.stok_minimum,
      lokasi: item.lokasi,
      status: item.status,
    }))
  } else {
    // Outgoing transactions
    const logs = await getRiwayatBarangKeluar()
    
    // Filter by month & year
    return logs
      .filter((log) => {
        const date = new Date(log.created_at)
        const matchMonth = month === undefined || month === 0 || date.getMonth() + 1 === month
        const matchYear = year === undefined || year === 0 || date.getFullYear() === year
        return matchMonth && matchYear
      })
      .map((log) => ({
        tanggal: log.created_at,
        nomor: log.permintaan?.nomor || '-',
        pemohon: log.pemohon?.nama_lengkap || 'Pengelola/Admin',
        unit_kerja: log.permintaan?.unit_kerja || 'Umum',
        nama_barang: log.barang.nama,
        jumlah: log.jumlah,
        satuan: log.barang.satuan,
        keterangan: log.keterangan || '',
      }))
  }
}
