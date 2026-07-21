'use client'

import React, { useState, useTransition } from 'react'
import { getReportData, StockReportItem, OutgoingReportItem } from '@/app/actions/laporan'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FileText, Table as TableIcon, FileSpreadsheet, Loader2, Calendar } from 'lucide-react'
import { jsPDF } from 'jspdf'
import ExcelJS from 'exceljs'
import { cn } from '@/lib/utils'

export default function LaporanPage() {
  const [reportType, setReportType] = useState<'keluar' | 'stok' | 'menipis'>('keluar')
  const [month, setMonth] = useState<string>('0') // 0 = Semua
  const [year, setYear] = useState<string>(new Date().getFullYear().toString())
  
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const monthNames = [
    'Semua Bulan',
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ]

  const yearsList = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString())

  const handleDownload = (format: 'pdf' | 'excel') => {
    setMessage(null)
    const monthNum = parseInt(month, 10)
    const yearNum = parseInt(year, 10)

    startTransition(async () => {
      try {
        const data = await getReportData(reportType, monthNum, yearNum)
        
        if (!data || data.length === 0) {
          setMessage({ type: 'error', text: 'Tidak ada data untuk laporan yang dipilih.' })
          return
        }

        if (format === 'pdf') {
          generatePDF(reportType, data, monthNum, yearNum)
        } else {
          await generateExcel(reportType, data, monthNum, yearNum)
        }

        setMessage({ type: 'success', text: `Laporan berhasil diunduh dalam format ${format.toUpperCase()}.` })
      } catch (err: unknown) {
        console.error('Error generating report:', err)
        const errMsg = err instanceof Error ? err.message : 'Gagal membuat laporan. Silakan coba lagi.'
        setMessage({ type: 'error', text: errMsg })
      }
    })
  }

  const generatePDF = (type: 'keluar' | 'stok' | 'menipis', data: unknown[], selectedMonth: number, selectedYear: number) => {
    const isStock = type === 'stok' || type === 'menipis'
    const doc = new jsPDF(isStock ? { orientation: 'landscape', unit: 'mm', format: 'a4' } : {})

    // Landscape A4: 297×210mm → usable x: 14–283 (269mm), center: 149
    // Portrait  A4: 210×297mm → usable x: 14–196 (182mm), center: 105
    const centerX  = isStock ? 149 : 105
    const lineStart = 14
    const lineEnd   = isStock ? 283 : 196
    const tableWidth = lineEnd - lineStart
    const pageBreakY = isStock ? 182 : 270

    // --- Kop Surat ---
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(14)
    doc.text('PENGADILAN AGAMA KAJEN CLASS I.B', centerX, 15, { align: 'center' })
    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('Jl. Raya Kajen No. 12, Kajen, Kabupaten Pekalongan, Jawa Tengah 51161', centerX, 20, { align: 'center' })
    doc.text('Telp: (0285) 381666 | Email: pa.kajen@gmail.com', centerX, 24, { align: 'center' })

    // Double Line Separator
    doc.setLineWidth(0.8)
    doc.line(lineStart, 27, lineEnd, 27)
    doc.setLineWidth(0.2)
    doc.line(lineStart, 28, lineEnd, 28)

    // --- Report Title ---
    doc.setFont('Helvetica', 'bold')
    doc.setFontSize(11)
    if (type === 'keluar') {
      const periodStr = `${selectedMonth > 0 ? monthNames[selectedMonth] : 'Semua Bulan'} ${selectedYear > 0 ? selectedYear : ''}`
      doc.text('LAPORAN TRANSAKSI BARANG KELUAR (ATK)', centerX, 36, { align: 'center' })
      doc.setFont('Helvetica', 'normal')
      doc.setFontSize(9)
      doc.text(`Periode: ${periodStr}`, centerX, 41, { align: 'center' })
    } else if (type === 'stok') {
      doc.text('LAPORAN STOK PERSEDIAAN BARANG (ATK)', centerX, 36, { align: 'center' })
    } else {
      doc.text('LAPORAN STOK PERSEDIAAN BARANG MENIPIS (KRITIS)', centerX, 36, { align: 'center' })
    }

    // --- Meta Info ---
    let y: number
    if (isStock) {
      doc.setFont('Helvetica', 'normal')
      doc.setFontSize(9)
      doc.text('Kode UAKPB    : 005.01.0300.614710.000.KD', lineStart, 43)
      doc.text('Instansi            : Pengadilan Agama Kajen Class I.B', lineStart, 48)
      doc.text(`Tanggal Cetak  : ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, lineStart, 53)
      y = 62
    } else {
      doc.setFont('Helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, lineEnd, 47, { align: 'right' })
      y = 53
    }

    // --- Table ---
    // Helper: draw stock table header
    const drawStockHeader = (headerY: number) => {
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setFillColor(235, 235, 235)
      doc.rect(lineStart, headerY, tableWidth, 7, 'F')
      doc.rect(lineStart, headerY, tableWidth, 7, 'S')
      // Columns (landscape, 269mm wide):
      // No(8) | KdBrng(20) | KdBarang(30) | KodeLgk(48) | Nama(45) | Kat(40) | Sat(14) | Lok(30) | Min(12) | Stok(10) | Status(12)
      doc.text('No',              16, headerY + 5)
      doc.text('Kd Brng',         23, headerY + 5)
      doc.text('Kd Barang',       43, headerY + 5)
      doc.text('Kode Barang Lgk', 73, headerY + 5)
      doc.text('Nama Barang',    121, headerY + 5)
      doc.text('Kategori',       166, headerY + 5)
      doc.text('Satuan',         206, headerY + 5)
      doc.text('Lokasi',         220, headerY + 5)
      doc.text('Min',            250, headerY + 5)
      doc.text('Stok',           262, headerY + 5)
      doc.text('Status',         272, headerY + 5)
    }

    if (isStock) {
      drawStockHeader(y)
      y += 7
      doc.setFont('Helvetica', 'normal')
      doc.setFontSize(7.5)

      data.forEach((rawItem, idx) => {
        const item = rawItem as StockReportItem
        if (y > pageBreakY) {
          doc.addPage()
          y = 20
          drawStockHeader(y)
          y += 7
          doc.setFont('Helvetica', 'normal')
          doc.setFontSize(7.5)
        }

        doc.rect(lineStart, y, tableWidth, 7, 'S')
        doc.text((idx + 1).toString(), 16, y + 5)

        let kdBrng = item.kd_brng || '-'
        if (kdBrng.length > 10) kdBrng = kdBrng.substring(0, 9) + '.'
        doc.text(kdBrng, 23, y + 5)

        let kdBarang = item.kd_barang || '-'
        if (kdBarang.length > 14) kdBarang = kdBarang.substring(0, 13) + '.'
        doc.text(kdBarang, 43, y + 5)

        let kdeLgk = item.kode_barang_lengkap || '-'
        if (kdeLgk.length > 20) kdeLgk = kdeLgk.substring(0, 19) + '.'
        doc.text(kdeLgk, 73, y + 5)

        let nama = item.nama
        if (nama.length > 24) nama = nama.substring(0, 22) + '..'
        doc.text(nama, 121, y + 5)

        let kat = item.kategori
        if (kat.length > 20) kat = kat.substring(0, 18) + '..'
        doc.text(kat, 166, y + 5)

        doc.text(item.satuan, 206, y + 5)

        let lok = item.lokasi
        if (lok.length > 14) lok = lok.substring(0, 12) + '..'
        doc.text(lok, 220, y + 5)

        doc.text(item.stok_minimum.toString(), 250, y + 5)
        doc.text(item.stok.toString(), 262, y + 5)

        if (item.status === 'Menipis') doc.setFont('Helvetica', 'bold')
        doc.text(item.status, 272, y + 5)
        doc.setFont('Helvetica', 'normal')
        doc.setFontSize(7.5)

        y += 7
      })
    } else {
      // Outgoing report columns
      doc.setFont('Helvetica', 'bold')
      doc.setFontSize(8.5)
      doc.setFillColor(235, 235, 235)
      doc.rect(14, y, 182, 7, 'F')
      doc.rect(14, y, 182, 7, 'S')
      doc.text('No', 15, y + 5)
      doc.text('Tanggal', 22, y + 5)
      doc.text('Permintaan', 42, y + 5)
      doc.text('Pemohon', 64, y + 5)
      doc.text('Unit', 94, y + 5)
      doc.text('Barang', 114, y + 5)
      doc.text('Jml', 150, y + 5)
      doc.text('Keterangan', 164, y + 5)

      y += 7
      doc.setFont('Helvetica', 'normal')
      data.forEach((rawItem, idx) => {
        const item = rawItem as OutgoingReportItem
        if (y > pageBreakY) {
          doc.addPage()
          y = 20
          doc.setFont('Helvetica', 'bold')
          doc.setFillColor(235, 235, 235)
          doc.rect(14, y, 182, 7, 'F')
          doc.rect(14, y, 182, 7, 'S')
          doc.text('No', 15, y + 5)
          doc.text('Tanggal', 22, y + 5)
          doc.text('Permintaan', 42, y + 5)
          doc.text('Pemohon', 64, y + 5)
          doc.text('Unit', 94, y + 5)
          doc.text('Barang', 114, y + 5)
          doc.text('Jml', 150, y + 5)
          doc.text('Keterangan', 164, y + 5)
          y += 7
          doc.setFont('Helvetica', 'normal')
        }

        doc.rect(14, y, 182, 7, 'S')
        doc.text((idx + 1).toString(), 15, y + 5)
        const dateFormatted = new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' })
        doc.text(dateFormatted, 22, y + 5)
        doc.text(item.nomor, 42, y + 5)
        let pem = item.pemohon
        if (pem.length > 15) pem = pem.substring(0, 13) + '..'
        doc.text(pem, 64, y + 5)
        let unit = item.unit_kerja
        if (unit.length > 10) unit = unit.substring(0, 8) + '..'
        doc.text(unit, 94, y + 5)
        let brg = item.nama_barang
        if (brg.length > 18) brg = brg.substring(0, 16) + '..'
        doc.text(brg, 114, y + 5)
        doc.text(`${item.jumlah} ${item.satuan}`, 150, y + 5)
        let ket = item.keterangan
        if (ket.length > 18) ket = ket.substring(0, 16) + '..'
        doc.text(ket, 164, y + 5)
        y += 7
      })
    }

    // --- Signatures ---
    const sig1X = isStock ? 50 : 30
    const sig2X = isStock ? 195 : 130
    const sigBreakY = isStock ? 155 : 230
    if (y > sigBreakY) {
      doc.addPage()
      y = 30
    } else {
      y += 15
    }

    doc.setFont('Helvetica', 'normal')
    doc.setFontSize(9)
    doc.text('Mengetahui,', sig1X, y)
    doc.text('Pimpinan Pengadilan Agama Kajen', sig1X, y + 5)
    doc.text('__________________________________', sig1X, y + 25)

    doc.text('Kajen, ' + new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }), sig2X, y)
    doc.text('Pengelola Persediaan', sig2X, y + 5)
    doc.text('__________________________________', sig2X, y + 25)

    doc.save(`Laporan_${type}_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const generateExcel = async (type: 'keluar' | 'stok' | 'menipis', data: unknown[], selectedMonth: number, selectedYear: number) => {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Laporan')

    // Excel formatting styles
    const headerStyle = {
      font: { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF064E3B' } }, // emerald-900
      alignment: { horizontal: 'center', vertical: 'middle' },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    }
    
    const cellStyle = {
      font: { name: 'Arial', size: 10 },
      border: {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    }

    if (type === 'stok' || type === 'menipis') {
      // Row 1: Title (merged, centered)
      const titleRow = worksheet.addRow([type === 'stok' ? 'LAPORAN STOK PERSEDIAAN BARANG (ATK)' : 'LAPORAN STOK PERSEDIAAN BARANG MENIPIS (KRITIS)'])
      titleRow.font = { bold: true, size: 13 }
      worksheet.mergeCells('A1:K1')
      titleRow.getCell(1).alignment = { horizontal: 'center' }

      // Row 2: blank
      worksheet.addRow([])

      // Rows 3-5: Meta info
      const uakpbRow = worksheet.addRow(['Kode UAKPB', '005.01.0300.614710.000.KD'])
      uakpbRow.getCell(1).font = { name: 'Arial', size: 10, bold: true }
      const instansiRow = worksheet.addRow(['Instansi', 'Pengadilan Agama Kajen Class I.B'])
      instansiRow.getCell(1).font = { name: 'Arial', size: 10, bold: true }
      const tanggalRow = worksheet.addRow(['Tanggal Cetak', new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })])
      tanggalRow.getCell(1).font = { name: 'Arial', size: 10, bold: true }

      // Row 6: blank
      worksheet.addRow([])

      // Row 7: Column headers
      worksheet.addRow(['No', 'Kd Brng', 'Kd Barang', 'Kode Barang Lengkap', 'Nama Barang', 'Kategori', 'Satuan', 'Lokasi', 'Stok Minimum', 'Stok', 'Status'])
      worksheet.columns = [
        { width: 5 }, { width: 12 }, { width: 18 }, { width: 25 }, { width: 32 }, { width: 25 }, { width: 12 }, { width: 22 }, { width: 15 }, { width: 12 }, { width: 15 }
      ]

      // Row 8+: Data
      data.forEach((rawItem, idx) => {
        const item = rawItem as StockReportItem
        worksheet.addRow([
          idx + 1, item.kd_brng, item.kd_barang, item.kode_barang_lengkap, item.nama, item.kategori, item.satuan, item.lokasi, item.stok_minimum, item.stok, item.status
        ])
      })
    } else {
      worksheet.addRow(['LAPORAN TRANSAKSI BARANG KELUAR (ATK)']).font = { bold: true, size: 13 }
      const periodStr = `${selectedMonth > 0 ? monthNames[selectedMonth] : 'Semua Bulan'} ${selectedYear > 0 ? selectedYear : ''}`
      worksheet.addRow([`Periode: ${periodStr}`])
      worksheet.addRow([`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`])
      worksheet.addRow([])

      worksheet.addRow(['No', 'Tanggal', 'No. Permintaan', 'Pemohon', 'Unit Kerja', 'Nama Barang', 'Jumlah', 'Satuan', 'Keterangan'])
      worksheet.columns = [
        { width: 5 }, { width: 15 }, { width: 18 }, { width: 22 }, { width: 18 }, { width: 28 }, { width: 10 }, { width: 10 }, { width: 25 }
      ]

      data.forEach((rawItem, idx) => {
        const item = rawItem as OutgoingReportItem
        worksheet.addRow([
          idx + 1, new Date(item.tanggal).toLocaleDateString('id-ID'), item.nomor, item.pemohon, item.unit_kerja, item.nama_barang, item.jumlah, item.satuan, item.keterangan
        ])
      })
    }

    // Format table styles
    const headerRowNum = (type === 'stok' || type === 'menipis') ? 7 : 5
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber < headerRowNum) return
      const isHeader = rowNumber === headerRowNum

      row.eachCell((cell) => {
        if (isHeader) {
          cell.font = headerStyle.font
          cell.fill = headerStyle.fill as ExcelJS.Fill
          cell.alignment = headerStyle.alignment as Partial<ExcelJS.Alignment>
          cell.border = headerStyle.border as Partial<ExcelJS.Borders>
        } else if (rowNumber > headerRowNum) {
          cell.font = cellStyle.font
          cell.border = cellStyle.border as Partial<ExcelJS.Borders>
        }
      })
    })

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Laporan_${type}_${new Date().toISOString().split('T')[0]}.xlsx`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Laporan Persediaan
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Unduh berkas laporan rekapitulasi data mutasi persediaan barang habis pakai Pengadilan Agama Kajen.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Parameters Selection Card */}
        <Card className="lg:col-span-1 shadow-sm border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/40 pb-4">
            <CardTitle className="text-sm font-bold uppercase text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
              <Calendar className="h-4.5 w-4.5" /> Parameter Laporan
            </CardTitle>
            <CardDescription className="text-xs">Pilih jenis dan periode data yang akan diekspor.</CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-5">
            {/* Report Type */}
            <div className="space-y-2">
              <Label htmlFor="reportType" className="text-xs font-semibold">Jenis Laporan</Label>
              <Select value={reportType} onValueChange={(val) => setReportType((val || 'keluar') as 'keluar' | 'stok' | 'menipis')}>
                <SelectTrigger id="reportType">
                  <SelectValue placeholder="Pilih Jenis Laporan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="keluar">Laporan Barang Keluar</SelectItem>
                  <SelectItem value="stok">Laporan Stok Keseluruhan</SelectItem>
                  <SelectItem value="menipis">Laporan Stok Menipis</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Outgoing specific period selection */}
            {reportType === 'keluar' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="month" className="text-xs font-semibold">Bulan</Label>
                  <Select value={month} onValueChange={(val) => setMonth(val || '0')}>
                    <SelectTrigger id="month">
                      <SelectValue placeholder="Pilih Bulan" />
                    </SelectTrigger>
                    <SelectContent>
                      {monthNames.map((m, idx) => (
                        <SelectItem key={idx} value={idx.toString()}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year" className="text-xs font-semibold">Tahun</Label>
                  <Select value={year} onValueChange={(val) => setYear(val || '')}>
                    <SelectTrigger id="year">
                      <SelectValue placeholder="Pilih Tahun" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearsList.map((y) => (
                        <SelectItem key={y} value={y}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/40">
              <Button
                onClick={() => handleDownload('pdf')}
                disabled={isPending}
                className="w-full bg-emerald-800 hover:bg-emerald-700 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-sm"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Unduh Laporan PDF
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDownload('excel')}
                disabled={isPending}
                className="w-full border-slate-200 hover:bg-slate-50 text-slate-700 dark:text-slate-300 font-medium text-xs flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                Unduh Laporan Excel
              </Button>
            </div>

            {/* Alerts */}
            {message && (
              <div
                className={cn(
                  'p-3.5 text-xs rounded border transition-all mt-4',
                  message.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400'
                    : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/20 dark:border-red-900/40 dark:text-red-400'
                )}
              >
                {message.text}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visual Mock / Documentation Card */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm flex flex-col justify-between">
          <CardHeader className="border-b border-slate-100 dark:border-slate-800/40 pb-4">
            <CardTitle className="text-sm font-bold uppercase text-slate-400 flex items-center gap-2">
              <TableIcon className="h-4.5 w-4.5" /> Panduan Format Unduh Laporan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <div className="space-y-3">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Laporan Format PDF (.pdf)</h4>
                <p className="mt-1">
                  Format dokumen resmi yang siap cetak. Memiliki Kop Surat resmi Pengadilan Agama Kajen Kelas I.B, tabel bergaris rapi, ringkasan cetak, serta kolom tandatangan mengetahui Pimpinan dan Pengelola Persediaan Barang di bagian akhir halaman. Cocok digunakan sebagai arsip cetak fisik bulanan.
                </p>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800/40 pt-3">
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Laporan Format Excel (.xlsx)</h4>
                <p className="mt-1">
                  Format lembar kerja dinamis. Memiliki struktur kolom yang luas untuk memudahkan pengelola/pimpinan melakukan penyaringan, pengurutan, maupun pengolahan data lebih lanjut secara digital. Header kolom dihias dengan tema hijau tua (Branding CAKRA) untuk tampilan premium.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
