import React from 'react'
import { getRiwayatBarangKeluar } from '@/app/actions/riwayat'
import TabelRiwayat from '@/components/riwayat/TabelRiwayat'

export default async function RiwayatPage() {
  const logs = await getRiwayatBarangKeluar()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Riwayat Barang Keluar
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Catatan log pengeluaran barang persediaan kantor Pengadilan Agama Kajen yang telah disetujui.
        </p>
      </div>

      <TabelRiwayat initialLogs={logs} />
    </div>
  )
}
