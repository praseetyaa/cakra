'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, X, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface NotifikasiPayload {
  id: string
  judul: string
  pesan: string
  jenis: string
  created_at?: string
}

export default function PushNotificationListener() {
  const [toastNotif, setToastNotif] = useState<NotifikasiPayload | null>(null)
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>('default')

  useEffect(() => {
    // Check initial notification permission
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission)
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((res) => {
          setPermissionStatus(res)
        })
      }
    }

    const supabase = createClient()
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function initRealtime() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      channel = supabase
        .channel(`push_notif_${user.id}_${Math.random().toString(36).substring(2, 7)}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifikasi',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotif = payload.new as NotifikasiPayload

            // 1. Show In-App Floating Toast
            setToastNotif(newNotif)

            // 2. Play Web Audio Beep/Chime
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)()
              const osc = audioCtx.createOscillator()
              const gain = audioCtx.createGain()
              osc.type = 'sine'
              osc.frequency.setValueAtTime(587.33, audioCtx.currentTime) // D5
              osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15) // A5
              gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
              gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3)
              osc.connect(gain)
              gain.connect(audioCtx.destination)
              osc.start()
              osc.stop(audioCtx.currentTime + 0.3)
            } catch {
              // Audio context blocked by browser autoplay policy if user hasn't interacted
            }

            // 3. Trigger Browser System Push Notification if permission granted
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                const sysNotif = new Notification(newNotif.judul || 'Notifikasi Baru CAKRA', {
                  body: newNotif.pesan,
                  icon: '/favicon.ico',
                  tag: newNotif.id,
                })
                sysNotif.onclick = () => {
                  window.focus()
                  window.location.href = '/notifikasi'
                }
              } catch (e) {
                console.error('System notification error:', e)
              }
            }
          }
        )
        .subscribe()
    }

    initRealtime()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  // Auto-dismiss toast after 6 seconds
  useEffect(() => {
    if (toastNotif) {
      const timer = setTimeout(() => {
        setToastNotif(null)
      }, 6000)
      return () => clearTimeout(timer)
    }
  }, [toastNotif])

  if (!toastNotif) return null

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md w-full animate-in slide-in-from-top-5 fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 border border-emerald-500/30 shadow-2xl rounded-xl p-4 flex items-start gap-3 backdrop-blur-md">
        <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 shrink-0 mt-0.5">
          <Bell className="h-5 w-5 animate-bounce" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-semibold text-sm text-slate-900 dark:text-white truncate">
              {toastNotif.judul}
            </h4>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-400">
              Baru
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
            {toastNotif.pesan}
          </p>
          <div className="mt-2.5 flex items-center gap-3">
            <Link
              href="/notifikasi"
              onClick={() => setToastNotif(null)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 dark:text-emerald-400 hover:underline"
            >
              Lihat Notifikasi <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
        <button
          onClick={() => setToastNotif(null)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
