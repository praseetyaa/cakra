import React from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import StatCard from '@/components/dashboard/StatCard'
import GrafikTransaksi from '@/components/dashboard/GrafikTransaksi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import {
  ClipboardList,
  Clock,
  AlertTriangle,
  TrendingUp,
  PackageCheck,
  Package,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = await createClient()

  // 1. Get current authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="space-y-6 text-center py-12">
        <h1 className="text-xl font-bold text-red-600">Akses Ditolak</h1>
        <p className="text-slate-500">Silakan login untuk mengakses dashboard.</p>
      </div>
    )
  }

  // 2. Fetch profile role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, nama_lengkap')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role || 'pemohon'
  const isStaff = ['pengelola', 'pimpinan', 'admin'].includes(userRole)

  // 3. Define time benchmarks
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // 4. Query statistics counts
  // Today's Requests
  let todayQuery = supabase
    .from('permintaan')
    .select('*', { count: 'exact', head: true })
    .gte('tanggal', todayStart)
  if (!isStaff) {
    todayQuery = todayQuery.eq('pemohon_id', user.id)
  }
  const { count: todayCount } = await todayQuery

  // Pending Approvals
  let pendingQuery = supabase
    .from('permintaan')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'menunggu')
  if (!isStaff) {
    pendingQuery = pendingQuery.eq('pemohon_id', user.id)
  }
  const { count: pendingCount } = await pendingQuery

  // Monthly Transactions / Volume
  let monthTrxCount = 0
  if (isStaff) {
    // Staff: Total transacted item volume (outbound amount sum)
    const { data: rs } = await supabase
      .from('riwayat_stok')
      .select('jumlah')
      .eq('jenis', 'keluar')
      .gte('created_at', monthStart)
    monthTrxCount = rs ? rs.reduce((acc, curr) => acc + Math.abs(curr.jumlah), 0) : 0
  } else {
    // Pemohon: Total approved requests of this user this month
    const { count: c } = await supabase
      .from('permintaan')
      .select('*', { count: 'exact', head: true })
      .eq('pemohon_id', user.id)
      .eq('status', 'disetujui')
      .gte('tanggal', monthStart)
    monthTrxCount = c || 0
  }

  // Critical Stock Count (under minimum limit - global)
  const { count: criticalCount } = await supabase
    .from('barang')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'Menipis')

  // Top 5 critical items list
  const { data: criticalItems } = await supabase
    .from('barang')
    .select('id, nama, stok, satuan, stok_minimum, status')
    .eq('status', 'Menipis')
    .order('stok', { ascending: true })
    .limit(5)

  // 5. Query 7-day transaction chart points
  const chartData = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    d.setHours(0, 0, 0, 0)
    const dayStart = d.toISOString()

    const nextD = new Date(d)
    nextD.setDate(nextD.getDate() + 1)
    const dayEnd = nextD.toISOString()

    let count = 0
    if (!isStaff) {
      const { count: c } = await supabase
        .from('permintaan')
        .select('*', { count: 'exact', head: true })
        .eq('pemohon_id', user.id)
        .gte('tanggal', dayStart)
        .lt('tanggal', dayEnd)
      count = c || 0
    } else {
      const { data: rs } = await supabase
        .from('riwayat_stok')
        .select('jumlah')
        .eq('jenis', 'keluar')
        .gte('created_at', dayStart)
        .lt('created_at', dayEnd)
      count = rs ? rs.reduce((acc, curr) => acc + Math.abs(curr.jumlah), 0) : 0
    }

    chartData.push({
      tanggal: d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
      transaksi: count,
    })
  }

  return (
    <div className="space-y-8">
      {/* Welcome banner header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Selamat Datang, {profile?.nama_lengkap || 'Pegawai'}!
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Berikut adalah ringkasan kendali persediaan dan permintaan barang kantor Pengadilan Agama Kajen.
        </p>
      </div>

      {/* Responsive Stat Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Permintaan Hari Ini"
          value={todayCount || 0}
          icon={<ClipboardList className="h-5 w-5" />}
          description="Pengajuan masuk hari ini"
        />
        <StatCard
          title="Menunggu Persetujuan"
          value={pendingCount || 0}
          icon={<Clock className="h-5 w-5" />}
          description="Menunggu verifikasi staff"
          trend={pendingCount && pendingCount > 0 ? { type: 'negative', text: 'Perlu Tinjauan' } : undefined}
        />
        <StatCard
          title="Stok Barang Menipis"
          value={criticalCount || 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          description="Barang di bawah minimum"
          trend={criticalCount && criticalCount > 0 ? { type: 'negative', text: 'Kritis' } : undefined}
        />
        <StatCard
          title={isStaff ? "Barang Keluar (Bulan Ini)" : "Permintaan Disetujui (Bulan Ini)"}
          value={monthTrxCount || 0}
          icon={isStaff ? <PackageCheck className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
          description={isStaff ? "Jumlah total barang keluar" : "Pengajuan disetujui"}
        />
      </div>

      {/* Main dashboard content: Chart and Warning/Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recharts Area Chart (7 days) */}
        <div className="lg:col-span-2">
          <GrafikTransaksi
            data={chartData}
            label={
              isStaff
                ? 'Volume pengeluaran barang persediaan kantor harian'
                : 'Jumlah pengajuan permintaan barang harian Anda'
            }
          />
        </div>

        {/* Right Column: Depleted items summary list (only for pengelola/admin) */}
        <div className="lg:col-span-1">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800 h-full flex flex-col justify-between">
            <div>
              <CardHeader className="border-b border-slate-100 dark:border-slate-800/40 pb-4">
                <CardTitle className="text-sm font-bold uppercase text-slate-400 flex items-center gap-2">
                  <Package className="h-4.5 w-4.5" />
                  Stok Kritis Terendah
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/40 dark:bg-slate-900/30 hover:bg-slate-50/40">
                      <TableHead className="pl-6">Nama Barang</TableHead>
                      <TableHead className="text-center">Stok</TableHead>
                      <TableHead className="text-right pr-6">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {criticalItems && criticalItems.length > 0 ? (
                      criticalItems.map((item) => (
                        <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                          <TableCell className="font-semibold text-slate-850 dark:text-slate-200 pl-6">
                            <Link href={`/persediaan/${item.id}`} className="hover:underline">
                              {item.nama}
                            </Link>
                          </TableCell>
                          <TableCell className="text-center font-bold text-amber-600">
                            {item.stok} / {item.stok_minimum}
                          </TableCell>
                          <TableCell className="text-right pr-6">
                            <Badge variant="destructive" className="bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-300 dark:border-amber-900 text-[10px] py-0">
                              Kritis
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-12 text-slate-500">
                          Semua stok aman dan terkendali.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </div>

            <div className="p-4 border-t border-slate-100 dark:border-slate-800/40">
              <Link
                href="/persediaan"
                className={cn(
                  buttonVariants({ variant: 'ghost', size: 'sm' }),
                  'w-full flex items-center justify-center gap-1 text-slate-500 hover:text-emerald-800'
                )}
              >
                <span>Lihat Semua Persediaan</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
