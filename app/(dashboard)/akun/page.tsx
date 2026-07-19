import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DetailAkun from '@/components/akun/DetailAkun'

export default async function AkunPage() {
  const supabase = await createClient()

  // 1. Get current authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Fetch profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('nama_lengkap, unit_kerja, role, avatar_url')
    .eq('id', user.id)
    .single()

  const profileData = {
    id: user.id,
    nama_lengkap: profile?.nama_lengkap || user.email || 'Pegawai',
    unit_kerja: profile?.unit_kerja || null,
    role: profile?.role || 'pemohon',
    avatar_url: profile?.avatar_url || null,
    email: user.email || '',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Akun Saya
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Kelola profil pegawai, unit kerja, foto avatar, dan kata sandi masuk.
        </p>
      </div>

      <DetailAkun initialProfile={profileData} />
    </div>
  )
}
