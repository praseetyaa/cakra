import React from 'react'
import { Badge } from '@/components/ui/badge'

export type StatusType = 'aman' | 'menipis' | 'menunggu' | 'disetujui' | 'ditolak' | string

interface StatusBadgeProps {
  status: StatusType
  className?: string
}

const STYLE_MAP: Record<string, string> = {
  aman: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  disetujui: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  menipis: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  menunggu: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  ditolak: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
}

const LABEL_MAP: Record<string, string> = {
  aman: 'Aman',
  menipis: 'Stok Menipis',
  menunggu: 'Menunggu',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const normalizedKey = status.toLowerCase()
  const style = STYLE_MAP[normalizedKey] || 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-800 dark:text-gray-200'
  const label = LABEL_MAP[normalizedKey] || status

  return (
    <Badge variant="outline" className={`${style} font-medium ${className}`}>
      {label}
    </Badge>
  )
}
