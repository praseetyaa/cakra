'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { UserRole } from '@/lib/types'

export type { UserRole }

export interface UserProfileItem {
  id: string
  nama_lengkap: string
  unit_kerja: string | null
  role: UserRole
  created_at: string
}

export async function listUsers() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'Sesi kedaluwarsa. Silakan login kembali.' }
  }

  // Check admin privileges
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Akses ditolak. Hanya administrator yang dapat melihat daftar pengguna.' }
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, nama_lengkap, unit_kerja, role, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return { error: error.message }
  }

  return { data: data as UserProfileItem[] }
}

export async function updateUserRole(userId: string, newRole: UserRole) {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'Sesi kedaluwarsa. Silakan login kembali.' }
  }

  // Security check: caller must be admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return { error: 'Akses ditolak. Hanya administrator yang dapat mengubah hak akses pengguna.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/pengguna')
  return { success: true }
}
