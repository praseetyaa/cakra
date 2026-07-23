'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Barang, ProfileWithEmail, UserRole } from '@/lib/types'
import { createPermintaanManual } from '@/app/actions/permintaan-manual'
import { User, Plus, Trash2, ArrowLeft, Send, CheckCircle2, AlertCircle, Sparkles, UserPlus } from 'lucide-react'
import Link from 'next/link'

interface FormPermintaanManualProps {
  barangList: Barang[]
  registeredUsers: ProfileWithEmail[]
}

interface ItemRow {
  barang_id: string
  jumlah: number
}

export default function FormPermintaanManual({
  barangList,
  registeredUsers,
}: FormPermintaanManualProps) {
  const router = useRouter()
  const [modePemohon, setModePemohon] = useState<'terdaftar' | 'baru'>('terdaftar')
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  
  // Manual / fallback fields
  const [namaManual, setNamaManual] = useState<string>('')
  const [emailPemohon, setEmailPemohon] = useState<string>('')
  const [unitKerja, setUnitKerja] = useState<string>('')
  const [keperluan, setKeperluan] = useState<string>('')
  const [catatan, setCatatan] = useState<string>('')
  
  // Provisioning checkbox
  const [daftarkanProvisioning, setDaftarkanProvisioning] = useState<boolean>(false)
  const [roleProvisioning, setRoleProvisioning] = useState<UserRole>('pemohon')

  // Selected items list
  const [items, setItems] = useState<ItemRow[]>([{ barang_id: '', jumlah: 1 }])

  const [loading, setLoading] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Handle select user from dropdown
  const handleSelectRegisteredUser = (userId: string) => {
    setSelectedUserId(userId)
    const found = registeredUsers.find((u) => u.id === userId)
    if (found) {
      setEmailPemohon(found.email || '')
      setNamaManual(found.nama_lengkap || '')
      if (found.unit_kerja) {
        setUnitKerja(found.unit_kerja)
      }
    } else {
      setSelectedUserId('')
    }
  }

  // Multi-item handlers
  const handleAddItem = () => {
    setItems((prev) => [...prev, { barang_id: '', jumlah: 1 }])
  }

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleItemChange = (index: number, field: 'barang_id' | 'jumlah', value: any) => {
    setItems((prev) => {
      const next = [...prev]
      if (field === 'barang_id') {
        next[index].barang_id = value
      } else {
        next[index].jumlah = Math.max(1, parseInt(value, 10) || 1)
      }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    // Validation
    if (modePemohon === 'terdaftar' && !selectedUserId) {
      setErrorMsg('Harap pilih pegawai terdaftar terlebih dahulu.')
      return
    }

    if (modePemohon === 'baru') {
      if (!namaManual.trim()) {
        setErrorMsg('Nama pemohon wajib diisi.')
        return
      }
      if (!emailPemohon.trim() || !emailPemohon.includes('@')) {
        setErrorMsg('Email pemohon wajib diisi dengan format valid.')
        return
      }
    }

    if (!unitKerja.trim()) {
      setErrorMsg('Unit kerja wajib diisi.')
      return
    }

    if (!keperluan.trim()) {
      setErrorMsg('Keperluan wajib diisi.')
      return
    }

    const validItems = items.filter((it) => it.barang_id !== '')
    if (validItems.length === 0) {
      setErrorMsg('Harap pilih minimal 1 barang.')
      return
    }

    setLoading(true)

    try {
      const res = await createPermintaanManual({
        pemohon_id: modePemohon === 'terdaftar' ? selectedUserId : null,
        pemohon_nama_manual: modePemohon === 'baru' ? namaManual.trim() : null,
        pemohon_email: emailPemohon.trim(),
        unit_kerja: unitKerja.trim(),
        keperluan: keperluan.trim(),
        catatan: catatan.trim(),
        items: validItems,
        daftarkan_provisioning: modePemohon === 'baru' ? daftarkanProvisioning : false,
        role_provisioning: roleProvisioning,
      })

      if (res.error) {
        setErrorMsg(res.error)
      } else {
        setSuccessMsg(`Permintaan manual berhasil dibuat dengan nomor ${res.nomor || ''}!`)
        setTimeout(() => {
          router.push('/permintaan')
          router.refresh()
        }, 1500)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/permintaan"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-emerald-800 dark:hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali ke Daftar Permintaan
        </Link>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
          <Sparkles className="h-3.5 w-3.5" /> Input Manual Pengelola
        </span>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-6 md:p-8 space-y-8">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Input Permintaan Manual
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Ajukan permintaan barang atas nama pegawai lain (baik yang sudah memiliki akun web maupun pemohon baru).
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800/60 flex items-start gap-3 text-red-700 dark:text-red-300 text-sm animate-in fade-in">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>{errorMsg}</div>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3 text-emerald-700 dark:text-emerald-300 text-sm animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
            <div>{successMsg}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* SECTION 1: PEMOHON */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                <User className="h-4 w-4" /> 1. Data Pemohon
              </h3>
              {/* Tab mode selection */}
              <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setModePemohon('terdaftar')
                    setErrorMsg(null)
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    modePemohon === 'terdaftar'
                      ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-emerald-300 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Pegawai Terdaftar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setModePemohon('baru')
                    setSelectedUserId('')
                    setErrorMsg(null)
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    modePemohon === 'baru'
                      ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-emerald-300 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Pemohon Baru (Belum Login)
                </button>
              </div>
            </div>

            {modePemohon === 'terdaftar' ? (
              <div className="space-y-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Pilih Pegawai Terdaftar <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => handleSelectRegisteredUser(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="">-- Pilih Pegawai --</option>
                    {registeredUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nama_lengkap} ({u.email}) - Unit: {u.unit_kerja || 'Belum diatur'} [{u.role}]
                      </option>
                    ))}
                  </select>
                </div>

                {selectedUserId && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">Email Pemohon</span>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{emailPemohon}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Unit Kerja <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={unitKerja}
                        onChange={(e) => setUnitKerja(e.target.value)}
                        placeholder="Contoh: Kesekretariatan"
                        className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Nama Lengkap Pemohon <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={namaManual}
                      onChange={(e) => setNamaManual(e.target.value)}
                      placeholder="Masukkan nama lengkap"
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Email Pemohon (Kunci Klaim Auto) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={emailPemohon}
                      onChange={(e) => setEmailPemohon(e.target.value)}
                      placeholder="contoh@pa-kajen.go.id"
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Unit Kerja <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={unitKerja}
                    onChange={(e) => setUnitKerja(e.target.value)}
                    placeholder="Contoh: Kepaniteraan / PTIP"
                    className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Provisioning Option */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={daftarkanProvisioning}
                      onChange={(e) => setDaftarkanProvisioning(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-800 focus:ring-emerald-500"
                    />
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <UserPlus className="h-3.5 w-3.5 text-emerald-600" /> Sekalian daftarkan ke User Provisioning (agar role & unit kerja siap saat login)
                    </span>
                  </label>

                  {daftarkanProvisioning && (
                    <div className="mt-3 pl-6">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Role Provisioning
                      </label>
                      <select
                        value={roleProvisioning}
                        onChange={(e) => setRoleProvisioning(e.target.value as UserRole)}
                        className="h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                      >
                        <option value="pemohon">Pemohon</option>
                        <option value="pengelola">Pengelola</option>
                        <option value="pimpinan">Pimpinan</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: BARANG & JUMLAH */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                2. Daftar Barang yang Diminta
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Barang
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-700/60"
                >
                  <span className="text-xs font-bold text-slate-400 w-5 text-center">
                    {idx + 1}.
                  </span>
                  <div className="flex-1">
                    <select
                      value={item.barang_id}
                      onChange={(e) => handleItemChange(idx, 'barang_id', e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="">-- Pilih Barang --</option>
                      {barangList.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nama} (Stok: {b.stok} {b.satuan})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28">
                    <input
                      type="number"
                      min="1"
                      value={item.jumlah}
                      onChange={(e) => handleItemChange(idx, 'jumlah', e.target.value)}
                      placeholder="Jumlah"
                      className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(idx)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      title="Hapus Baris"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: KEPERLUAN & CATATAN */}
          <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
              3. Detail Kebutuhan
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Keperluan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={keperluan}
                onChange={(e) => setKeperluan(e.target.value)}
                placeholder="Contoh: Kebutuhan ATK untuk Sidang Keliling"
                className="w-full h-10 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Catatan Tambahan (Opsional)
              </label>
              <textarea
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                rows={2}
                placeholder="Catatan tambahan dari pengelola..."
                className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
              />
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <div className="pt-4 flex justify-end gap-3">
            <Link
              href="/permintaan"
              className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              Batal
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-medium text-sm shadow-lg shadow-emerald-800/20 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <>Menyimpan...</>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Simpan Permintaan Manual
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
