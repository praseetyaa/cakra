import React from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfilesWithEmail } from '@/app/actions/permintaan-manual'
import FormPermintaanManual from '@/components/permintaan/FormPermintaanManual'
import { Barang, ProfileWithEmail } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function PermintaanManualPage() {
  const supabase = await createClient()

  // 1. Verify user session & role
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['pengelola', 'pimpinan', 'admin'].includes(profile.role)) {
    redirect('/permintaan')
  }

  // 2. Fetch available barang
  const { data: barangData } = await supabase
    .from('barang')
    .select('*')
    .order('nama', { ascending: true })

  const barangList = (barangData || []) as Barang[]

  // 3. Fetch registered users with email
  const registeredUsers: ProfileWithEmail[] = await getProfilesWithEmail()

  return (
    <FormPermintaanManual
      barangList={barangList}
      registeredUsers={registeredUsers}
    />
  )
}
