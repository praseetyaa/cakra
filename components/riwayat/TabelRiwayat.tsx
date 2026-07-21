'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Search, Calendar, User, Building, Package, Info, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { RiwayatBarangKeluarItem } from '@/app/actions/riwayat'

interface TabelRiwayatProps {
  initialLogs: RiwayatBarangKeluarItem[]
  currentPage: number
  totalPages: number
  totalCount: number
}

export default function TabelRiwayat({
  initialLogs,
  currentPage,
  totalPages,
  totalCount
}: TabelRiwayatProps) {
  const [search, setSearch] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  const filteredLogs = initialLogs.filter((log) => {
    const searchLower = search.toLowerCase()
    const matchBarang = log.barang.nama.toLowerCase().includes(searchLower)
    const matchPemohon = log.pemohon?.nama_lengkap.toLowerCase().includes(searchLower) || false
    const matchNomor = log.permintaan?.nomor.toLowerCase().includes(searchLower) || false
    const matchUnit = log.permintaan?.unit_kerja.toLowerCase().includes(searchLower) || false
    return matchBarang || matchPemohon || matchNomor || matchUnit
  })

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400" />
          <Input
            placeholder="Cari berdasarkan nama barang, pemohon, nomor permintaan, atau unit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 w-full text-xs h-9"
          />
        </div>
        <div className="text-xs text-slate-500 shrink-0 font-medium">
          Total: <span className="font-bold text-slate-800 dark:text-slate-200">{totalCount}</span> transaksi
        </div>
      </div>

      {/* Main Table view */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-50/50">
              <TableHead className="w-[180px]">Tanggal Keluar</TableHead>
              <TableHead className="w-[120px]">No. Permintaan</TableHead>
              <TableHead>Pemohon</TableHead>
              <TableHead>Unit Kerja</TableHead>
              <TableHead>Nama Barang</TableHead>
              <TableHead className="text-center w-[100px]">Jumlah</TableHead>
              <TableHead>Keterangan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <TableRow key={log.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10">
                  <TableCell className="font-medium text-slate-600 dark:text-slate-400 text-xs">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      {formatDateTime(log.created_at)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {log.permintaan ? (
                      <Link
                        href={`/permintaan/${log.permintaan.id}`}
                        className="text-emerald-800 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-bold text-xs flex items-center gap-0.5 hover:underline"
                      >
                        {log.permintaan.nomor}
                        <ArrowUpRight className="h-3 w-3" />
                      </Link>
                    ) : (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      {log.pemohon?.nama_lengkap || 'Pengelola/Admin'}
                    </span>
                  </TableCell>
                  <TableCell className="text-slate-600 dark:text-slate-400 text-xs">
                    <span className="flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-slate-400" />
                      {log.permintaan?.unit_kerja || 'Umum'}
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    <span className="flex items-center gap-1.5">
                      <Package className="h-3.5 w-3.5 text-slate-400 animate-pulse" />
                      {log.barang.nama}
                    </span>
                  </TableCell>
                  <TableCell className="text-center font-bold text-red-600 dark:text-red-400 text-xs">
                    -{log.jumlah} {log.barang.satuan}
                  </TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-450 text-xs">
                    <span className="flex items-center gap-1.5">
                      <Info className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {log.keterangan || 'Barang dikeluarkan'}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-400 text-sm">
                  Tidak ada riwayat transaksi barang keluar yang ditemukan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Navigation Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
            <span className="text-xs text-slate-500 font-medium">
              Halaman <span className="font-bold text-slate-800 dark:text-slate-200">{currentPage}</span> dari{' '}
              <span className="font-bold text-slate-800 dark:text-slate-200">{totalPages}</span>
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => handlePageChange(currentPage - 1)}
                className="h-8 text-xs px-3"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Sebelumnya
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => handlePageChange(currentPage + 1)}
                className="h-8 text-xs px-3"
              >
                Selanjutnya
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
