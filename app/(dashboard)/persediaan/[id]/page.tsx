import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ArrowLeft, Package, MapPin, AlertTriangle, ShieldCheck, Activity } from 'lucide-react'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PersediaanDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Fetch current item details joined with category
  const { data: barang, error: barangError } = await supabase
    .from('barang')
    .select(`
      id,
      kd_brng,
      kd_barang,
      kode_barang_lengkap,
      nama,
      kategori_id,
      satuan,
      stok,
      stok_minimum,
      lokasi,
      status,
      kategori_barang (
        nama
      )
    `)
    .eq('id', id)
    .single()

  if (barangError || !barang) {
    return (
      <div className="space-y-6 text-center py-12">
        <h1 className="text-xl font-bold text-red-600">Barang tidak ditemukan</h1>
        <p className="text-slate-500">Item dengan ID {id} tidak terdaftar di sistem persediaan.</p>
        <Link
          href="/persediaan"
          className={cn(
            buttonVariants({ variant: 'default' }),
            'bg-emerald-800 hover:bg-emerald-700 text-white'
          )}
        >
          Kembali ke Persediaan
        </Link>
      </div>
    )
  }

  // 2. Fetch history of stock transactions for this item
  const { data: riwayat, error: riwayatError } = await supabase
    .from('riwayat_stok')
    .select('*')
    .eq('barang_id', id)
    .order('created_at', { ascending: false })

  if (riwayatError) {
    console.error('Failed to fetch stock history:', riwayatError)
  }

  const riwayatList = riwayat || []

  // Helpers
  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatJenis = (jenis: string) => {
    switch (jenis) {
      case 'masuk':
        return 'Masuk'
      case 'keluar':
        return 'Keluar'
      case 'penyesuaian':
        return 'Penyesuaian'
      default:
        return jenis
    }
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb / Back Link */}
      <div className="flex items-center gap-3">
        <Link
          href="/persediaan"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'h-9 w-9 p-0 rounded-full flex items-center justify-center'
          )}
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Kembali</span>
        </Link>
        <div>
          <p className="text-xs text-slate-500 font-medium flex items-center gap-2">
            <span>Persediaan / Detail Stok</span>
            {(barang.kode_barang_lengkap || barang.kd_barang) && (
              <span className="font-mono bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800">
                Kode BMN: {barang.kode_barang_lengkap || `${barang.kd_barang}${barang.kd_brng || ''}`}
              </span>
            )}
          </p>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
            {barang.nama}
          </h1>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Stok Tersedia */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Stok Tersedia
            </CardTitle>
            <Package className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {barang.stok} <span className="text-sm font-normal text-slate-500">{barang.satuan}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Stok saat ini di gudang</p>
          </CardContent>
        </Card>

        {/* Stok Minimum */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Stok Minimum
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {barang.stok_minimum} <span className="text-sm font-normal text-slate-500">{barang.satuan}</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Ambangkan batas stok kritis</p>
          </CardContent>
        </Card>

        {/* Lokasi Penyimpanan */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Lokasi
            </CardTitle>
            <MapPin className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-slate-800 dark:text-white truncate pt-1">
              {barang.lokasi}
            </div>
            <p className="text-xs text-slate-400 mt-1">Tempat penyimpanan fisik</p>
          </CardContent>
        </Card>

        {/* Status Ketersediaan */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">
              Status Stok
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent className="pt-2">
            <Badge
              variant={barang.status === 'Aman' ? 'outline' : 'destructive'}
              className={`text-sm px-3 py-0.5 font-bold ${
                barang.status === 'Aman'
                  ? 'border-emerald-600 text-emerald-800 dark:text-emerald-450 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'bg-amber-100 border border-amber-300 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-400'
              }`}
            >
              {barang.status}
            </Badge>
            <p className="text-xs text-slate-400 mt-2">
              Kategori: {Array.isArray(barang.kategori_barang) ? (barang.kategori_barang[0] as { nama: string })?.nama : (barang.kategori_barang as { nama: string } | null)?.nama || 'Tanpa Kategori'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stock History Audit Logs */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Riwayat Mutasi Persediaan
          </h2>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-50">
                <TableHead>Waktu Mutasi</TableHead>
                <TableHead className="text-center">Jumlah</TableHead>
                <TableHead>Jenis Mutasi</TableHead>
                <TableHead>Keterangan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {riwayatList.length > 0 ? (
                riwayatList.map((log) => {
                  const isNegative = log.jumlah < 0
                  return (
                    <TableRow key={log.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-800/30">
                      <TableCell className="text-slate-500 font-medium">
                        {formatDateTime(log.created_at)}
                      </TableCell>
                      <TableCell className={`text-center font-bold text-sm ${
                        isNegative ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {isNegative ? '' : '+'}{log.jumlah} {barang.satuan}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            log.jenis === 'masuk'
                              ? 'border-emerald-500 text-emerald-800 dark:text-emerald-400'
                              : log.jenis === 'keluar'
                              ? 'border-red-500 text-red-800 dark:text-red-400'
                              : 'border-blue-500 text-blue-800 dark:text-blue-400'
                          }
                        >
                          {formatJenis(log.jenis)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-700 dark:text-slate-300 font-medium">
                        {log.keterangan || '-'}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12 text-slate-500">
                    Belum ada riwayat transaksi mutasi untuk barang ini.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
