'use client'

import React, { useState, useTransition } from 'react'
import { createCategory, updateCategory, deleteCategory } from '@/app/actions/persediaan'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Edit2, Trash2, Tag, ShieldAlert, Check, X } from 'lucide-react'

interface Category {
  id: string
  nama: string
}

interface ModalKelolaKategoriProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: Category[]
  onCategoriesChange?: () => void
}

export default function ModalKelolaKategori({
  open,
  onOpenChange,
  categories,
  onCategoriesChange,
}: ModalKelolaKategoriProps) {
  const [newCatName, setNewCatName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Handle Add Category
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    setError(null)

    startTransition(async () => {
      const res = await createCategory(newCatName)
      if (res.error) {
        setError(res.error)
      } else {
        setNewCatName('')
        if (onCategoriesChange) onCategoriesChange()
      }
    })
  }

  // Start Edit
  const startEditing = (cat: Category) => {
    setEditingId(cat.id)
    setEditingName(cat.nama)
  }

  // Save Edit
  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return
    setError(null)

    startTransition(async () => {
      const res = await updateCategory(id, editingName)
      if (res.error) {
        setError(res.error)
      } else {
        setEditingId(null)
        setEditingName('')
        if (onCategoriesChange) onCategoriesChange()
      }
    })
  }

  // Delete Category
  const handleDelete = async (id: string, nama: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus kategori "${nama}"?`)) return
    setError(null)

    startTransition(async () => {
      const res = await deleteCategory(id)
      if (res.error) {
        setError(res.error)
      } else {
        if (onCategoriesChange) onCategoriesChange()
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] flex flex-col p-0 overflow-hidden border-slate-200 dark:border-slate-800">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
            Kelola Master Kategori Barang
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tambah, ubah nama, atau hapus kategori barang persediaan kantor.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-5 flex-1 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300 rounded-lg flex items-start gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Tambah Kategori Baru */}
          <form onSubmit={handleAdd} className="flex gap-2 items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="new-cat" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tambah Kategori Baru
              </Label>
              <Input
                id="new-cat"
                placeholder="Misal: Peralatan Kebersihan, Kebersihan & Obat"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="text-xs"
              />
            </div>
            <Button
              type="submit"
              disabled={isPending || !newCatName.trim()}
              className="bg-emerald-800 hover:bg-emerald-700 text-white text-xs h-9"
            >
              <Plus className="h-4 w-4 mr-1" />
              Tambah
            </Button>
          </form>

          {/* List Kategori */}
          <div className="space-y-2 pt-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Daftar Kategori Terdaftar ({categories.length})
            </Label>

            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {categories.map((cat) => {
                const isEditingThis = editingId === cat.id

                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs"
                  >
                    {isEditingThis ? (
                      <div className="flex items-center gap-2 flex-1 mr-2">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="h-8 text-xs"
                          autoFocus
                        />
                        <Button
                          type="button"
                          size="xs"
                          onClick={() => handleSaveEdit(cat.id)}
                          disabled={isPending || !editingName.trim()}
                          className="bg-emerald-700 hover:bg-emerald-600 text-white h-8 px-2"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="xs"
                          onClick={() => setEditingId(null)}
                          className="h-8 px-2"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {cat.nama}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => startEditing(cat)}
                            className="h-7 w-7 p-0 text-slate-500 hover:text-emerald-700"
                            title="Ubah Nama"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="xs"
                            onClick={() => handleDelete(cat.id, cat.nama)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                            title="Hapus Kategori"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="mx-0 mb-0 p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="text-xs">
            Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
