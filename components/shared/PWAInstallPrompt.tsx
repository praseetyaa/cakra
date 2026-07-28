'use client'

import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { Download, X, Smartphone, Sparkles, Check, Share, PlusSquare } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState<boolean>(false)
  const [isIOS, setIsIOS] = useState<boolean>(false)
  const [isStandalone, setIsStandalone] = useState<boolean>(false)

  useEffect(() => {
    // 1. Check if already installed / standalone mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true

    if (isStandaloneMode) {
      setIsStandalone(true)
      return
    }

    // 2. Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIphoneOrIpad = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIphoneOrIpad)

    // 3. Listen for BeforeInstallPromptEvent (Android, Chrome, Edge, Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      setDeferredPrompt(promptEvent)

      // Check if user dismissed recently
      const lastDismissed = localStorage.getItem('cakra_pwa_dismissed')
      if (lastDismissed) {
        const daysPassed = (Date.now() - parseInt(lastDismissed, 10)) / (1000 * 60 * 60 * 24)
        if (daysPassed < 3) return // Don't annoy user if dismissed within 3 days
      }

      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // 4. Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('CAKRA PWA Service Worker Registered:', reg.scope))
        .catch((err) => console.error('PWA Service Worker Registration Failed:', err))
    }

    // Fallback for iOS prompt if not standalone & not dismissed recently
    if (isIphoneOrIpad) {
      const lastDismissed = localStorage.getItem('cakra_pwa_dismissed')
      if (!lastDismissed) {
        setShowPrompt(true)
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    setShowPrompt(false)
    await deferredPrompt.prompt()
    const choiceResult = await deferredPrompt.userChoice

    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted CAKRA PWA installation')
    } else {
      console.log('User dismissed CAKRA PWA installation')
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('cakra_pwa_dismissed', Date.now().toString())
  }

  if (isStandalone || !showPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-emerald-500/30 dark:border-emerald-500/40 rounded-2xl shadow-2xl p-5 text-slate-900 dark:text-white relative overflow-hidden">
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3.5 right-3.5 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Tutup"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-4">
          {/* App Logo Icon */}
          <div className="h-14 w-14 rounded-2xl bg-slate-900 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-lg overflow-hidden relative">
            <Image
              src="/icons/icon-192.png"
              alt="Logo CAKRA"
              width={56}
              height={56}
              className="object-cover"
            />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Aplikasi Resmi
              </span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 truncate">
              Install CAKRA PA Kajen
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Pasang di layar utama perangkat Anda untuk akses cepat dan pengalaman aplikasi native tanpa browser.
            </p>
          </div>
        </div>

        {/* Features Checklist */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-800 shrink-0" />
            <span>Akses Cepat Home Screen</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-800 shrink-0" />
            <span>Tampilan Fullscreen</span>
          </div>
        </div>

        {/* Action Buttons */}
        {isIOS ? (
          /* iOS Safari Specific Guide */
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs space-y-1.5">
            <p className="font-semibold text-emerald-950 dark:text-emerald-200 flex items-center gap-1.5">
              <Share className="h-4 w-4 text-emerald-600" /> Cara Install di iPhone/iPad:
            </p>
            <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
              1. Ketuk tombol <span className="font-bold">Bagikan (Share)</span> di bagian bawah browser Safari.<br />
              2. Pilih <span className="font-bold">Tambahkan ke Layar Utama</span> (<PlusSquare className="inline h-3.5 w-3.5 mx-0.5" /> Add to Home Screen).
            </p>
          </div>
        ) : (
          /* Standard Install Button (Android / Chrome / Edge) */
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={handleDismiss}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Nanti Saja
            </button>
            <button
              onClick={handleInstallClick}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-800 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-800/25 active:scale-95 transition-all"
            >
              <Download className="h-4 w-4" />
              Install Sekarang
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
