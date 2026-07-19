'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOutUser } from '@/app/actions/auth'
import { LogOut, Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface UserProfile {
  nama_lengkap: string
  role: string
  avatar_url?: string | null
}

interface NavbarProps {
  profile: UserProfile | null
}

export default function Navbar({ profile }: NavbarProps) {
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = React.useState(0)

  React.useEffect(() => {
    const supabase = createClient()
    let activeChannel: ReturnType<typeof supabase.channel> | null = null
    let isMounted = true

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!isMounted || !user) return

      // Initial count fetch
      const { count } = await supabase
        .from('notifikasi')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('dibaca', false)

      if (!isMounted) return
      setUnreadCount(count || 0)

      // Use a dynamic channel name to prevent cache collision in Supabase client instance
      const channelName = `navbar_notif_${user.id}_${Math.random().toString(36).substring(2, 9)}`

      // Subscribe to public.notifikasi modifications
      activeChannel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifikasi',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            if (!isMounted) return
            supabase
              .from('notifikasi')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('dibaca', false)
              .then(({ count: newCount }) => {
                if (isMounted) {
                  setUnreadCount(newCount || 0)
                }
              })
          }
        )
        .subscribe()
    }

    init()

    return () => {
      isMounted = false
      if (activeChannel) {
        supabase.removeChannel(activeChannel)
      }
    }
  }, [])

  return (
    <header className="md:hidden flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 px-4 backdrop-blur-sm sticky top-0 z-40">
      <Link href="/dashboard" className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-800 shadow-sm">
          <svg
            className="h-5 w-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2"
            />
          </svg>
        </div>
        <span className="font-bold text-slate-900 dark:text-white tracking-wide text-sm">
          CAKRA
        </span>
      </Link>

      <div className="flex items-center gap-3">
        {profile && (
          <div className="flex items-center gap-2">
            <Link
              href="/notifikasi"
              className={cn(
                'relative p-2 rounded-lg transition-all',
                pathname === '/notifikasi'
                  ? 'bg-slate-100 dark:bg-slate-800 text-emerald-800 dark:text-emerald-400'
                  : 'text-slate-500 hover:text-emerald-800 dark:text-slate-400 dark:hover:text-emerald-400'
              )}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white dark:border-slate-900" />
              )}
            </Link>
            <div className="h-8 w-8 rounded-full bg-emerald-800 border border-emerald-700/60 flex items-center justify-center font-bold text-white text-xs shadow-sm overflow-hidden">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt={profile.nama_lengkap} className="h-full w-full object-cover" />
              ) : (
                profile.nama_lengkap.charAt(0).toUpperCase()
              )}
            </div>
          </div>
        )}

        <form action={signOutUser}>
          <button
            type="submit"
            className="p-2 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all"
            title="Keluar"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </form>
      </div>
    </header>
  )
}
