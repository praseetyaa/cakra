'use client'

import React, { useState, useTransition } from 'react'
import { updateUserRole, deleteUserProvisioning } from '@/app/actions/pengguna'
import type { UserProfileItem, UserProvisioning, UserRole } from '@/lib/types'
import ModalTambahProvisioning from './ModalTambahProvisioning'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Search, UserCheck, ShieldAlert, CheckCircle2, User, UserPlus, Trash2, Mail } from 'lucide-react'

interface TabelPenggunaProps {
  initialUsers: UserProfileItem[]
  initialProvisioning: UserProvisioning[]
  currentUserId: string
}

const ROLE_OPTIONS: { value: UserRole; label: string; badgeStyle: string }[] = [
  {
    value: 'pemohon',
    label: 'Pemohon',
    badgeStyle: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
  },
  {
    value: 'pengelola',
    label: 'Pengelola Stok',
    badgeStyle: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300',
  },
  {
    value: 'pimpinan',
    label: 'Pimpinan',
    badgeStyle: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300',
  },
  {
    value: 'admin',
    label: 'Administrator',
    badgeStyle: 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300',
  },
]

export default function TabelPengguna({
  initialUsers,
  initialProvisioning,
  currentUserId,
}: TabelPenggunaProps) {
  const [users, setUsers] = useState<UserProfileItem[]>(initialUsers)
  const [provisioningList, setProvisioningList] = useState<UserProvisioning[]>(initialProvisioning)
  const [searchQuery, setSearchQuery] = useState('')
  const [isPending, startTransition] = useTransition()
  const [activeUserId, setActiveUserId] = useState<string | null>(null)
  const [activeEmail, setActiveEmail] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase()
    const nameMatch = u.nama_lengkap.toLowerCase().includes(q)
    const unitMatch = (u.unit_kerja || '').toLowerCase().includes(q)
    const roleMatch = u.role.toLowerCase().includes(q)
    return nameMatch || unitMatch || roleMatch
  })

  const filteredProvisioning = provisioningList.filter((p) => {
    const q = searchQuery.toLowerCase()
    const emailMatch = p.email.toLowerCase().includes(q)
    const nameMatch = (p.nama_lengkap || '').toLowerCase().includes(q)
    const unitMatch = (p.unit_kerja || '').toLowerCase().includes(q)
    const roleMatch = p.role.toLowerCase().includes(q)
    return emailMatch || nameMatch || unitMatch || roleMatch
  })

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setActiveUserId(userId)
    setMessage(null)

    startTransition(async () => {
      const res = await updateUserRole(userId, newRole)
      if (res.success) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
        )
        setMessage({ type: 'success', text: 'Role pengguna berhasil diperbarui.' })
      } else {
        setMessage({ type: 'error', text: res.error || 'Gagal memperbarui role pengguna.' })
      }
      setActiveUserId(null)
    })
  }

  const handleDeleteProvisioning = (email: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus data provisioning untuk ${email}?`)) {
      return
    }

    setActiveEmail(email)
    setMessage(null)

    startTransition(async () => {
      const res = await deleteUserProvisioning(email)
      if (res.success) {
        setProvisioningList((prev) => prev.filter((p) => p.email !== email))
        setMessage({ type: 'success', text: `Provisioning untuk ${email} berhasil dihapus.` })
      } else {
        setMessage({ type: 'error', text: res.error || 'Gagal menghapus data provisioning.' })
      }
      setActiveEmail(null)
    })
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="space-y-4">
      {/* Alert Notification */}
      {message && (
        <div
          className={`p-3 text-xs rounded-lg flex items-center gap-2 border ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-300'
              : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <ShieldAlert className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Header Actions & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            placeholder="Cari nama, email, unit kerja, atau role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-xs h-9 bg-white dark:bg-slate-900"
          />
        </div>

        <Button
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-medium gap-2 shadow-sm"
        >
          <UserPlus className="h-4 w-4" />
          Pre-Assign Role Pengguna
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="aktif" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <TabsTrigger value="aktif" className="text-xs font-semibold">
            Pengguna Terdaftar ({users.length})
          </TabsTrigger>
          <TabsTrigger value="provisioning" className="text-xs font-semibold">
            Pre-Assign Google OAuth ({provisioningList.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: PENGGUNA TERDAFTAR */}
        <TabsContent value="aktif" className="mt-4">
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 dark:bg-slate-800/40">
                  <TableHead className="pl-6">Pengguna</TableHead>
                  <TableHead>Unit Kerja</TableHead>
                  <TableHead>Tanggal Terdaftar</TableHead>
                  <TableHead>Role Saat Ini</TableHead>
                  <TableHead className="pr-6 text-right">Ubah Hak Akses / Role</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => {
                    const isSelf = u.id === currentUserId
                    const isUpdating = isPending && activeUserId === u.id
                    const currentOption = ROLE_OPTIONS.find((r) => r.value === u.role)

                    return (
                      <TableRow key={u.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <TableCell className="pl-6 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-emerald-800/10 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 font-bold text-xs flex items-center justify-center border border-emerald-700/20">
                              {u.nama_lengkap.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                {u.nama_lengkap}
                                {isSelf && (
                                  <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border dark:bg-slate-800 dark:text-slate-400 font-normal">
                                    Anda
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                          {u.unit_kerja || '-'}
                        </TableCell>

                        <TableCell className="text-xs text-slate-500">
                          {formatDate(u.created_at)}
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className={`text-xs font-semibold px-2.5 py-0.5 ${currentOption?.badgeStyle || ''}`}>
                            {currentOption?.label || u.role}
                          </Badge>
                        </TableCell>

                        <TableCell className="pr-6 text-right">
                          <Select
                            disabled={isUpdating}
                            value={u.role}
                            onValueChange={(val) => handleRoleChange(u.id, val as UserRole)}
                          >
                            <SelectTrigger className="w-[160px] h-8 text-xs ml-auto">
                              <SelectValue placeholder="Pilih Role" />
                            </SelectTrigger>
                            <SelectContent align="end">
                              {ROLE_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12 text-slate-400 text-xs">
                      <div className="flex flex-col items-center gap-2">
                        <User className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                        <span>Tidak ada pengguna terdaftar yang sesuai pencarian.</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* TAB 2: PRE-ASSIGN GOOGLE OAUTH */}
        <TabsContent value="provisioning" className="mt-4">
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/70 dark:bg-slate-800/40">
                  <TableHead className="pl-6">Email Google</TableHead>
                  <TableHead>Nama Lengkap (Target)</TableHead>
                  <TableHead>Unit Kerja</TableHead>
                  <TableHead>Role Di-Assign</TableHead>
                  <TableHead>Tgl Dibuat</TableHead>
                  <TableHead className="pr-6 text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProvisioning.length > 0 ? (
                  filteredProvisioning.map((p) => {
                    const isDeleting = isPending && activeEmail === p.email
                    const currentOption = ROLE_OPTIONS.find((r) => r.value === p.role)

                    return (
                      <TableRow key={p.email} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                        <TableCell className="pl-6 py-3">
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-slate-100">
                            <Mail className="h-3.5 w-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                            <span>{p.email}</span>
                          </div>
                        </TableCell>

                        <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                          {p.nama_lengkap || '-'}
                        </TableCell>

                        <TableCell className="text-xs text-slate-600 dark:text-slate-400">
                          {p.unit_kerja || '-'}
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className={`text-xs font-semibold px-2.5 py-0.5 ${currentOption?.badgeStyle || ''}`}>
                            {currentOption?.label || p.role}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-xs text-slate-500">
                          {formatDate(p.created_at)}
                        </TableCell>

                        <TableCell className="pr-6 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={isDeleting}
                            onClick={() => handleDeleteProvisioning(p.email)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            title="Hapus provisioning"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                      <div className="flex flex-col items-center gap-2">
                        <UserPlus className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                        <span>Belum ada data pre-assign role pengguna Google OAuth.</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsModalOpen(true)}
                          className="mt-2 text-xs text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                        >
                          + Tambah Pre-Assign Role Baru
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal Form Tambah User Provisioning */}
      <ModalTambahProvisioning
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onSuccess={() => {
          setMessage({ type: 'success', text: 'Pre-assign role pengguna berhasil ditambahkan.' })
        }}
      />
    </div>
  )
}
