'use client'
 
import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { createPermintaan } from '@/app/actions/permintaan'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { StatusBadge } from '@/components/shared/StatusBadge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ClipboardList,
  Plus,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldAlert,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface RequestItem {
  id: string
  nomor: string
  tanggal: string
  unit_kerja: string
  keperluan: string
  status: 'menunggu' | 'disetujui' | 'ditolak'
  sumber?: 'web' | 'form' | 'manual_admin'
  pemohon_id?: string | null
  pemohon_email?: string | null
  pemohon_nama_manual?: string | null
  profiles?: {
    nama_lengkap: string
  } | null
}

export interface Barang {
  id: string
  nama: string
  stok: number
  satuan: string
}

interface UserProfile {
  nama_lengkap: string
  role: string
  unit_kerja: string | null
}

interface ListPermintaanProps {
  initialRequests: RequestItem[]
  barangList: Barang[]
  userRole: string
  userProfile: UserProfile | null
}

interface FormItem {
  barang_id: string
  jumlah: number
}

export default function ListPermintaan({
  initialRequests,
  barangList,
  userRole,
  userProfile
}: ListPermintaanProps) {
  // Tabs status
  const [activeTab, setActiveTab] = useState('ALL')

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [formItems, setFormItems] = useState<FormItem[]>([{ barang_id: '', jumlah: 1 }])

  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Filter requests
  const filteredRequests = initialRequests.filter((req) => {
    if (activeTab === 'ALL') return true
    return req.status.toLowerCase() === activeTab.toLowerCase()
  })

  // Format date helper
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  // Row operations for multi-item form
  const handleAddItemRow = () => {
    setFormItems([...formItems, { barang_id: '', jumlah: 1 }])
  }

  const handleRemoveItemRow = (index: number) => {
    const updated = [...formItems]
    updated.splice(index, 1)
    setFormItems(updated)
  }

  const handleItemSelect = (index: number, val: string) => {
    const updated = [...formItems]
    updated[index].barang_id = val
    setFormItems(updated)
  }

  const handleQtyChange = (index: number, val: number) => {
    const updated = [...formItems]
    updated[index].jumlah = val
    setFormItems(updated)
  }

  // Submit handler
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormError(null)

    // Form Validation
    const emptyItem = formItems.some((item) => !item.barang_id || item.jumlah <= 0)
    if (emptyItem) {
      setFormError('Harap lengkapi pilihan barang dan jumlah permintaan dengan benar.')
      return
    }

    // Duplicate item validation
    const selectedIds = formItems.map((i) => i.barang_id)
    const hasDuplicates = selectedIds.length !== new Set(selectedIds).size
    if (hasDuplicates) {
      setFormError('Tidak boleh memilih barang yang sama lebih dari satu kali. Naikkan jumlahnya saja.')
      return
    }

    const formData = new FormData(e.currentTarget)
    // Append serialized items
    formData.append('items', JSON.stringify(formItems))

    startTransition(async () => {
      const result = await createPermintaan({}, formData)
      if (result.error) {
        setFormError(result.error)
      } else {
        setIsAddOpen(false)
        setFormItems([{ barang_id: '', jumlah: 1 }])
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Top filter tabs & request trigger */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <TabsList className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <TabsTrigger value="ALL">Semua</TabsTrigger>
            <TabsTrigger value="menunggu">Menunggu</TabsTrigger>
            <TabsTrigger value="disetujui">Disetujui</TabsTrigger>
            <TabsTrigger value="ditolak">Ditolak</TabsTrigger>
          </TabsList>

          {/* Action buttons */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {['pengelola', 'pimpinan', 'admin'].includes(userRole) && (
              <Link
                href="/permintaan/manual"
                className={cn(
                  buttonVariants({ variant: 'outline' }),
                  'border-emerald-700/50 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-medium flex items-center justify-center gap-1.5'
                )}
              >
                <Plus className="h-4 w-4" />
                <span>Input Manual</span>
              </Link>
            )}

            {userRole === 'pemohon' && (
              <Button
                onClick={() => {
                  setFormError(null)
                  setFormItems([{ barang_id: '', jumlah: 1 }])
                  setIsAddOpen(true)
                }}
                className="w-full sm:w-auto bg-emerald-800 hover:bg-emerald-700 text-white font-medium flex items-center justify-center gap-2"
              >
                <Plus className="h-4.5 w-4.5" />
                Ajukan Permintaan
              </Button>
            )}
          </div>
        </div>

        {/* Requests Table Listings */}
        <TabsContent value={activeTab} className="mt-0 focus-visible:outline-none">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-50">
                  <TableHead>Nomor</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Pemohon</TableHead>
                  <TableHead>Unit Kerja</TableHead>
                  <TableHead>Keperluan</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((req) => (
                    <TableRow key={req.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-800/30">
                      <TableCell className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {req.nomor}
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">
                        {formatDate(req.tanggal)}
                      </TableCell>
                      <TableCell className="font-medium text-slate-700 dark:text-slate-350">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{req.profiles?.nama_lengkap || req.pemohon_nama_manual || req.pemohon_email || 'Pemohon'}</span>
                            {!req.pemohon_id && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                                Belum Terklaim
                              </span>
                            )}
                          </div>
                          {req.sumber === 'form' && (
                            <span className="w-fit text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              Google Form
                            </span>
                          )}
                          {req.sumber === 'manual_admin' && (
                            <span className="w-fit text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              Input Manual
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-500">{req.unit_kerja}</TableCell>
                      <TableCell className="text-slate-600 truncate max-w-[150px]">
                        {req.keperluan}
                      </TableCell>
                      <TableCell className="text-center">
                        <StatusBadge status={req.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/permintaan/${req.id}`}
                          className={cn(
                            buttonVariants({ variant: 'outline', size: 'sm' }),
                            'h-8 px-2.5 flex items-center justify-center ml-auto w-fit gap-1'
                          )}
                        >
                          <Eye className="h-4 w-4" />
                          <span>Detail</span>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <ClipboardList className="h-8 w-8 text-slate-300" />
                        <p>Tidak ada pengajuan permintaan barang.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Ajukan Permintaan Dialog Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col p-0 overflow-hidden border-slate-200 dark:border-slate-800">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
              Ajukan Permintaan Barang (ATK)
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Buat permintaan barang logistik. Anda dapat menambahkan beberapa item barang sekaligus.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {formError && (
                <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300 rounded-lg flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="unit_kerja" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Unit Kerja</Label>
                  <Input
                    id="unit_kerja"
                    name="unit_kerja"
                    defaultValue={userProfile?.unit_kerja || ''}
                    placeholder="Sub Bagian Umum & Keuangan"
                    required
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="keperluan" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Keperluan</Label>
                  <Input
                    id="keperluan"
                    name="keperluan"
                    placeholder="Stok ATK Triwulan III"
                    required
                    className="text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="catatan" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Catatan Tambahan (Opsional)</Label>
                <Input
                  id="catatan"
                  name="catatan"
                  placeholder="Mohon diproses sebelum tanggal 20"
                  className="text-xs"
                />
              </div>

              {/* Dynamic items selection builder */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Daftar Barang Yang Diminta
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={handleAddItemRow}
                    className="text-emerald-800 border-emerald-300 hover:bg-emerald-50 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1 text-emerald-700" />
                    Tambah Baris
                  </Button>
                </div>

                <div className="space-y-3">
                  {formItems.map((item, index) => {
                    const selectedBarangInfo = barangList.find((b) => b.id === item.barang_id)
                    const isExceeding = selectedBarangInfo && item.jumlah > selectedBarangInfo.stok

                    return (
                      <div key={index} className="space-y-1.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                        <div className="flex gap-3 items-end">
                          {/* Select item */}
                          <div className="flex-1">
                            <Label className="text-[10px] font-semibold text-slate-400">Pilih Barang</Label>
                            <Select
                              value={item.barang_id}
                              onValueChange={(val) => handleItemSelect(index, val || '')}
                            >
                              <SelectTrigger className="h-9 text-xs overflow-hidden">
                                {item.barang_id ? (
                                  <span className="truncate text-xs block">
                                    {(() => {
                                      const b = barangList.find((x) => x.id === item.barang_id)
                                      return b ? `${b.nama} (Stok: ${b.stok} ${b.satuan})` : 'Pilih barang ATK'
                                    })()}
                                  </span>
                                ) : (
                                  <SelectValue placeholder="Pilih barang ATK" />
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                {barangList.map((barang) => (
                                  <SelectItem key={barang.id} value={barang.id} className="text-xs">
                                    {barang.nama} (Stok: {barang.stok} {barang.satuan})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Input quantity */}
                          <div className="w-24">
                            <Label className="text-[10px] font-semibold text-slate-400">Jumlah</Label>
                            <Input
                              type="number"
                              min="1"
                              value={item.jumlah}
                              onChange={(e) => handleQtyChange(index, parseInt(e.target.value || '1', 10))}
                              className="h-9 text-xs"
                            />
                          </div>

                          {/* Remove row */}
                          {formItems.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() => handleRemoveItemRow(index)}
                              className="h-9 w-9 p-0 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-lg shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>

                        {/* Overstock helper note */}
                        {isExceeding && (
                          <div className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1 font-medium bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded w-fit">
                            <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
                            <span>Jumlah diminta melebihi stok yang tersedia saat ini ({selectedBarangInfo.stok} {selectedBarangInfo.satuan}).</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <DialogFooter className="mx-0 mb-0 p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 gap-2 flex flex-row items-center justify-end">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="text-xs">
                Batal
              </Button>
              <Button type="submit" disabled={isPending} className="bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs min-w-[120px]">
                {isPending ? 'Mengirim...' : 'Kirim Permintaan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
