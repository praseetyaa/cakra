'use client'

import React, { useActionState } from 'react'
import Link from 'next/link'
import { signUpWithEmail } from '@/app/actions/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

const initialState = {
  error: null as string | null,
}

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(
    async (prevState: any, formData: FormData) => {
      const res = await signUpWithEmail(prevState, formData)
      if (res && res.error) {
        return { error: res.error }
      }
      return { error: null }
    },
    initialState
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md shadow-xl border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm">
        <CardHeader className="space-y-2 text-center pb-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
            <svg
              className="h-6 w-6 text-emerald-800 dark:text-emerald-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Daftar Akun CAKRA
          </CardTitle>
          <CardDescription className="text-sm text-slate-500 dark:text-slate-400">
            Aplikasi Catatan Kendali Persediaan Pengadilan Agama Kajen
          </CardDescription>
        </CardHeader>
        <CardContent>
          {state.error && (
            <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300 rounded mb-4">
              {state.error}
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama Lengkap</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="Nama Lengkap sesuai SK"
                required
                className="focus:ring-emerald-800 dark:focus:ring-emerald-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="pegawai@pa-kajen.go.id"
                required
                className="focus:ring-emerald-800 dark:focus:ring-emerald-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Minimal 6 karakter"
                required
                className="focus:ring-emerald-800 dark:focus:ring-emerald-700"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Ulangi password"
                required
                className="focus:ring-emerald-800 dark:focus:ring-emerald-700"
              />
            </div>
            <Button
              type="submit"
              disabled={isPending}
              className="w-full bg-emerald-800 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-medium shadow-md transition-all active:scale-[0.98]"
            >
              {isPending ? 'Mendaftar...' : 'Daftar Akun'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center border-t border-slate-100 dark:border-slate-800/50 pt-4">
          <p className="text-xs text-slate-500">
            Sudah memiliki akun?{' '}
            <Link
              href="/login"
              className="text-emerald-800 dark:text-emerald-400 font-semibold hover:underline"
            >
              Masuk Sekarang
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
