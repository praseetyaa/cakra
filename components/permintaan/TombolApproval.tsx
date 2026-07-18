'use client'

import React, { useState, useTransition } from 'react'
import { resolvePermintaan } from '@/app/actions/permintaan'
import { Button } from '@/components/ui/button'
import { Check, X, ShieldAlert } from 'lucide-react'

interface TombolApprovalProps {
  requestId: string
}

export default function TombolApproval({ requestId }: TombolApprovalProps) {
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleResolve = (status: 'disetujui' | 'ditolak') => {
    setErrorMsg(null)
    const confirmationMsg =
      status === 'disetujui'
        ? 'Apakah Anda yakin ingin menyetujui permintaan ini? Stok barang akan otomatis dikurangi.'
        : 'Apakah Anda yakin ingin menolak permintaan ini?'

    if (!confirm(confirmationMsg)) return

    startTransition(async () => {
      const result = await resolvePermintaan(requestId, status)
      if (result && result.error) {
        setErrorMsg(result.error)
      }
    })
  }

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300 rounded flex items-start gap-2">
          <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-red-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="flex gap-4">
        {/* Reject button */}
        <Button
          type="button"
          disabled={isPending}
          variant="outline"
          onClick={() => handleResolve('ditolak')}
          className="flex-1 border-red-200 dark:border-red-900 text-red-650 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20 dark:hover:text-red-400 font-semibold"
        >
          <X className="h-4.5 w-4.5 mr-2" />
          Tolak Permintaan
        </Button>

        {/* Approve button */}
        <Button
          type="button"
          disabled={isPending}
          onClick={() => handleResolve('disetujui')}
          className="flex-1 bg-emerald-800 hover:bg-emerald-700 dark:bg-emerald-750 dark:hover:bg-emerald-700 text-white font-semibold shadow"
        >
          <Check className="h-4.5 w-4.5 mr-2" />
          Setujui Permintaan
        </Button>
      </div>
    </div>
  )
}
