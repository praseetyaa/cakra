import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { getCategories } from '@/app/actions/persediaan'
import TabelBarang, { Barang } from '@/components/persediaan/TabelBarang'

export default async function PersediaanPage() {
  const supabase = await createClient()

  // 1. Get authenticated user profile details
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let userRole = 'pemohon'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile) {
      userRole = profile.role
    }
  }

  // 2. Fetch categories (will auto-seed if none exist)
  const categories = await getCategories()

  // 3. Fetch barang data (ordered by name)
  const { data: barangList, error } = await supabase
    .from('barang')
    .select(`
      id,
      kd_brng,
      kd_barang,
      kode_barang_lengkap,
      nama,
      kategori_id,
      satuan,
      stok,
      stok_minimum,
      lokasi,
      status,
      kategori_barang (
        nama
      )
    `)
    .order('nama', { ascending: true })

  if (error) {
    console.error('Failed to fetch inventory:', error)
  }

  const items = (barangList || []) as unknown as Barang[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Persediaan Barang (ATK)
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Daftar stok persediaan logistik kantor Pengadilan Agama Kajen.
        </p>
      </div>

      <TabelBarang
        initialBarang={items}
        categories={categories}
        userRole={userRole}
      />
    </div>
  )
}
