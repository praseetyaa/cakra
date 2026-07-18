import React from 'react'
import { Card, CardContent } from '@/components/ui/card'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  description?: string
  trend?: {
    type: 'positive' | 'negative' | 'neutral'
    text: string
  }
}

export default function StatCard({
  title,
  value,
  icon,
  description,
  trend
}: StatCardProps) {
  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {title}
          </span>
          <div className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-350 flex items-center justify-center">
            {icon}
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {value}
          </span>
        </div>
        {(description || trend) && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {trend && (
              <span
                className={`font-semibold ${
                  trend.type === 'positive'
                    ? 'text-emerald-600 dark:text-emerald-450'
                    : trend.type === 'negative'
                    ? 'text-red-600 dark:text-red-450'
                    : 'text-slate-500'
                }`}
              >
                {trend.text}
              </span>
            )}
            {description && (
              <span className="text-slate-400 dark:text-slate-500">
                {description}
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
