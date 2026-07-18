export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
      <p className="text-slate-600 dark:text-slate-400">
        Selamat datang di aplikasi Catatan Kendali Persediaan (CAKRA) Pengadilan Agama Kajen.
      </p>
      
      {/* Content will be filled in Dashboard Module step */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="font-semibold text-slate-500">Permintaan Hari Ini</h3>
          <p className="text-2xl font-bold mt-2">-</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="font-semibold text-slate-500">Menunggu Persetujuan</h3>
          <p className="text-2xl font-bold mt-2">-</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="font-semibold text-slate-500">Stok Menipis</h3>
          <p className="text-2xl font-bold mt-2">-</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="font-semibold text-slate-500">Transaksi Bulan Ini</h3>
          <p className="text-2xl font-bold mt-2">-</p>
        </div>
      </div>
    </div>
  )
}
