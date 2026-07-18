export default function PermintaanPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Daftar Permintaan Barang</h1>
      </div>
      <p className="text-slate-600 dark:text-slate-400">
        Kelola dan ajukan permintaan barang persediaan kantor (ATK).
      </p>
      
      {/* Content will be filled in Permintaan Module step */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 text-center py-12">
        <p className="text-slate-500">Daftar permintaan barang sedang disiapkan.</p>
      </div>
    </div>
  )
}
