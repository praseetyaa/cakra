'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfile } from '@/app/actions/profile'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { User, Shield, Key, Loader2, Check, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProfileData {
  id: string
  nama_lengkap: string
  unit_kerja: string | null
  role: string
  avatar_url: string | null
  email: string
}

interface DetailAkunProps {
  initialProfile: ProfileData
}

const AVATAR_OPTIONS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Felix',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Gizmo',
  'https://api.dicebear.com/7.x/initials/svg?seed=PA'
]

export default function DetailAkun({ initialProfile }: DetailAkunProps) {
  const router = useRouter()
  const profile = initialProfile
  
  // Profile update state
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(initialProfile.avatar_url)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isProfilePending, startProfileTransition] = useTransition()

  // Password change state
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isPasswordPending, setIsPasswordPending] = useState(false)

  const formatRole = (role: string) => {
    switch (role) {
      case 'pemohon':
        return 'Pemohon'
      case 'pengelola':
        return 'Pengelola Stok'
      case 'pimpinan':
        return 'Pimpinan'
      case 'admin':
        return 'Administrator'
      default:
        return role
    }
  }

  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setProfileMsg(null)
    const formData = new FormData(e.currentTarget)
    if (selectedAvatar) {
      formData.set('avatar_url', selectedAvatar)
    }

    startProfileTransition(async () => {
      const result = await updateProfile({}, formData)
      if (result.error) {
        setProfileMsg({ type: 'error', text: result.error })
      } else {
        setProfileMsg({ type: 'success', text: 'Profil berhasil diperbarui!' })
        // Force refresh layout to update sidebar name & avatar
        router.refresh()
      }
    })
  }

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setPasswordMsg(null)

    if (!password || !confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Semua kolom sandi wajib diisi.' })
      return
    }

    if (password !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Konfirmasi password tidak cocok.' })
      return
    }

    if (password.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Sandi minimal harus terdiri dari 6 karakter.' })
      return
    }

    setIsPasswordPending(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      
      if (error) {
        setPasswordMsg({ type: 'error', text: error.message })
      } else {
        setPasswordMsg({ type: 'success', text: 'Sandi berhasil diperbarui!' })
        setPassword('')
        setConfirmPassword('')
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Gagal merubah sandi.'
      setPasswordMsg({ type: 'error', text: errMsg })
    } finally {
      setIsPasswordPending(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Profile Details Edit Card */}
      <Card className="lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800/40 pb-4">
          <CardTitle className="text-sm font-bold uppercase text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
            <User className="h-4.5 w-4.5" /> Ubah Profil Saya
          </CardTitle>
          <CardDescription className="text-xs">Sesuaikan informasi profil pegawai Anda di sistem CAKRA.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleProfileSubmit} className="space-y-6">
            {/* Avatar Selector */}
            <div className="space-y-3">
              <Label className="text-xs font-semibold">Foto Profil / Avatar</Label>
              <div className="flex flex-wrap items-center gap-4">
                {/* Current Avatar Frame */}
                <div className="h-16 w-16 rounded-full bg-emerald-50 dark:bg-slate-800 border-2 border-emerald-800/40 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                  {selectedAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selectedAvatar} alt="Profile Preview" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-2xl font-bold text-emerald-800">
                      {profile.nama_lengkap.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Avatar Choice Options */}
                <div className="flex-1 flex flex-wrap gap-2.5">
                  {AVATAR_OPTIONS.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedAvatar(url)}
                      className={cn(
                        'h-9 w-9 rounded-full overflow-hidden border-2 bg-slate-50 transition-all hover:scale-105 active:scale-95 shadow-sm',
                        selectedAvatar === url ? 'border-emerald-850 scale-105 ring-2 ring-emerald-850/20' : 'border-slate-200 hover:border-slate-400'
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt={`Avatar option ${idx + 1}`} className="h-full w-full object-cover" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setSelectedAvatar(null)}
                    className={cn(
                      'px-2.5 py-1 text-[10px] font-semibold border rounded-lg hover:bg-slate-50 active:scale-95 transition-all text-slate-500 hover:text-slate-900 border-slate-200 shrink-0 self-center',
                      selectedAvatar === null ? 'border-emerald-800 text-emerald-800 bg-emerald-50/20' : ''
                    )}
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>

            {/* Profile fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nama_lengkap" className="text-xs font-semibold">Nama Lengkap</Label>
                <Input
                  id="nama_lengkap"
                  name="nama_lengkap"
                  defaultValue={profile.nama_lengkap}
                  required
                  placeholder="Masukkan nama lengkap"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit_kerja" className="text-xs font-semibold">Unit Kerja / Ruangan</Label>
                <Input
                  id="unit_kerja"
                  name="unit_kerja"
                  defaultValue={profile.unit_kerja || ''}
                  placeholder="Masukkan unit kerja (mis: Kepegawaian, IT)"
                />
              </div>
            </div>

            {/* Profile submit button */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/40 pt-4 gap-4">
              {profileMsg && (
                <span className={cn(
                  'text-xs flex items-center gap-1.5',
                  profileMsg.type === 'success' ? 'text-emerald-700 font-medium' : 'text-red-600'
                )}>
                  {profileMsg.type === 'success' ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                  {profileMsg.text}
                </span>
              )}
              <div className="flex-1" />
              <Button
                type="submit"
                disabled={isProfilePending}
                className="bg-emerald-800 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm flex items-center gap-2"
              >
                {isProfilePending && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan Perubahan
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="lg:col-span-1 space-y-8">
        {/* Change Password Card */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/40 pb-4">
            <CardTitle className="text-sm font-bold uppercase text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
              <Key className="h-4.5 w-4.5" /> Ubah Kata Sandi
            </CardTitle>
            <CardDescription className="text-xs">Amankan akun dengan memperbarui kata sandi secara berkala.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Sandi Baru</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Sandi Baru</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/40 flex flex-col gap-2.5">
                {passwordMsg && (
                  <span className={cn(
                    'text-xs flex items-center gap-1.5',
                    passwordMsg.type === 'success' ? 'text-emerald-700 font-medium' : 'text-red-600'
                  )}>
                    {passwordMsg.type === 'success' ? <Check className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                    {passwordMsg.text}
                  </span>
                )}
                <Button
                  type="submit"
                  disabled={isPasswordPending}
                  className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm flex items-center justify-center gap-2"
                >
                  {isPasswordPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Ubah Sandi
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Read-only details / Role Card */}
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/40 pb-4">
            <CardTitle className="text-sm font-bold uppercase text-slate-400 flex items-center gap-2">
              <Shield className="h-4.5 w-4.5" /> Detil Hak Akses
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs">
            <div className="flex justify-between border-b border-slate-50 dark:border-slate-800/20 pb-2">
              <span className="text-slate-400">Email Akun</span>
              <span className="font-semibold text-slate-750 dark:text-slate-350">{profile.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Peran Sistem</span>
              <span className="font-bold text-emerald-800 dark:text-emerald-450 uppercase">{formatRole(profile.role)}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
