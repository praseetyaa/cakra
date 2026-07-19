'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(prevState: unknown, formData: FormData) {
  const nama_lengkap = formData.get('nama_lengkap') as string
  const unit_kerja = formData.get('unit_kerja') as string
  const avatar_url = formData.get('avatar_url') as string || null

  if (!nama_lengkap) {
    return { error: 'Nama lengkap wajib diisi.' }
  }

  const supabase = await createClient()

  // Get current authenticated user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { error: 'Sesi kedaluwarsa. Silakan login kembali.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      nama_lengkap,
      unit_kerja,
      avatar_url
    })
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/akun')
  return { success: true }
}
