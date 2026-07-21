'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signUpWithEmail(prevState: unknown, formData: FormData) {
  const name = (formData.get('name') as string || '').trim()
  const email = (formData.get('email') as string || '').trim()
  const password = formData.get('password') as string || ''
  const confirmPassword = formData.get('confirmPassword') as string || ''

  if (!name || !email || !password || !confirmPassword) {
    return { error: 'Semua kolom wajib diisi.' }
  }

  if (password !== confirmPassword) {
    return { error: 'Konfirmasi password tidak cocok.' }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
        data: {
          nama_lengkap: name,
        },
      },
    })

    if (error) {
      const msg = error.message || ''
      return { error: typeof msg === 'string' && msg.length > 0 ? msg : 'Gagal melakukan pendaftaran.' }
    }
  } catch (err: any) {
    if (err?.digest?.startsWith?.('NEXT_REDIRECT') || err?.message === 'NEXT_REDIRECT') {
      throw err
    }
    return { error: 'Terjadi kesalahan saat pendaftaran.' }
  }

  redirect('/login?registered=true')
}

export async function signInWithEmail(prevState: unknown, formData: FormData) {
  const email = (formData.get('email') as string || '').trim()
  const password = formData.get('password') as string || ''

  if (!email || !password) {
    return { error: 'Email dan password wajib diisi.' }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Supabase Auth Signin Error:', error)
      const msg = error.message || ''
      if (msg.toLowerCase().includes('invalid login credentials')) {
        return { error: 'Email atau password yang Anda masukkan salah.' }
      }
      if (msg.toLowerCase().includes('email not confirmed')) {
        return { error: 'Email Anda belum dikonfirmasi. Cek inbox email Anda.' }
      }
      return { error: typeof msg === 'string' && msg !== '{}' && msg.length > 0 ? msg : 'Email atau password yang Anda masukkan salah.' }
    }

    if (!data?.user) {
      return { error: 'User tidak ditemukan.' }
    }
  } catch (err: any) {
    if (err?.digest?.startsWith?.('NEXT_REDIRECT') || err?.message === 'NEXT_REDIRECT') {
      throw err
    }
    console.error('Unexpected Signin Exception:', err)
    return { error: 'Gagal melakukan login. Silakan periksa kembali email dan password Anda.' }
  }

  redirect('/dashboard')
}

export async function signOutUser() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function signInWithGoogle() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message || 'Gagal login dengan Google.' }
  }

  if (data?.url) {
    redirect(data.url)
  }
}
