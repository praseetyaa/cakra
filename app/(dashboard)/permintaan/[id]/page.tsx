import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { buttonVariants } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Clock, CheckCircle2, XCircle, User, Clipboard, Calendar, FileText, AlertTriangle, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import TombolApproval from '@/components/permintaan/TombolApproval'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PermintaanDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Fetch current requests session data
  const { data: request, error: reqError } = await supabase
    .from('permintaan')
    .select('*')
    .eq('id', id)
    .single()

  if (reqError || !request) {
    return (
      <div className="space-y-6 text-center py-12">
        <h1 className="text-xl font-bold text-red-600">Permintaan tidak ditemukan</h1>
        <p className="text-slate-500">Form pengajuan dengan ID {id} tidak terdaftar di sistem.</p>
        <Link href="/permintaan" className={cn(buttonVariants({ variant: 'default' }), 'bg-emerald-800 hover:bg-emerald-700 text-white')}>
          Kembali ke Permintaan
        </Link>
      </div>
    )
  }

  // 2. Fetch authenticated user profile details to assert security policies (Defense in Depth)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="space-y-6 text-center py-12">
        <h1 className="text-xl font-bold text-red-600">Akses Ditolak</h1>
        <p className="text-slate-500">Anda harus login terlebih dahulu.</p>
      </div>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role || 'pemohon'

  // If role is pemohon and the request doesn't belong to them, deny access
  if (userRole === 'pemohon' && request.pemohon_id !== user.id) {
    return (
      <div className="space-y-6 text-center py-12">
        <ShieldAlert className="h-12 w-12 text-red-600 mx-auto" />
        <h1 className="text-xl font-bold text-red-600">Akses Terbatas</h1>
        <p className="text-slate-500">Anda tidak diizinkan untuk melihat detail permintaan milik pegawai lain.</p>
        <Link href="/permintaan" className={cn(buttonVariants({ variant: 'default' }), 'bg-emerald-800 hover:bg-emerald-700 text-white')}>
          Kembali ke Permintaan
        </Link>
      </div>
    )
  }

  // 3. Fetch related profiles (Pemohon and Approver if any) - Separate queries to avoid joins disambiguation issues
  const { data: pemohonProfile } = await supabase
    .from('profiles')
    .select('nama_lengkap')
    .eq('id', request.pemohon_id)
    .single()

  let approverName = ''
  if (request.disetujui_oleh) {
    const { data: approverProfile } = await supabase
      .from('profiles')
      .select('nama_lengkap')
      .eq('id', request.disetujui_oleh)
      .single()
    if (approverProfile) {
      approverName = approverProfile.nama_lengkap
    }
  }

  // 4. Fetch permintaan details linked to items table
  const { data: details, error: detailsError } = await supabase
    .from('permintaan_detail')
    .select(`
      id,
      jumlah,
      barang (
        nama,
        satuan,
        stok
      )
    `)
    .eq('permintaan_id', id)

  if (detailsError) {
    console.error('Failed to fetch request details:', detailsError)
  }

  const detailItems = (details || []).map((d: { id: string; jumlah: number; barang: { nama: string; satuan: string; stok: number } | { nama: string; satuan: string; stok: number }[] | null | undefined }) => {
    const item = Array.isArray(d.barang) ? d.barang[0] : d.barang
    return {
      id: d.id,
      jumlah: d.jumlah,
      nama: item?.nama || 'Barang Terhapus',
      satuan: item?.satuan || 'Pcs',
      stokAvailable: item?.stok ?? 0,
    }
  })

  const hasStockShortage = detailItems.some((item) => item.jumlah > item.stokAvailable)

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

  return (
    <div className="space-y-8">
      {/* Back link */}
      <div className="flex items-center gap-3">
        <Link
          href="/permintaan"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'h-9 w-9 p-0 rounded-full flex items-center justify-center'
          )}
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Kembali</span>
        </Link>
        <div>
          <p className="text-xs text-slate-500 font-medium">Permintaan / Detail Pengajuan</p>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Detail Permintaan {request.nomor}
          </h1>
        </div>
      </div>

      {request.status === 'menunggu' && hasStockShortage && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-400 flex items-start gap-3 shadow-sm">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Peringatan: Stok Gudang Tidak Mencukupi</h4>
            <p className="text-xs mt-1">Satu atau beberapa item yang diminta memiliki kuantitas melebihi stok tersedia saat ini di gudang. Harap tinjau ketersediaan barang sebelum menyetujui.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Metadata Details Card */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 pb-4">
              <CardTitle className="text-sm font-bold uppercase text-slate-400 flex items-center gap-2">
                <Clipboard className="h-4.5 w-4.5" />
                Informasi Pengajuan
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {/* Status Badge */}
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-slate-400">Status</span>
                <StatusBadge status={request.status} />
              </div>

              {/* Pemohon */}
              <div className="flex flex-col gap-1 border-t border-slate-50 dark:border-slate-800/30 pt-3">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> Pemohon
                </span>
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {pemohonProfile?.nama_lengkap || 'Pegawai'}
                </span>
              </div>

              {/* Unit Kerja */}
              <div className="flex flex-col gap-1 border-t border-slate-50 dark:border-slate-800/30 pt-3">
                <span className="text-xs text-slate-400">Unit Kerja</span>
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {request.unit_kerja}
                </span>
              </div>

              {/* Tanggal Pengajuan */}
              <div className="flex flex-col gap-1 border-t border-slate-50 dark:border-slate-800/30 pt-3">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> Tanggal Pengajuan
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {formatDateTime(request.tanggal)}
                </span>
              </div>

              {/* Keperluan */}
              <div className="flex flex-col gap-1 border-t border-slate-50 dark:border-slate-800/30 pt-3">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <FileText className="h-3.5 w-3.5" /> Keperluan
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                  {request.keperluan}
                </span>
              </div>

              {/* Catatan */}
              {request.catatan && (
                <div className="flex flex-col gap-1 border-t border-slate-50 dark:border-slate-800/30 pt-3">
                  <span className="text-xs text-slate-400">Catatan Pemohon</span>
                  <span className="text-xs text-slate-600 bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded italic">
                    &quot;{request.catatan}&quot;
                  </span>
                </div>
              )}
            </CardContent>

            {/* Action buttons inside the card */}
            {request.status === 'menunggu' && ['pengelola', 'pimpinan', 'admin'].includes(userRole) && (
              <div className="px-6 pb-6 pt-4 border-t border-slate-100 dark:border-slate-800/40">
                <TombolApproval requestId={id} />
              </div>
            )}
          </Card>

          {/* Approver / Decision details card */}
          {request.status !== 'menunggu' && (
            <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold uppercase text-slate-400">
                  Detail Keputusan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Diputuskan oleh:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{approverName || 'Pimpinan'}</span>
                </div>
                {request.tanggal_keputusan && (
                  <div className="flex justify-between border-t border-slate-100 dark:border-slate-800/40 pt-2">
                    <span className="text-slate-400">Waktu keputusan:</span>
                    <span className="text-slate-600 dark:text-slate-300">{formatDateTime(request.tanggal_keputusan)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Requested Items List Table */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="border-b border-slate-100 dark:border-slate-800/60 pb-4">
              <CardTitle className="text-sm font-bold uppercase text-slate-400 flex items-center gap-2">
                <Clipboard className="h-4.5 w-4.5" />
                Daftar Item Barang Diminta
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/40 dark:bg-slate-900/30 hover:bg-slate-50/40">
                    <TableHead className="pl-6">Nama Barang</TableHead>
                    <TableHead className="text-center">Jumlah Diminta</TableHead>
                    <TableHead className="text-center">Stok Tersedia</TableHead>
                    <TableHead className="text-right pr-6">Status Gudang</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailItems.map((item) => {
                    const isExceeding = request.status === 'menunggu' && item.jumlah > item.stokAvailable

                    return (
                      <TableRow key={item.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-800/20">
                        <TableCell className="font-semibold text-slate-850 dark:text-slate-250 pl-6">
                          {item.nama}
                        </TableCell>
                        <TableCell className="text-center font-bold text-slate-900 dark:text-white">
                          {item.jumlah} {item.satuan}
                        </TableCell>
                        <TableCell className="text-center text-slate-400">
                          {item.stokAvailable} {item.satuan}
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          {isExceeding ? (
                            <Badge variant="destructive" className="bg-amber-100 border border-amber-300 text-amber-900 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-400">
                              <span className="flex items-center gap-1 text-[10px]">
                                <AlertTriangle className="h-3 w-3 text-amber-500" />
                                Stok Kurang
                              </span>
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-emerald-600 text-emerald-800 bg-emerald-50/50 dark:text-emerald-450 dark:bg-emerald-950/10">
                              Tersedia
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
