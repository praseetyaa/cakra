import React from 'react'
import { getRiwayatBarangKeluar } from '@/app/actions/riwayat'
import TabelRiwayat from '@/components/riwayat/TabelRiwayat'

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function RiwayatPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Number(params?.page) || 1

  const { data: logs, totalPages, totalCount, currentPage } = await getRiwayatBarangKeluar(page, 20)

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

      <TabelRiwayat
        initialLogs={logs}
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
      />
    </div>
  )
}
