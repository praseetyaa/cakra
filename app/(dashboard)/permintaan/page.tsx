import React from 'react'
import { createClient } from '@/lib/supabase/server'
import ListPermintaan, { RequestItem, Barang } from '@/components/permintaan/ListPermintaan'

interface UserProfile {
  nama_lengkap: string
  role: string
  unit_kerja: string | null
}

export default async function PermintaanPage() {
  const supabase = await createClient()

  // 1. Get authenticated user identity
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let userRole = 'pemohon'
  let userProfile: UserProfile | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('nama_lengkap, role, unit_kerja')
      .eq('id', user.id)
      .single()

    if (profile) {
      userRole = profile.role
      userProfile = profile as UserProfile
    }
  }

  // 2. Fetch requests (conditional based on role - Defense in Depth)
  let query = supabase
    .from('permintaan')
    .select(`
      id,
      nomor,
      tanggal,
      unit_kerja,
      keperluan,
      status,
      profiles!pemohon_id (
        nama_lengkap
      )
    `)
    .order('tanggal', { ascending: false })

  if (userRole === 'pemohon' && user) {
    query = query.eq('pemohon_id', user.id)
  }

  const { data: requests, error: reqError } = await query
  if (reqError) {
    console.error('Failed to fetch requests list:', reqError)
  }

  // 3. Fetch barang list (for request form selection options)
  const { data: barangList, error: barangError } = await supabase
    .from('barang')
    .select('id, nama, stok, satuan')
    .order('nama', { ascending: true })

  if (barangError) {
    console.error('Failed to fetch stock options:', barangError)
  }

  const requestsList = (requests || []) as unknown as RequestItem[]
  const stockOptions = (barangList || []) as unknown as Barang[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Permintaan Barang Kantor (ATK)
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Daftar pengajuan dan status permintaan barang habis pakai Pengadilan Agama Kajen.
        </p>
      </div>

      <ListPermintaan
        initialRequests={requestsList}
        barangList={stockOptions}
        userRole={userRole}
        userProfile={userProfile}
      />
    </div>
  )
}
