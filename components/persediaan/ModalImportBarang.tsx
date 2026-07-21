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
  Loader2
} from 'lucide-react'
import { importBarangBulk, ImportBarangItemInput } from '@/app/actions/persediaan'

interface ModalImportBarangProps {
  isOpen: boolean
  onClose: () => void
}

export default function ModalImportBarang({ isOpen, onClose }: ModalImportBarangProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parsedItems, setParsedItems] = useState<ImportBarangItemInput[]>([])
  const [isReading, setIsReading] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleReset = () => {
    setFile(null)
    setParsedItems([])
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

    const worksheet = workbook.addWorksheet('Data Barang')

    // Define Columns
    worksheet.columns = [
      { header: 'Nama Barang', key: 'nama', width: 32 },
      { header: 'Kategori', key: 'kategori_nama', width: 26 },
      { header: 'Satuan', key: 'satuan', width: 14 },
      { header: 'Stok Awal', key: 'stok', width: 14 },
      { header: 'Stok Minimum', key: 'stok_minimum', width: 16 },
      { header: 'Lokasi Gudang', key: 'lokasi', width: 24 },
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

    // Add sample rows
    worksheet.addRow({
      nama: 'Kertas A4 70gr PaperOne',
      kategori_nama: 'Kertas & Catatan',
      satuan: 'Rim',
      stok: 50,
      stok_minimum: 10,
      lokasi: 'Gudang Persediaan Utama',
    })
    worksheet.addRow({
      nama: 'Pulpen Standard AE7 Hitam',
      kategori_nama: 'Alat Tulis Kantor (ATK)',
      satuan: 'Box',
      stok: 20,
      stok_minimum: 5,
      lokasi: 'Gudang Persediaan Utama',
    })
    worksheet.addRow({
      nama: 'Stopmap Folio Hijau Snelhecter',
      kategori_nama: 'Arsip & Map',
      satuan: 'Buah',
      stok: 100,
      stok_minimum: 15,
      lokasi: 'Gudang Persediaan',
    })

    // Generate buffer & trigger download
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'Template_Import_Barang_CAKRA.xlsx'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  // 2. Process File & Parse Excel Data
  const processExcelFile = async (selectedFile: File) => {
    setFile(selectedFile)
    setIsReading(true)
    setParseError(null)
    setImportError(null)
    setParsedItems([])

    try {
      const buffer = await selectedFile.arrayBuffer()
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.load(buffer)

      const worksheet = workbook.getWorksheet('Data Barang') || workbook.worksheets[0]

      if (!worksheet) {
        setParseError('Lembar kerja (worksheet) Excel tidak ditemukan.')
        setIsReading(false)
        return
      }

      const items: ImportBarangItemInput[] = []

      worksheet.eachRow((row, rowNumber) => {
        // Skip header row
        if (rowNumber === 1) return

        const rowValues = row.values as Array<unknown>
        if (!rowValues || rowValues.length < 2) return

        const getCellValue = (colIdx: number): string => {
          const val = rowValues[colIdx]
          if (val === null || val === undefined) return ''
          if (typeof val === 'object' && 'result' in val) return String((val as { result: unknown }).result || '')
          if (typeof val === 'object' && 'text' in val) return String((val as { text: unknown }).text || '')
          return String(val).trim()
        }

        const nama = getCellValue(1)
        const kategori_nama = getCellValue(2)
        const satuan = getCellValue(3) || 'Pcs'
        const stokStr = getCellValue(4)
        const stokMinStr = getCellValue(5)
        const lokasi = getCellValue(6) || 'Gudang Persediaan'

        if (nama) {
          const stok = parseInt(stokStr, 10)
          const stok_minimum = parseInt(stokMinStr, 10)

          items.push({
            nama,
            kategori_nama: kategori_nama || undefined,
            satuan: satuan || 'Pcs',
            stok: isNaN(stok) ? 0 : Math.max(0, stok),
            stok_minimum: isNaN(stok_minimum) ? 0 : Math.max(0, stok_minimum),
            lokasi: lokasi || 'Gudang Persediaan',
          })
        }
      })

      if (items.length === 0) {
        setParseError('Tidak ada data barang yang valid ditemukan pada file Excel tersebut. Harap gunakan template yang disediakan.')
      } else {
        setParsedItems(items)
      }
    } catch (err: unknown) {
      console.error('Failed to read Excel file:', err)
      setParseError('Gagal membaca file Excel. Harap pastikan format file berupa .xlsx atau .xls.')
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
        setParseError('Format file tidak didukung. Harap upload file .xlsx, .xls, atau .csv')
      }
    }
  }

  // 3. Submit Batch Import
  const handleImportSubmit = () => {
    if (parsedItems.length === 0) return
    setImportError(null)

    startTransition(async () => {
      const res = await importBarangBulk(parsedItems)
      if (res.success) {
        handleDialogClose()
      } else {
        setImportError(res.error || 'Gagal mengimpor data barang.')
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDialogClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <FileSpreadsheet className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
            Import Data Barang Persediaan (Excel)
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Unggah file Excel berisi daftar barang persediaan untuk di-import sekaligus ke dalam sistem.
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
                  Belum memiliki format template Excel?
                </h4>
                <p className="text-[11px] text-emerald-800/80 dark:text-emerald-400">
                  Unduh template baku CAKRA yang sudah disesuaikan dengan contoh pengisian data.
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
                ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 dark:border-emerald-500 scale-[0.99]'
                : file
                ? 'border-emerald-300 bg-slate-50/60 dark:bg-slate-900/40 dark:border-slate-700'
                : 'border-slate-300 hover:border-emerald-600 hover:bg-slate-50/60 dark:border-slate-800 dark:hover:border-emerald-600 dark:hover:bg-slate-900/40'
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
                    {(file.size / 1024).toFixed(1)} KB — Klik atau drag file baru untuk mengganti
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Tarik dan lepaskan file Excel di sini, atau <span className="text-emerald-700 dark:text-emerald-400 underline">pilih file</span>
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Format yang didukung: .XLSX, .XLS, .CSV (Maksimal 10MB)
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
          {parsedItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Pratinjau Data yang Siap Di-import ({parsedItems.length} Barang)
                </h4>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">
                  Validasi Sukses
                </Badge>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden max-h-[220px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900/50">
                      <TableHead className="text-[11px] py-2">Nama Barang</TableHead>
                      <TableHead className="text-[11px] py-2">Kategori</TableHead>
                      <TableHead className="text-[11px] py-2 text-center">Satuan</TableHead>
                      <TableHead className="text-[11px] py-2 text-center">Stok Awal</TableHead>
                      <TableHead className="text-[11px] py-2 text-center">Min. Stok</TableHead>
                      <TableHead className="text-[11px] py-2">Lokasi Gudang</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedItems.map((item, idx) => (
                      <TableRow key={idx} className="text-xs">
                        <TableCell className="font-semibold text-slate-800 dark:text-slate-200 py-2">
                          {item.nama}
                        </TableCell>
                        <TableCell className="text-slate-500 py-2">
                          {item.kategori_nama || '-'}
                        </TableCell>
                        <TableCell className="text-center text-slate-600 dark:text-slate-300 py-2">
                          {item.satuan}
                        </TableCell>
                        <TableCell className="text-center font-bold text-slate-900 dark:text-white py-2">
                          {item.stok}
                        </TableCell>
                        <TableCell className="text-center text-slate-500 py-2">
                          {item.stok_minimum}
                        </TableCell>
                        <TableCell className="text-slate-500 py-2 truncate max-w-[120px]">
                          {item.lokasi}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mx-0 mb-0 p-4 px-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 gap-2 flex flex-row items-center justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={handleDialogClose}
            className="text-xs"
          >
            Batal
          </Button>

          <Button
            type="button"
            disabled={isPending || parsedItems.length === 0}
            onClick={handleImportSubmit}
            className="bg-emerald-800 hover:bg-emerald-700 text-white font-semibold text-xs min-w-[140px]"
          >
            {isPending ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Mengimpor...
              </span>
            ) : (
              `Proses Import (${parsedItems.length} Barang)`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
