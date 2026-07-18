interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PermintaanDetailPage({ params }: PageProps) {
  const { id } = await params

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
        Detail Permintaan {id}
      </h1>
      <p className="text-slate-600 dark:text-slate-400">
        Informasi detail dan persetujuan (approval) permintaan barang.
      </p>
      
      {/* Content will be filled in Approval Module step */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-slate-100 dark:border-slate-700 text-center py-12">
        <p className="text-slate-500">Detail permintaan dengan ID {id} sedang disiapkan.</p>
      </div>
    </div>
  )
}
