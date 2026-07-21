'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { createBarang, updateBarang, deleteBarang, getCategories } from '@/app/actions/persediaan'
import { Input } from '@/components/ui/input'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
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
import { Search, Plus, Edit, Eye, ShieldAlert, FileSpreadsheet, Tag, Trash2, AlertTriangle } from 'lucide-react'
import ModalImportBarang from '@/components/persediaan/ModalImportBarang'
import ModalKelolaKategori from '@/components/persediaan/ModalKelolaKategori'

export interface Barang {
  id: string
  kd_brng?: string | null
  kd_barang?: string | null
  kode_barang_lengkap?: string | null
  nama: string
  kategori_id: string | null
  satuan: string
  stok: number
  stok_minimum: number
  lokasi: string
  status: string
  kategori_barang?: {
    nama: string
  } | null
}

interface Category {
  id: string
  nama: string
}

interface TabelBarangProps {
  initialBarang: Barang[]
  categories: Category[]
  userRole: string
}

export default function TabelBarang({
  initialBarang,
  categories,
  userRole
}: TabelBarangProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [categoryList, setCategoryList] = useState<Category[]>(categories)

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  
  const [selectedBarang, setSelectedBarang] = useState<Barang | null>(null)
  const [barangToDelete, setBarangToDelete] = useState<Barang | null>(null)
  
  // Controlled category values for forms
  const [addKategoriId, setAddKategoriId] = useState<string>('')
  const [editKategoriId, setEditKategoriId] = useState<string>('')

  // Transition state
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)

  const isEditable = userRole === 'pengelola' || userRole === 'admin'

  // Refresh categories dynamically
  const refreshCategories = async () => {
    const updated = await getCategories()
    setCategoryList(updated)
  }

  // Filter items
  const filteredBarang = initialBarang.filter((item) => {
    const query = search.toLowerCase().trim()
    const matchesSearch =
      item.nama.toLowerCase().includes(query) ||
      (item.kode_barang_lengkap && item.kode_barang_lengkap.toLowerCase().includes(query)) ||
      (item.kd_barang && item.kd_barang.toLowerCase().includes(query)) ||
      (item.kd_brng && item.kd_brng.toLowerCase().includes(query))
    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter
    const matchesCategory = categoryFilter === 'ALL' || item.kategori_id === categoryFilter
    return matchesSearch && matchesStatus && matchesCategory
  })

  // Submit Handler for Add
  const handleAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await createBarang({}, formData)
      if (result.error) {
        setFormError(result.error)
      } else {
        setIsAddOpen(false)
        setAddKategoriId('')
      }
    })
  }

  // Submit Handler for Edit
  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedBarang) return
    setFormError(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await updateBarang(selectedBarang.id, {}, formData)
      if (result.error) {
        setFormError(result.error)
      } else {
        setIsEditOpen(false)
        setSelectedBarang(null)
      }
    })
  }

  // Delete Handler for Item via Modal
  const openDeleteDialog = (item: Barang) => {
    setBarangToDelete(item)
    setFormError(null)
    setIsDeleteOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!barangToDelete) return
    setFormError(null)

    startTransition(async () => {
      const res = await deleteBarang(barangToDelete.id)
      if (res.error) {
        setFormError(res.error)
      } else {
        setIsDeleteOpen(false)
        setBarangToDelete(null)
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari nama atau kode barang BMN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          {/* Status filter */}
          <div className="w-full sm:w-44 shrink-0">
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'ALL')}>
              <SelectTrigger className="text-xs overflow-hidden text-ellipsis">
                <SelectValue placeholder="Status Stok">
                  {statusFilter === 'ALL'
                    ? 'Semua Status'
                    : statusFilter === 'Aman'
                    ? 'Stok Aman'
                    : 'Stok Menipis'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">Semua Status</SelectItem>
                <SelectItem value="Aman" className="text-xs">Stok Aman</SelectItem>
                <SelectItem value="Menipis" className="text-xs">Stok Menipis</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category filter */}
          <div className="w-full sm:w-48 shrink-0">
            <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val || 'ALL')}>
              <SelectTrigger className="text-xs overflow-hidden text-ellipsis">
                <SelectValue placeholder="Kategori">
                  {categoryFilter === 'ALL'
                    ? 'Semua Kategori'
                    : categoryList.find((c) => c.id === categoryFilter)?.nama || 'Kategori'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">Semua Kategori</SelectItem>
                {categoryList.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id} className="text-xs">
                    {cat.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Add & Import Barang Triggers (restricted) */}
        {isEditable && (
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap sm:flex-nowrap">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCategoryModalOpen(true)}
              className="flex-1 sm:flex-initial border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-900 font-medium flex items-center justify-center gap-1.5 text-xs"
              title="Kelola Master Kategori Barang"
            >
              <Tag className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              Kelola Kategori
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => setIsImportOpen(true)}
              className="flex-1 sm:flex-initial border-emerald-300 text-emerald-850 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40 font-medium flex items-center justify-center gap-2 text-xs"
            >
              <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-700 dark:text-emerald-400" />
              Import Excel
            </Button>

            <Button
              type="button"
              onClick={() => {
                setFormError(null)
                setAddKategoriId('')
                setIsAddOpen(true)
              }}
              className="flex-1 sm:flex-initial bg-emerald-800 hover:bg-emerald-700 text-white font-medium flex items-center justify-center gap-2 shadow-sm text-xs"
            >
              <Plus className="h-4.5 w-4.5" />
              Tambah Barang
            </Button>
          </div>
        )}
      </div>

      {/* Main Table view */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-50">
              <TableHead className="text-xs">Kode Barang</TableHead>
              <TableHead className="text-xs">Nama Barang</TableHead>
              <TableHead className="text-xs">Kategori</TableHead>
              <TableHead className="text-xs text-center">Stok</TableHead>
              <TableHead className="text-xs text-center">Min. Stok</TableHead>
              <TableHead className="text-xs">Satuan</TableHead>
              <TableHead className="text-xs">Lokasi</TableHead>
              <TableHead className="text-xs text-center">Status</TableHead>
              <TableHead className="text-xs text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBarang.length > 0 ? (
              filteredBarang.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-800/30 text-xs">
                  <TableCell className="font-mono text-emerald-800 dark:text-emerald-400 text-xs py-3">
                    {item.kode_barang_lengkap || (item.kd_barang && item.kd_brng ? `${item.kd_barang}${item.kd_brng}` : item.kd_barang || item.kd_brng || '-')}
                  </TableCell>
                  <TableCell className="font-semibold text-slate-800 dark:text-slate-200 py-3">
                    {item.nama}
                  </TableCell>
                  <TableCell className="text-slate-500">
                    {item.kategori_barang?.nama || 'Tanpa Kategori'}
                  </TableCell>
                  <TableCell className={`text-center font-bold ${
                    item.stok <= item.stok_minimum ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'
                  }`}>
                    {item.stok}
                  </TableCell>
                  <TableCell className="text-center text-slate-400">
                    {item.stok_minimum}
                  </TableCell>
                  <TableCell className="text-slate-500">{item.satuan}</TableCell>
                  <TableCell className="text-slate-500">{item.lokasi}</TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={item.status === 'Aman' ? 'outline' : 'destructive'}
                      className={
                        item.status === 'Aman'
                          ? 'border-emerald-600 text-emerald-800 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                          : 'bg-amber-100 border border-amber-300 text-amber-800 dark:bg-amber-950/20 dark:border-amber-900 dark:text-amber-400'
                      }
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Link
                        href={`/persediaan/${item.id}`}
                        title="Lihat Detail"
                        className={cn(
                          buttonVariants({ variant: 'outline', size: 'sm' }),
                          'h-8 px-2'
                        )}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Detail</span>
                      </Link>

                      {isEditable && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFormError(null)
                              setSelectedBarang(item)
                              setEditKategoriId(item.kategori_id || '')
                              setIsEditOpen(true)
                            }}
                            className="h-8 px-2 text-slate-600 hover:text-emerald-800 dark:text-slate-400 dark:hover:text-emerald-400"
                            title="Ubah Barang"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Ubah</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openDeleteDialog(item)}
                            className="h-8 px-2 text-red-500 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40 border-red-200 dark:border-red-900/50"
                            title="Hapus Barang"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Hapus</span>
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Tag className="h-8 w-8 text-slate-400" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">Tidak ada barang persediaan</p>
                    <p className="text-xs text-slate-400">Tidak ditemukan item barang yang sesuai dengan kata kunci pencarian atau filter Anda.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Barang Dialog Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[500px] flex flex-col p-0 overflow-hidden border-slate-200 dark:border-slate-800">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
              Tambah Barang Persediaan
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Masukkan data detail barang baru yang ingin ditambahkan ke daftar persediaan.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="flex flex-col">
            <div className="p-6 space-y-4">
              {formError && (
                <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300 rounded-lg flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="kd_brng" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Kd Brng</Label>
                  <Input id="kd_brng" name="kd_brng" placeholder="000003" className="text-xs font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="kd_barang" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Kd Barang</Label>
                  <Input id="kd_barang" name="kd_barang" placeholder="1010301001" className="text-xs font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="kode_barang_lengkap" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Kode Lengkap</Label>
                  <Input id="kode_barang_lengkap" name="kode_barang_lengkap" placeholder="1010301001000003" className="text-xs font-mono" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nama" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Barang</Label>
                <Input id="nama" name="nama" placeholder="Kertas HVS A4 80gr" required className="text-xs" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="add-kategori_id" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Kategori</Label>
                <Select value={addKategoriId} onValueChange={(val) => setAddKategoriId(val || '')}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Pilih kategori barang">
                      {categoryList.find((c) => c.id === addKategoriId)?.nama}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {categoryList.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id} className="text-xs">
                        {cat.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="kategori_id" value={addKategoriId} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="satuan" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Satuan</Label>
                  <Input id="satuan" name="satuan" placeholder="Rim, Pak, Pcs" required className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lokasi" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Lokasi Penyimpanan</Label>
                  <Input id="lokasi" name="lokasi" defaultValue="Gudang Persediaan" className="text-xs" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="stok" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Stok Awal</Label>
                  <Input id="stok" name="stok" type="number" min="0" defaultValue="0" className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="stok_minimum" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Stok Minimum</Label>
                  <Input id="stok_minimum" name="stok_minimum" type="number" min="0" defaultValue="5" className="text-xs" />
                </div>
              </div>
            </div>

            <DialogFooter className="mx-0 mb-0 p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 gap-2 flex flex-row items-center justify-end">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)} className="text-xs">
                Batal
              </Button>
              <Button type="submit" disabled={isPending} className="bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs min-w-[120px]">
                {isPending ? 'Menyimpan...' : 'Simpan Barang'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Barang Dialog Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px] flex flex-col p-0 overflow-hidden border-slate-200 dark:border-slate-800">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Edit className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
              Ubah Data Barang
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Perbarui informasi untuk barang yang sudah terdaftar. Perubahan stok tidak diubah dari form ini.
            </DialogDescription>
          </DialogHeader>

          {selectedBarang && (
            <form onSubmit={handleEditSubmit} className="flex flex-col">
              <div className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300 rounded-lg flex items-start gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-kd_brng" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Kd Brng</Label>
                    <Input id="edit-kd_brng" name="kd_brng" defaultValue={selectedBarang.kd_brng || ''} placeholder="000003" className="text-xs font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-kd_barang" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Kd Barang</Label>
                    <Input id="edit-kd_barang" name="kd_barang" defaultValue={selectedBarang.kd_barang || ''} placeholder="1010301001" className="text-xs font-mono" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-kode_barang_lengkap" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Kode Lengkap</Label>
                    <Input id="edit-kode_barang_lengkap" name="kode_barang_lengkap" defaultValue={selectedBarang.kode_barang_lengkap || ''} placeholder="1010301001000003" className="text-xs font-mono" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-nama" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Nama Barang</Label>
                  <Input
                    id="edit-nama"
                    name="nama"
                    defaultValue={selectedBarang.nama}
                    required
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-kategori_id" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Kategori</Label>
                  <Select value={editKategoriId} onValueChange={(val) => setEditKategoriId(val || '')}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Pilih kategori barang">
                        {categoryList.find((c) => c.id === editKategoriId)?.nama}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {categoryList.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className="text-xs">
                          {cat.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="kategori_id" value={editKategoriId} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-satuan" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Satuan</Label>
                    <Input
                      id="edit-satuan"
                      name="satuan"
                      defaultValue={selectedBarang.satuan}
                      required
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-lokasi" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Lokasi Penyimpanan</Label>
                    <Input
                      id="edit-lokasi"
                      name="lokasi"
                      defaultValue={selectedBarang.lokasi}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-stok_minimum" className="text-xs font-semibold text-slate-700 dark:text-slate-300">Stok Minimum</Label>
                  <Input
                    id="edit-stok_minimum"
                    name="stok_minimum"
                    type="number"
                    min="0"
                    defaultValue={selectedBarang.stok_minimum}
                    className="text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="mx-0 mb-0 p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 gap-2 flex flex-row items-center justify-end">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="text-xs">
                  Batal
                </Button>
                <Button type="submit" disabled={isPending} className="bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs min-w-[120px]">
                  {isPending ? 'Menyimpan...' : 'Perbarui Barang'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Import Excel Modal */}
      <ModalImportBarang isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />

      {/* Kelola Master Kategori Modal */}
      <ModalKelolaKategori
        open={isCategoryModalOpen}
        onOpenChange={setIsCategoryModalOpen}
        categories={categoryList}
        onCategoriesChange={refreshCategories}
      />

      {/* Confirm Delete Barang Dialog Modal */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-[440px] flex flex-col p-0 overflow-hidden border-slate-200 dark:border-slate-800">
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <DialogTitle className="text-lg font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
              Hapus Barang Persediaan
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Konfirmasi tindakan penghapusan item barang dari sistem persediaan.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-4">
            {formError && (
              <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300 rounded-lg flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus barang{' '}
              <span className="font-bold text-slate-900 dark:text-white underline decoration-red-300">
                {barangToDelete?.nama}
              </span>
              {barangToDelete?.kode_barang_lengkap && (
                <span className="font-mono text-[11px] text-slate-500 ml-1">
                  ({barangToDelete.kode_barang_lengkap})
                </span>
              )}{' '}
              dari daftar persediaan kantor?
            </p>

            <div className="p-3 text-xs bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-300 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <span>Tindakan ini tidak dapat dibatalkan. Riwayat mutasi stok untuk barang ini akan dibersihkan.</span>
            </div>
          </div>

          <DialogFooter className="mx-0 mb-0 p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 gap-2 flex flex-row items-center justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteOpen(false)}
              className="text-xs"
              disabled={isPending}
            >
              Batal
            </Button>
            <Button
              type="button"
              onClick={handleConfirmDelete}
              disabled={isPending}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs min-w-[120px]"
            >
              {isPending ? 'Menghapus...' : 'Ya, Hapus Barang'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
