'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { markAsRead, markAllAsRead, NotifikasiItem } from '@/app/actions/notifikasi'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ClipboardList,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Bell,
  Check
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ListNotifikasiProps {
  initialNotifications: NotifikasiItem[]
  userId: string
}

export default function ListNotifikasi({ initialNotifications, userId }: ListNotifikasiProps) {
  const [notifications, setNotifications] = useState<NotifikasiItem[]>(initialNotifications)
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL')
  const [isPending, startTransition] = useTransition()

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient()
    
    const channel = supabase
      .channel('notifikasi_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifikasi',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newNotif = payload.new as NotifikasiItem
            setNotifications((prev) => [newNotif, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            const updatedNotif = payload.new as NotifikasiItem
            setNotifications((prev) =>
              prev.map((n) => (n.id === updatedNotif.id ? updatedNotif : n))
            )
          } else if (payload.eventType === 'DELETE') {
            const deletedId = payload.old.id
            setNotifications((prev) => prev.filter((n) => n.id !== deletedId))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const handleMarkAsRead = async (id: string) => {
    startTransition(async () => {
      await markAsRead(id)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, dibaca: true } : n))
      )
    })
  }

  const handleMarkAllAsRead = async () => {
    startTransition(async () => {
      await markAllAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, dibaca: true })))
    })
  }

  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSecs < 10) return 'Baru saja'
    if (diffSecs < 60) return `${diffSecs} detik yang lalu`
    if (diffMins < 60) return `${diffMins} menit yang lalu`
    if (diffHours < 24) return `${diffHours} jam yang lalu`
    if (diffDays === 1) return 'Kemarin'
    return `${diffDays} hari yang lalu`
  }

  const getNotifIcon = (jenis: string | null) => {
    switch (jenis) {
      case 'permintaan_baru':
        return <ClipboardList className="h-5 w-5 text-blue-500" />
      case 'disetujui':
        return <CheckCircle className="h-5 w-5 text-emerald-500 animate-bounce" />
      case 'ditolak':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'stok_menipis':
        return <AlertTriangle className="h-5 w-5 text-amber-500 animate-pulse" />
      default:
        return <Bell className="h-5 w-5 text-slate-500" />
    }
  }

  const getNotifBg = (jenis: string | null, dibaca: boolean) => {
    if (dibaca) return 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
    switch (jenis) {
      case 'permintaan_baru':
        return 'bg-blue-50/40 dark:bg-blue-950/5 border-blue-100 dark:border-blue-900/30'
      case 'disetujui':
        return 'bg-emerald-50/40 dark:bg-emerald-950/5 border-emerald-100 dark:border-emerald-900/30'
      case 'ditolak':
        return 'bg-red-50/40 dark:bg-red-950/5 border-red-100 dark:border-red-900/30'
      case 'stok_menipis':
        return 'bg-amber-50/40 dark:bg-amber-950/5 border-amber-100 dark:border-amber-900/30'
      default:
        return 'bg-slate-50/60 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
    }
  }

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'UNREAD') return !n.dibaca
    return true
  })

  const unreadCount = notifications.filter((n) => !n.dibaca).length

  return (
    <div className="space-y-6">
      {/* Filters & Actions Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Toggle buttons */}
        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg w-fit">
          <button
            onClick={() => setFilter('ALL')}
            className={cn(
              'px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all',
              filter === 'ALL'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            )}
          >
            Semua
          </button>
          <button
            onClick={() => setFilter('UNREAD')}
            className={cn(
              'px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all flex items-center gap-1.5',
              filter === 'UNREAD'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            )}
          >
            Belum Dibaca
            {unreadCount > 0 && (
              <Badge className="bg-emerald-800 dark:bg-emerald-700 text-white font-bold px-1.5 py-0 text-[9px] shadow-sm">
                {unreadCount}
              </Badge>
            )}
          </button>
        </div>

        {/* Mark all as read button */}
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={isPending}
            className="text-xs font-semibold border-slate-200 hover:bg-slate-50 hover:text-emerald-800 flex items-center gap-1.5"
          >
            <Check className="h-4 w-4" />
            Tandai Semua Dibaca
          </Button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotifs.length > 0 ? (
          filteredNotifs.map((notif) => (
            <Card
              key={notif.id}
              className={cn(
                'border shadow-none transition-all duration-200 hover:scale-[1.005] cursor-pointer',
                getNotifBg(notif.jenis, notif.dibaca)
              )}
              onClick={() => {
                if (!notif.dibaca) handleMarkAsRead(notif.id)
              }}
            >
              <CardContent className="p-4 flex gap-4 items-start relative">
                {/* Visual Unread dot indicator */}
                {!notif.dibaca && (
                  <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-emerald-700 animate-ping" />
                )}

                {/* Left side Icon */}
                <div className="p-2.5 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm shrink-0">
                  {getNotifIcon(notif.jenis)}
                </div>

                {/* Content details */}
                <div className="flex-1 space-y-1 pr-6">
                  <div className="flex items-center gap-2">
                    <h3 className={cn(
                      'text-sm tracking-tight',
                      notif.dibaca ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-900 dark:text-white font-bold'
                    )}>
                      {notif.judul}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {notif.pesan}
                  </p>
                  <span className="text-[10px] text-slate-400 block pt-1 font-medium">
                    {getRelativeTime(notif.created_at)}
                  </span>
                </div>

                {/* Action buttons on notification item */}
                {!notif.dibaca && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMarkAsRead(notif.id)
                    }}
                    className="text-slate-400 hover:text-emerald-700 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 self-center"
                    title="Tandai dibaca"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center rounded-xl">
            <Bell className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Tidak ada notifikasi yang sesuai filter.</p>
          </div>
        )}
      </div>
    </div>
  )
}
