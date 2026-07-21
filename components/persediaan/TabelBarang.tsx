'use client'

import React, { useState, useTransition } from 'react'
import Link from 'next/link'
import { createBarang, updateBarang } from '@/app/actions/persediaan'
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
import { Search, Plus, Edit, Eye, ShieldAlert, Archive, FileSpreadsheet } from 'lucide-react'
import ModalImportBarang from '@/components/persediaan/ModalImportBarang'

export interface Barang {
  id: string
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

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [selectedBarang, setSelectedBarang] = useState<Barang | null>(null)
  
  // Transition state
  const [isPending, startTransition] = useTransition()
  const [formError, setFormError] = useState<string | null>(null)

  const isEditable = userRole === 'pengelola' || userRole === 'admin'

  // Filter items
  const filteredBarang = initialBarang.filter((item) => {
    const matchesSearch = item.nama.toLowerCase().includes(search.toLowerCase())
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

  return (
    <div className="space-y-6">
      {/* Search and Filters Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Cari nama barang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status filter */}
          <div className="w-full sm:w-44">
            <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val || 'ALL')}>
              <SelectTrigger>
                <SelectValue placeholder="Status Stok" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Status</SelectItem>
                <SelectItem value="Aman">Stok Aman</SelectItem>
                <SelectItem value="Menipis">Stok Menipis</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Category filter */}
          <div className="w-full sm:w-48">
            <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val || 'ALL')}>
              <SelectTrigger>
                <SelectValue placeholder="Kategori" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua Kategori</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Add & Import Barang Triggers (restricted) */}
        {isEditable && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsImportOpen(true)}
              className="flex-1 sm:flex-initial border-emerald-300 text-emerald-850 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40 font-medium flex items-center justify-center gap-2"
            >
              <FileSpreadsheet className="h-4.5 w-4.5 text-emerald-700 dark:text-emerald-400" />
              Import Excel
            </Button>

            <Button
              type="button"
              onClick={() => {
                setFormError(null)
                setIsAddOpen(true)
              }}
              className="flex-1 sm:flex-initial bg-emerald-800 hover:bg-emerald-700 text-white font-medium flex items-center justify-center gap-2 shadow-sm"
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
              <TableHead>Nama Barang</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead className="text-center">Stok</TableHead>
              <TableHead className="text-center">Min. Stok</TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBarang.length > 0 ? (
              filteredBarang.map((item) => (
                <TableRow key={item.id} className="hover:bg-slate-50/55 dark:hover:bg-slate-800/30">
                  <TableCell className="font-semibold text-slate-800 dark:text-slate-200">
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFormError(null)
                            setSelectedBarang(item)
                            setIsEditOpen(true)
                          }}
                          className="h-8 px-2 text-slate-600 hover:text-emerald-800 dark:text-slate-400 dark:hover:text-emerald-400"
                          title="Ubah Barang"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Ubah</span>
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Archive className="h-8 w-8 text-slate-300" />
                    <p>Tidak ada barang persediaan yang cocok.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Barang Dialog Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Tambah Barang Persediaan</DialogTitle>
            <DialogDescription>
              Masukkan data detail barang baru yang ingin ditambahkan ke daftar persediaan.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300 rounded flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleAddSubmit} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label htmlFor="nama">Nama Barang</Label>
              <Input id="nama" name="nama" placeholder="Kertas HVS A4 80gr" required />
            </div>

            <div className="space-y-1">
              <Label htmlFor="kategori_id">Kategori</Label>
              <Select name="kategori_id">
                <SelectTrigger>
                  <SelectValue placeholder="Pilih kategori barang" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nama}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="satuan">Satuan</Label>
                <Input id="satuan" name="satuan" placeholder="Rim, Pak, Pcs" required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lokasi">Lokasi Penyimpanan</Label>
                <Input id="lokasi" name="lokasi" defaultValue="Gudang Persediaan" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="stok">Stok Awal</Label>
                <Input id="stok" name="stok" type="number" min="0" defaultValue="0" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="stok_minimum">Stok Minimum</Label>
                <Input id="stok_minimum" name="stok_minimum" type="number" min="0" defaultValue="5" />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending} className="bg-emerald-800 hover:bg-emerald-700 text-white font-semibold">
                {isPending ? 'Menyimpan...' : 'Simpan Barang'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Barang Dialog Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Ubah Data Barang</DialogTitle>
            <DialogDescription>
              Perbarui informasi untuk barang yang sudah terdaftar. Perubahan stok tidak diubah dari form ini.
            </DialogDescription>
          </DialogHeader>

          {formError && (
            <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300 rounded flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-red-600" />
              <span>{formError}</span>
            </div>
          )}

          {selectedBarang && (
            <form onSubmit={handleEditSubmit} className="space-y-4 py-2">
              <div className="space-y-1">
                <Label htmlFor="edit-nama">Nama Barang</Label>
                <Input
                  id="edit-nama"
                  name="nama"
                  defaultValue={selectedBarang.nama}
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-kategori_id">Kategori</Label>
                <Select name="kategori_id" defaultValue={selectedBarang.kategori_id || undefined}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori barang" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="edit-satuan">Satuan</Label>
                  <Input
                    id="edit-satuan"
                    name="satuan"
                    defaultValue={selectedBarang.satuan}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="edit-lokasi">Lokasi Penyimpanan</Label>
                  <Input
                    id="edit-lokasi"
                    name="lokasi"
                    defaultValue={selectedBarang.lokasi}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="edit-stok_minimum">Stok Minimum</Label>
                <Input
                  id="edit-stok_minimum"
                  name="stok_minimum"
                  type="number"
                  min="0"
                  defaultValue={selectedBarang.stok_minimum}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" disabled={isPending} className="bg-emerald-800 hover:bg-emerald-700 text-white font-semibold">
                  {isPending ? 'Menyimpan...' : 'Perbarui Barang'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Import Excel Barang */}
      <ModalImportBarang
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
      />
    </div>
  )
}
