'use client'

import React from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'

interface ChartDataPoint {
  tanggal: string
  transaksi: number
}

interface GrafikTransaksiProps {
  data: ChartDataPoint[]
  label: string
}

export default function GrafikTransaksi({ data, label }: GrafikTransaksiProps) {
  return (
    <div className="w-full h-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          Grafik Transaksi (7 Hari Terakhir)
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          {label}
        </p>
      </div>

      <div className="w-full h-60 text-xs">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{
              top: 10,
              right: 10,
              left: -20,
              bottom: 0
            }}
          >
            <defs>
              <linearGradient id="colorTransaksi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#065f46" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#065f46" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-slate-100 dark:stroke-slate-800/60" />
            <XAxis
              dataKey="tanggal"
              tickLine={false}
              axisLine={false}
              className="fill-slate-400 font-medium"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              className="fill-slate-400 font-medium"
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-slate-900 text-white dark:bg-slate-800 p-3 rounded-lg border border-slate-800 dark:border-slate-700 shadow-lg space-y-1">
                      <p className="font-bold text-[10px] text-slate-400">
                        {payload[0].payload.tanggal}
                      </p>
                      <p className="text-xs font-semibold text-emerald-400">
                        {payload[0].value} {payload[0].value === 1 ? 'Transaksi' : 'Item'}
                      </p>
                    </div>
                  )
                }
                return null
              }}
            />
            <Area
              type="monotone"
              dataKey="transaksi"
              stroke="#047857"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorTransaksi)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
