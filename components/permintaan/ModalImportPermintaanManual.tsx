'use client'

import React, { useState, useTransition, useRef } from 'react'
import ExcelJS from 'exceljs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Download,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
  Loader2,
  Sparkles,
  AlertTriangle,
  Send
} from 'lucide-react'
import { Barang, ProfileWithEmail } from '@/lib/types'
import { importPermintaanManualBulk, BulkPermintaanGroupInput } from '@/app/actions/permintaan-manual'

export interface ParsedItemRow {
  namaPemohon?: string
  emailPemohon?: string
  unitKerja?: string
  keperluan?: string
  catatan?: string
  namaBarangInput: string
  kodeBarangInput?: string
  jumlah: number
  matchedBarang?: Barang
  isMatched: boolean
}

interface ModalImportPermintaanManualProps {
  isOpen: boolean
  onClose: () => void
  barangList: Barang[]
  registeredUsers: ProfileWithEmail[]
  onApplyToForm: (items: { barang_id: string; jumlah: number }[], headerData?: {
    namaPemohon?: string
    emailPemohon?: string
    unitKerja?: string
    keperluan?: string
    catatan?: string
  }) => void
  onBatchSuccess?: () => void
}

export default function ModalImportPermintaanManual({
  isOpen,
  onClose,
  barangList,
  registeredUsers,
  onApplyToForm,
  onBatchSuccess,
}: ModalImportPermintaanManualProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedItemRow[]>([])
  const [isReading, setIsReading] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleReset = () => {
    setFile(null)
    setParsedRows([])
    setParseError(null)
    setImportError(null)
    setIsReading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDialogClose = () => {
    handleReset()
    onClose()
  }

  // 1. Download Excel Template Generator
  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Sistem CAKRA PA Kajen'
    workbook.created = new Date()

    const worksheet = workbook.addWorksheet('Permintaan Manual')

    // Define Columns
    worksheet.columns = [
      { header: 'Nama Pemohon', key: 'nama_pemohon', width: 24 },
      { header: 'Email Pemohon', key: 'email_pemohon', width: 28 },
      { header: 'Unit Kerja', key: 'unit_kerja', width: 22 },
      { header: 'Keperluan', key: 'keperluan', width: 30 },
      { header: 'Nama Barang / Deskripsi', key: 'nama_barang', width: 32 },
      { header: 'Kode Barang', key: 'kode_barang', width: 20 },
      { header: 'Jumlah', key: 'jumlah', width: 12 },
      { header: 'Catatan', key: 'catatan', width: 26 },
    ]

    // Header styling
    const headerRow = worksheet.getRow(1)
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '059669' }, // Emerald green
    }
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' }

    // Sample data rows
    worksheet.addRow({
      nama_pemohon: 'Ahmad Rizky, S.H.',
      email_pemohon: 'ahmad.rizky@pa-kajen.go.id',
      unit_kerja: 'Kepaniteraan Hukum',
      keperluan: 'Kebutuhan ATK Persidangan Bulan Agustus',
      nama_barang: 'BALLPOINT CLICK',
      kode_barang: '1010301001000003',
      jumlah: 5,
      catatan: 'Harap disiapkan sebelum tanggal 5',
    })
    worksheet.addRow({
      nama_pemohon: 'Ahmad Rizky, S.H.',
      email_pemohon: 'ahmad.rizky@pa-kajen.go.id',
      unit_kerja: 'Kepaniteraan Hukum',
      keperluan: 'Kebutuhan ATK Persidangan Bulan Agustus',
      nama_barang: 'Kertas A4 70gr PaperOne',
      kode_barang: '1010199999000002',
      jumlah: 2,
      catatan: '',
    })
    worksheet.addRow({
      nama_pemohon: 'Siti Aminah, A.Md.',
      email_pemohon: 'siti.aminah@pa-kajen.go.id',
      unit_kerja: 'Subbag PTIP',
      keperluan: 'Pencetakan Laporan Perencanaan',
      nama_barang: 'SPIDOL BESAR BOARDMARKER HITAM',
      kode_barang: '1010301001000004',
      jumlah: 3,
      catatan: 'Untuk ruang rapat',
    })

    // Generate buffer & trigger download
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'Template_Import_Permintaan_Manual_CAKRA.xlsx'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  // Helper to extract string from cell value safely
  const getStringValue = (val: unknown): string => {
    if (val === null || val === undefined) return ''
    if (typeof val === 'object') {
      if ('result' in val && (val as { result: unknown }).result !== undefined) {
        return String((val as { result: unknown }).result).trim()
      }
      if ('text' in val && (val as { text: unknown }).text !== undefined) {
        return String((val as { text: unknown }).text).trim()
      }
      if ('richText' in val && Array.isArray((val as { richText: Array<{ text: string }> }).richText)) {
        return (val as { richText: Array<{ text: string }> }).richText.map(t => t.text).join('').trim()
      }
    }
    return String(val).trim()
  }

  // 2. Process File & Parse Excel Data
  const processExcelFile = async (selectedFile: File) => {
    setFile(selectedFile)
    setIsReading(true)
    setParseError(null)
    setImportError(null)
    setParsedRows([])

    try {
      const buffer = await selectedFile.arrayBuffer()
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer)

      const worksheet = workbook.getWorksheet('Permintaan Manual') || workbook.worksheets[0]

      if (!worksheet) {
        setParseError('Lembar kerja (worksheet) Excel tidak ditemukan.')
        setIsReading(false)
        return
      }

      // Smart Header Row & Column Mapping Detection
      let headerRowIndex = -1
      const colMap = {
        nama_pemohon: -1,
        email_pemohon: -1,
        unit_kerja: -1,
        keperluan: -1,
        nama_barang: -1,
        kode_barang: -1,
        jumlah: -1,
        catatan: -1,
      }

      worksheet.eachRow((row, rowNumber) => {
        if (headerRowIndex !== -1) return
        const values = (row.values as Array<unknown> || []).map(v => getStringValue(v).toLowerCase())

        const barangIdx = values.findIndex(v => typeof v === 'string' && (v.includes('barang') || v.includes('deskripsi') || v === 'nama'))
        if (barangIdx !== -1) {
          headerRowIndex = rowNumber
          values.forEach((v, idx) => {
            if (typeof v !== 'string' || !v) return
            if (v.includes('nama pemohon') || v.includes('pemohon')) colMap.nama_pemohon = idx
            else if (v.includes('email')) colMap.email_pemohon = idx
            else if (v.includes('unit') || v.includes('kerja')) colMap.unit_kerja = idx
            else if (v.includes('keperluan')) colMap.keperluan = idx
            else if (v.includes('kode barang') || v.includes('kode_barang') || v.includes('kd barang')) colMap.kode_barang = idx
            else if (v.includes('barang') || v.includes('deskripsi') || v === 'nama') colMap.nama_barang = idx
            else if (v.includes('jumlah') || v.includes('qty')) colMap.jumlah = idx
            else if (v.includes('catatan')) colMap.catatan = idx
          })
        }
      })

      // Fallback column map if dynamic detection didn't trigger
      if (headerRowIndex === -1) {
        headerRowIndex = 1
        colMap.nama_pemohon = 1
        colMap.email_pemohon = 2
        colMap.unit_kerja = 3
        colMap.keperluan = 4
        colMap.nama_barang = 5
        colMap.kode_barang = 6
        colMap.jumlah = 7
        colMap.catatan = 8
      }

      const rows: ParsedItemRow[] = []

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= headerRowIndex) return

        const rowValues = row.values as Array<unknown>
        if (!rowValues || rowValues.length === 0) return

        const namaBarang = colMap.nama_barang !== -1 ? getStringValue(rowValues[colMap.nama_barang]) : ''
        const kodeBarang = colMap.kode_barang !== -1 ? getStringValue(rowValues[colMap.kode_barang]) : ''
        const jumlahStr = colMap.jumlah !== -1 ? getStringValue(rowValues[colMap.jumlah]) : '1'

        if (!namaBarang && !kodeBarang) return
        if (namaBarang.toLowerCase().includes('total') || namaBarang.toLowerCase().includes('jumlah seluruh')) return

        const jumlah = parseInt(jumlahStr, 10)
        const validJumlah = isNaN(jumlah) || jumlah <= 0 ? 1 : jumlah

        // Fuzzy match against barangList
        const matched = barangList.find((b) => {
          if (kodeBarang && b.kode_barang_lengkap && b.kode_barang_lengkap.trim().toLowerCase() === kodeBarang.trim().toLowerCase()) {
            return true
          }
          if (kodeBarang && b.kd_barang && (b.kd_barang + (b.kd_brng || '')).toLowerCase() === kodeBarang.trim().toLowerCase()) {
            return true
          }
          return b.nama.trim().toLowerCase() === namaBarang.trim().toLowerCase()
        }) || barangList.find((b) => {
          return b.nama.trim().toLowerCase().includes(namaBarang.trim().toLowerCase()) || namaBarang.trim().toLowerCase().includes(b.nama.trim().toLowerCase())
        })

        rows.push({
          namaPemohon: colMap.nama_pemohon !== -1 ? getStringValue(rowValues[colMap.nama_pemohon]) : undefined,
          emailPemohon: colMap.email_pemohon !== -1 ? getStringValue(rowValues[colMap.email_pemohon]) : undefined,
          unitKerja: colMap.unit_kerja !== -1 ? getStringValue(rowValues[colMap.unit_kerja]) : undefined,
          keperluan: colMap.keperluan !== -1 ? getStringValue(rowValues[colMap.keperluan]) : undefined,
          catatan: colMap.catatan !== -1 ? getStringValue(rowValues[colMap.catatan]) : undefined,
          namaBarangInput: namaBarang || kodeBarang,
          kodeBarangInput: kodeBarang || undefined,
          jumlah: validJumlah,
          matchedBarang: matched,
          isMatched: !!matched,
        })
      })

      if (rows.length === 0) {
        setParseError('Tidak ada data barang/permintaan valid yang ditemukan dalam file Excel.')
      } else {
        setParsedRows(rows)
      }
    } catch (err: unknown) {
      console.error('Failed to read Excel file:', err)
      setParseError('Gagal membaca file Excel. Harap gunakan format .xlsx atau .xls.')
    } finally {
      setIsReading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processExcelFile(e.target.files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      const ext = droppedFile.name.split('.').pop()?.toLowerCase()
      if (['xlsx', 'xls', 'csv'].includes(ext || '')) {
        processExcelFile(droppedFile)
      } else {
        setParseError('Format file tidak didukung. Harap upload .xlsx, .xls, atau .csv')
      }
    }
  }

  // 3. Action A: Apply Matched Items into Active Form
  const handleApplyToFormClick = () => {
    const matchedRows = parsedRows.filter((r) => r.isMatched && r.matchedBarang)
    if (matchedRows.length === 0) {
      setImportError('Tidak ada item yang berhasil cocok dengan database persediaan.')
      return
    }

    const itemsToApply = matchedRows.map((r) => ({
      barang_id: r.matchedBarang!.id,
      jumlah: r.jumlah,
    }))

    // Extract header metadata if present in first row
    const firstRow = parsedRows[0]
    const headerData = {
      namaPemohon: firstRow?.namaPemohon || undefined,
      emailPemohon: firstRow?.emailPemohon || undefined,
      unitKerja: firstRow?.unitKerja || undefined,
      keperluan: firstRow?.keperluan || undefined,
      catatan: firstRow?.catatan || undefined,
    }

    onApplyToForm(itemsToApply, headerData)
    handleDialogClose()
  }

  // 4. Action B: Direct Bulk Creation of Manual Requests
  const handleBatchImportSubmit = () => {
    const matchedRows = parsedRows.filter((r) => r.isMatched && r.matchedBarang)
    if (matchedRows.length === 0) {
      setImportError('Tidak ada barang valid untuk di-import.')
      return
    }

    // Group rows by pemohon_email / unit_kerja / keperluan
    const groupsMap = new Map<string, BulkPermintaanGroupInput>()

    for (const r of matchedRows) {
      const email = (r.emailPemohon || 'manual.import@pa-kajen.go.id').trim()
      const unit = (r.unitKerja || 'Umum').trim()
      const reqKeperluan = (r.keperluan || 'Permintaan Logistik (Import Excel)').trim()
      const groupKey = `${email}|${unit}|${reqKeperluan}`

      let group = groupsMap.get(groupKey)
      if (!group) {
        // Try finding registered user id by email
        const regUser = registeredUsers.find((u) => u.email && u.email.toLowerCase() === email.toLowerCase())

        group = {
          pemohon_id: regUser?.id || null,
          pemohon_nama_manual: regUser ? null : (r.namaPemohon || 'Pegawai Manual'),
          pemohon_email: email,
          unit_kerja: unit,
          keperluan: reqKeperluan,
          catatan: r.catatan || 'Import Batch via Excel',
          items: [],
        }
        groupsMap.set(groupKey, group)
      }

      group.items.push({
        barang_id: r.matchedBarang!.id,
        jumlah: r.jumlah,
      })
    }

    const groupsList = Array.from(groupsMap.values())

    startTransition(async () => {
      const res = await importPermintaanManualBulk(groupsList)
      if (res.success) {
        if (onBatchSuccess) onBatchSuccess()
        handleDialogClose()
      } else {
        setImportError(res.error || 'Gagal mengimpor batch permintaan manual.')
      }
    })
  }

  const validMatchedCount = parsedRows.filter((r) => r.isMatched).length

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDialogClose()}>
      <DialogContent className="sm:max-w-[750px] max-h-[90vh] flex flex-col p-0 overflow-hidden border-slate-200 dark:border-slate-800">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <FileSpreadsheet className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
            Import Permintaan Manual via Excel
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Unggah file Excel berisi daftar barang yang diminta untuk dimasukkan otomatis ke form atau di-import langsung.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pt-5 pb-8 space-y-6">
          {/* Download Template Banner */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 rounded-lg bg-emerald-800 text-white flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                  Unduh Template Excel Permintaan
                </h4>
                <p className="text-[11px] text-emerald-800/80 dark:text-emerald-400">
                  Gunakan format template baku CAKRA agar nama barang dan kolom terdeteksi secara presisi.
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadTemplate}
              className="shrink-0 border-emerald-300 text-emerald-850 hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-950/40 text-xs font-semibold"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Unduh Template
            </Button>
          </div>

          {/* Drag & Drop Upload Box */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 scale-[0.99]'
                : file
                ? 'border-emerald-300 bg-slate-50/60 dark:bg-slate-900/40 dark:border-slate-700'
                : 'border-slate-300 hover:border-emerald-600 hover:bg-slate-50/60 dark:border-slate-800 dark:hover:border-emerald-600'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".xlsx, .xls, .csv"
              className="hidden"
            />

            <div className="flex flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                {isReading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-700" />
                ) : file ? (
                  <FileSpreadsheet className="h-6 w-6 text-emerald-700 dark:text-emerald-400" />
                ) : (
                  <UploadCloud className="h-6 w-6 text-slate-400" />
                )}
              </div>

              {file ? (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-center gap-2">
                    <span>{file.name}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleReset()
                      }}
                      className="p-1 text-slate-400 hover:text-red-600 rounded-full"
                      title="Hapus file"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {(file.size / 1024).toFixed(1)} KB — Klik untuk mengganti file
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tarik & lepaskan file Excel di sini, atau <span className="text-emerald-700 dark:text-emerald-400 underline">pilih file</span>
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Format yang didukung: .XLSX, .XLS, .CSV
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Errors Display */}
          {(parseError || importError) && (
            <div className="p-3 text-xs bg-red-50 border border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-300 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <span>{parseError || importError}</span>
            </div>
          )}

          {/* Parsed Items Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Hasil Pembacaan Excel ({validMatchedCount} dari {parsedRows.length} Baris Cocok)
                </h4>
                <div className="flex items-center gap-2">
                  {validMatchedCount < parsedRows.length && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 text-[10px]">
                      {parsedRows.length - validMatchedCount} Item Tidak Cocok
                    </Badge>
                  )}
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">
                    {validMatchedCount} Valid
                  </Badge>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden max-h-[220px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                      <TableHead className="text-[11px] py-2">Identitas Pemohon / Unit</TableHead>
                      <TableHead className="text-[11px] py-2">Barang di Excel</TableHead>
                      <TableHead className="text-[11px] py-2">Hasil Match Sistem</TableHead>
                      <TableHead className="text-[11px] py-2 text-center">Jumlah</TableHead>
                      <TableHead className="text-[11px] py-2 text-center">Stok Gudang</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedRows.map((row, idx) => (
                      <TableRow key={idx} className="text-xs">
                        <TableCell className="py-2">
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {row.namaPemohon || row.emailPemohon || 'Form Aktif'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {row.unitKerja || 'Unit Kerja'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-slate-700 dark:text-slate-300 py-2">
                          {row.namaBarangInput}
                        </TableCell>
                        <TableCell className="py-2">
                          {row.isMatched && row.matchedBarang ? (
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1 text-[11px]">
                              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                              {row.matchedBarang.nama}
                            </span>
                          ) : (
                            <span className="text-red-500 font-medium flex items-center gap-1 text-[11px]">
                              <AlertTriangle className="h-3 w-3 text-red-500" />
                              Barang Tidak Ditemukan
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center font-bold text-slate-900 dark:text-white py-2">
                          {row.jumlah}
                        </TableCell>
                        <TableCell className="text-center text-slate-500 py-2">
                          {row.matchedBarang ? `${row.matchedBarang.stok} ${row.matchedBarang.satuan}` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mx-0 mb-0 p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 gap-2 flex flex-col sm:flex-row items-center justify-between">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={handleDialogClose}
            className="text-xs w-full sm:w-auto"
          >
            Batal
          </Button>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              disabled={isPending || validMatchedCount === 0}
              onClick={handleApplyToFormClick}
              className="w-full sm:w-auto border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs font-semibold"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-emerald-600" />
              Isikan ke Form Aktif ({validMatchedCount} Item)
            </Button>

            <Button
              type="button"
              disabled={isPending || validMatchedCount === 0}
              onClick={handleBatchImportSubmit}
              className="w-full sm:w-auto bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs min-w-[140px]"
            >
              {isPending ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Mengimpor...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Send className="h-3.5 w-3.5" />
                  Import Direct Batch
                </span>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
