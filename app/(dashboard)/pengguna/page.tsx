import React from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listUsers, listUserProvisioning } from '@/app/actions/pengguna'
import TabelPengguna from '@/components/pengguna/TabelPengguna'
import { ShieldAlert, Users, ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default async function PenggunaPage() {
  const supabase = await createClient()

  // 1. Get current authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Security Check: verify user profile is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role || 'pemohon'

  if (userRole !== 'admin') {
    return (
      <div className="space-y-6 text-center py-16 max-w-md mx-auto">
        <ShieldAlert className="h-16 w-16 text-red-600 mx-auto animate-bounce" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Akses Terbatas</h1>
          <p className="text-xs text-slate-500">
            Halaman Manajemen Hak Akses Pengguna hanya dapat diakses oleh Administrator Sistem.
          </p>
        </div>
        <Link href="/dashboard" className={cn(buttonVariants({ variant: 'default' }), 'bg-emerald-800 hover:bg-emerald-700 text-white text-xs')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali ke Dashboard
        </Link>
      </div>
    )
  }

  // 3. Fetch active user list and provisioning list
  const { data: users, error: usersError } = await listUsers()
  const { data: provisioningList } = await listUserProvisioning()

  if (usersError || !users) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300">
        <p className="text-xs font-semibold">Gagal memuat daftar pengguna: {usersError}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>Pengaturan</span>
            <span>/</span>
            <span className="text-slate-800 dark:text-slate-200 font-semibold">Manajemen Pengguna</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1 flex items-center gap-2.5">
            <Users className="h-6 w-6 text-emerald-800 dark:text-emerald-400" />
            Kelola Hak Akses & Role Pengguna
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Atur role pengguna aktif serta daftarkan email Google pegawai baru (pre-assign role) sebelum mereka login ke aplikasi CAKRA.
          </p>
        </div>
      </div>

      {/* Users Table & Provisioning Component */}
      <TabelPengguna
        initialUsers={users}
        initialProvisioning={provisioningList || []}
        currentUserId={user.id}
      />
    </div>
  )
}
