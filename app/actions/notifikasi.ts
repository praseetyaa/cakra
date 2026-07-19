'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface NotifikasiItem {
  id: string
  user_id: string
  judul: string
  pesan: string | null
  jenis: 'permintaan_baru' | 'disetujui' | 'ditolak' | 'stok_menipis' | null
  dibaca: boolean
  created_at: string
}

export async function getNotifications(): Promise<NotifikasiItem[]> {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    console.error('Error getting user for notifications:', userError)
    return []
  }

  const { data, error } = await supabase
    .from('notifikasi')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching notifications:', error)
    return []
  }

  return (data || []) as NotifikasiItem[]
}

export async function getUnreadNotificationsCount(): Promise<number> {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return 0
  }

  const { count, error } = await supabase
    .from('notifikasi')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('dibaca', false)

  if (error) {
    console.error('Error counting unread notifications:', error)
    return 0
  }

  return count || 0
}

export async function markAsRead(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notifikasi')
    .update({ dibaca: true })
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/notifikasi')
  return { success: true }
}

export async function markAllAsRead() {
  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'Sesi kedaluwarsa. Silakan login kembali.' }
  }

  const { error } = await supabase
    .from('notifikasi')
    .update({ dibaca: true })
    .eq('user_id', user.id)
    .eq('dibaca', false)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/notifikasi')
  return { success: true }
}
