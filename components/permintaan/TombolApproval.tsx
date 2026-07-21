'use client'

import React, { useState, useTransition } from 'react'
import { resolvePermintaan } from '@/app/actions/permintaan'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Check, X, ShieldAlert, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react'

interface TombolApprovalProps {
  requestId: string
}

export default function TombolApproval({ requestId }: TombolApprovalProps) {
  const [isPending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<'disetujui' | 'ditolak' | null>(null)

  const handleExecute = () => {
    if (!confirmAction) return
    const action = confirmAction
    setErrorMsg(null)

    startTransition(async () => {
      const result = await resolvePermintaan(requestId, action)
      setConfirmAction(null)
      if (result && result.error) {
        setErrorMsg(result.error)
      }
    })
  }

  return (
    <div className="space-y-4">
      {errorMsg && (
        <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300 rounded flex items-start gap-2">
          <ShieldAlert className="h-4.5 w-4.5 shrink-0 text-red-600 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="flex gap-4">
        {/* Reject button */}
        <Button
          type="button"
          disabled={isPending}
          variant="outline"
          onClick={() => {
            setErrorMsg(null)
            setConfirmAction('ditolak')
          }}
          className="flex-1 border-red-200 dark:border-red-900 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20 dark:hover:text-red-400 font-semibold"
        >
          <X className="h-4.5 w-4.5 mr-2" />
          Tolak Permintaan
        </Button>

        {/* Approve button */}
        <Button
          type="button"
          disabled={isPending}
          onClick={() => {
            setErrorMsg(null)
            setConfirmAction('disetujui')
          }}
          className="flex-1 bg-emerald-800 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600 text-white font-semibold shadow"
        >
          <Check className="h-4.5 w-4.5 mr-2" />
          Setujui Permintaan
        </Button>
      </div>

      {/* Confirmation Dialog Modal */}
      <Dialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-3">
              {confirmAction === 'disetujui' ? (
                <div className="p-2.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 shrink-0">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
              ) : (
                <div className="p-2.5 rounded-full bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 shrink-0">
                  <AlertTriangle className="h-6 w-6" />
                </div>
              )}
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                {confirmAction === 'disetujui' ? 'Setujui Permintaan Barang?' : 'Tolak Permintaan Barang?'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
              {confirmAction === 'disetujui' ? (
                <span>
                  Apakah Anda yakin ingin menyetujui pengajuan permintaan barang ini? Stok persediaan di gudang akan otomatis dikurangi secara langsung.
                </span>
              ) : (
                <span>
                  Apakah Anda yakin ingin menolak pengajuan permintaan barang ini? Status permintaan akan diubah menjadi ditolak.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmAction(null)}
              disabled={isPending}
              className="text-xs"
            >
              Batal
            </Button>
            {confirmAction === 'disetujui' ? (
              <Button
                type="button"
                onClick={handleExecute}
                disabled={isPending}
                className="bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Ya, Setujui Permintaan
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleExecute}
                disabled={isPending}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Ya, Tolak Permintaan
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
