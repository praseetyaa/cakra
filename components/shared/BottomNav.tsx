'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  Package,
  FileText,
  User
} from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/permintaan', label: 'Permintaan', icon: ClipboardList },
  { href: '/persediaan', label: 'Persediaan', icon: Package },
  { href: '/laporan', label: 'Laporan', icon: FileText },
  { href: '/akun', label: 'Akun', icon: User },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 flex justify-around items-center z-50 backdrop-blur-md shadow-lg px-2">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 h-full py-2 transition-all relative ${
              isActive
                ? 'text-emerald-850 dark:text-emerald-400 font-semibold scale-105'
                : 'text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            {isActive && (
              <span className="absolute top-0 w-8 h-1 bg-emerald-800 dark:bg-emerald-450 rounded-full" />
            )}
            <Icon className={`h-5.5 w-5.5 mb-1 transition-transform ${
              isActive ? 'text-emerald-800 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'
            }`} />
            <span className="text-[10px] tracking-wide">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
