'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOutUser } from '@/app/actions/auth'
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  FileText,
  User,
  LogOut,
  ChevronRight,
  Bell
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface UserProfile {
  nama_lengkap: string
  role: string
  avatar_url?: string | null
}

interface SidebarProps {
  profile: UserProfile | null
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/permintaan', label: 'Permintaan', icon: ClipboardList },
  { href: '/persediaan', label: 'Persediaan', icon: Package },
  { href: '/laporan', label: 'Laporan', icon: FileText },
  { href: '/akun', label: 'Akun Saya', icon: User },
]

export default function Sidebar({ profile }: SidebarProps) {
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
      const channelName = `sidebar_notif_${user.id}_${Math.random().toString(36).substring(2, 9)}`

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

  return (
    <aside className="hidden md:flex flex-col w-64 bg-emerald-900 border-r border-emerald-950 text-white h-screen justify-between shrink-0">
      {/* Brand Header */}
      <div className="p-6">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-800 border border-emerald-700 shadow-md group-hover:bg-emerald-700 transition-all">
            <svg
              className="h-6 w-6 text-emerald-100"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 002 2h2a2 2 0 002-2"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider text-emerald-50">CAKRA</h1>
            <p className="text-[10px] text-emerald-300 font-medium">PA Kajen Persediaan</p>
          </div>
        </Link>
      </div>

      {/* Main Navigation Links */}
      <div className="flex-1 px-4 py-2 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-emerald-800 text-white shadow-inner font-semibold'
                  : 'text-emerald-100/80 hover:bg-emerald-850 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-5 w-5 transition-transform group-hover:scale-110 ${
                  isActive ? 'text-emerald-300' : 'text-emerald-200/60'
                }`} />
                <span>{item.label}</span>
              </div>
              <ChevronRight className={`h-4 w-4 opacity-0 transition-opacity ${
                isActive ? 'opacity-100 text-emerald-300' : 'group-hover:opacity-50 text-emerald-200/30'
              }`} />
            </Link>
          )
        })}
      </div>

      {/* User Information and Logout Box */}
      <div className="p-4 border-t border-emerald-850 bg-emerald-950/20">
        {profile && (
          <div className="flex items-center justify-between gap-3 px-2 py-3 mb-3 bg-emerald-955/30 border border-emerald-800/40 rounded-xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-full bg-emerald-850 border border-emerald-700/60 flex items-center justify-center font-bold text-emerald-200 text-sm shadow-sm overflow-hidden shrink-0">
                {profile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.avatar_url} alt={profile.nama_lengkap} className="h-full w-full object-cover" />
                ) : (
                  profile.nama_lengkap.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-emerald-50 truncate">{profile.nama_lengkap}</p>
                <p className="text-[10px] text-emerald-400 font-medium truncate">{formatRole(profile.role)}</p>
              </div>
            </div>
            <Link
              href="/notifikasi"
              className={`relative p-2 rounded-lg transition-all active:scale-95 ${
                pathname === '/notifikasi'
                  ? 'bg-emerald-800 text-white border border-emerald-700/60'
                  : 'text-emerald-200/70 hover:text-white hover:bg-emerald-800/40'
              }`}
              title="Notifikasi"
            >
              <Bell className="h-4.5 w-4.5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 border border-emerald-900 animate-pulse" />
              )}
            </Link>
          </div>
        )}

        <form action={signOutUser}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-medium text-red-200 hover:text-white hover:bg-red-900/30 border border-transparent hover:border-red-900/40 transition-all active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4 text-red-300/80" />
            <span>Keluar Sesi</span>
          </button>
        </form>
      </div>
    </aside>
  )
}
