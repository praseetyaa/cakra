'use client'

import React, { useState, useTransition } from 'react'
import { createUserProvisioning } from '@/app/actions/pengguna'
import type { UserRole } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { UserPlus, AlertCircle } from 'lucide-react'

interface ModalTambahProvisioningProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export default function ModalTambahProvisioning({
  open,
  onOpenChange,
  onSuccess,
}: ModalTambahProvisioningProps) {
  const [email, setEmail] = useState('')
  const [namaLengkap, setNamaLengkap] = useState('')
  const [unitKerja, setUnitKerja] = useState('')
  const [role, setRole] = useState<UserRole>('pemohon')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!email || !email.includes('@')) {
      setErrorMsg('Email Google tidak valid.')
      return
    }

    startTransition(async () => {
      const res = await createUserProvisioning(email, namaLengkap, unitKerja, role)
      if (res.success) {
        setEmail('')
        setNamaLengkap('')
        setUnitKerja('')
        setRole('pemohon')
        onSuccess()
        onOpenChange(false)
      } else {
        setErrorMsg(res.error || 'Gagal menyimpan pre-provisioning user.')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[485px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-white text-lg font-bold">
              <UserPlus className="h-5 w-5 text-emerald-800 dark:text-emerald-400" />
              Pre-Assign Role Pengguna Baru
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Daftarkan email Google pegawai dan tentukan role-nya sebelum mereka melakukan login pertama kali ke CAKRA.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {errorMsg && (
              <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300 rounded flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Email Google <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="contoh: pegawai@pa-kajen.go.id"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="text-xs focus:ring-emerald-800"
              />
              <p className="text-[11px] text-slate-400">
                Email Google yang akan digunakan pegawai saat mengklik &quot;Masuk dengan Google&quot;.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nama" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nama Lengkap (Opsional)
              </Label>
              <Input
                id="nama"
                type="text"
                placeholder="Ahmad Pengelola, S.Kom."
                value={namaLengkap}
                onChange={(e) => setNamaLengkap(e.target.value)}
                className="text-xs focus:ring-emerald-800"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="unit_kerja" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Unit Kerja / Subbagian (Opsional)
              </Label>
              <Input
                id="unit_kerja"
                type="text"
                placeholder="Subbag Umum & Keuangan"
                value={unitKerja}
                onChange={(e) => setUnitKerja(e.target.value)}
                className="text-xs focus:ring-emerald-800"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Role / Hak Akses <span className="text-red-500">*</span>
              </Label>
              <Select value={role} onValueChange={(val) => setRole(val as UserRole)}>
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Pilih Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pemohon" className="text-xs">
                    Pemohon (Pegawai/Pengaju Permintaan)
                  </SelectItem>
                  <SelectItem value="pengelola" className="text-xs">
                    Pengelola Stok (Petugas ATK)
                  </SelectItem>
                  <SelectItem value="pimpinan" className="text-xs">
                    Pimpinan / Ketua PA Kajen
                  </SelectItem>
                  <SelectItem value="admin" className="text-xs">
                    Administrator Sistem
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-semibold"
            >
              {isPending ? 'Menyimpan...' : 'Simpan Provisioning'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
