import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getNotifications } from '@/app/actions/notifikasi'
import ListNotifikasi from '@/components/notifikasi/ListNotifikasi'

export default async function NotifikasiPage() {
  const supabase = await createClient()

  // 1. Get current authenticated user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 2. Fetch initial notifications
  const initialNotifications = await getNotifications()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Notifikasi
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Informasi real-time mengenai status pengajuan barang dan kondisi persediaan logistik kantor.
        </p>
      </div>

      <ListNotifikasi
        initialNotifications={initialNotifications}
        userId={user.id}
      />
    </div>
  )
}
