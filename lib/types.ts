export type UserRole = 'pemohon' | 'pengelola' | 'pimpinan' | 'admin'

export type StatusPermintaan = 'menunggu' | 'disetujui' | 'ditolak'

export type JenisRiwayat = 'keluar' | 'masuk' | 'penyesuaian'

export type JenisNotifikasi = 'permintaan_baru' | 'disetujui' | 'ditolak' | 'stok_menipis'

export interface Profile {
  id: string
  nama_lengkap: string
  unit_kerja: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
}

export interface UserProfileItem {
  id: string
  nama_lengkap: string
  unit_kerja: string | null
  role: UserRole
  created_at: string
}

export interface KategoriBarang {
  id: string
  nama: string
}

export interface Barang {
  id: string
  kd_brng?: string | null
  kd_barang?: string | null
  kode_barang_lengkap?: string | null
  nama: string
  kategori_id: string | null
  satuan: string
  stok: number
  stok_minimum: number
  lokasi: string
  status: 'Aman' | 'Menipis' | string
  updated_at: string
}

export interface Permintaan {
  id: string
  nomor: string
  pemohon_id: string
  unit_kerja: string
  keperluan: string
  catatan: string | null
  status: StatusPermintaan
  tanggal: string
  disetujui_oleh: string | null
  tanggal_keputusan: string | null
}

export interface PermintaanDetail {
  id: string
  permintaan_id: string
  barang_id: string
  jumlah: number
}

export interface RiwayatStok {
  id: string
  barang_id: string
  jumlah: number
  jenis: JenisRiwayat
  referensi_id: string | null
  keterangan: string | null
  created_at: string
}

export interface RiwayatBarangKeluarItem {
  id: string
  created_at: string
  jumlah: number
  keterangan: string | null
  barang: {
    nama: string
    satuan: string
  }
  permintaan: {
    id: string
    nomor: string
    unit_kerja: string
  } | null
  pemohon: {
    nama_lengkap: string
  } | null
}

export interface PaginatedRiwayatResponse {
  data: RiwayatBarangKeluarItem[]
  totalPages: number
  totalCount: number
  currentPage: number
}

export interface Notifikasi {
  id: string
  user_id: string
  judul: string
  pesan: string | null
  jenis: JenisNotifikasi
  dibaca: boolean
  created_at: string
}

// Database schema helper type definitions
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at'> & { created_at?: string }
        Update: Partial<Profile>
      }
      kategori_barang: {
        Row: KategoriBarang
        Insert: Omit<KategoriBarang, 'id'> & { id?: string }
        Update: Partial<KategoriBarang>
      }
      barang: {
        Row: Barang
        Insert: Omit<Barang, 'id' | 'status' | 'updated_at'> & { id?: string; updated_at?: string }
        Update: Partial<Barang>
      }
      permintaan: {
        Row: Permintaan
        Insert: Omit<Permintaan, 'id' | 'nomor' | 'tanggal'> & { id?: string; nomor?: string; tanggal?: string }
        Update: Partial<Permintaan>
      }
      permintaan_detail: {
        Row: PermintaanDetail
        Insert: Omit<PermintaanDetail, 'id'> & { id?: string }
        Update: Partial<PermintaanDetail>
      }
      riwayat_stok: {
        Row: RiwayatStok
        Insert: Omit<RiwayatStok, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<RiwayatStok>
      }
      notifikasi: {
        Row: Notifikasi
        Insert: Omit<Notifikasi, 'id' | 'created_at' | 'dibaca'> & { id?: string; created_at?: string; dibaca?: boolean }
        Update: Partial<Notifikasi>
      }
    }
  }
}
