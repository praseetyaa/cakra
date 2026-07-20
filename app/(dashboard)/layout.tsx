import React from 'react'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/shared/Sidebar'
import Navbar from '@/components/shared/Navbar'
import BottomNav from '@/components/shared/BottomNav'

interface UserProfile {
  nama_lengkap: string
  role: string
  avatar_url?: string | null
}

export const dynamic = 'force-dynamic'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let profile: UserProfile | null = null

  try {
    const supabase = await createClient()
    
    // Retrieve the authenticated user session
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      // Fetch profile data matching user id
      const { data } = await supabase
        .from('profiles')
        .select('nama_lengkap, role, avatar_url')
        .eq('id', user.id)
        .single()

      if (data) {
        profile = data as UserProfile
      } else {
        // Fallback if profile trigger hasn't finished replication yet
        profile = {
          nama_lengkap: user.email || 'Pegawai',
          role: 'pemohon',
        }
      }
    }
  } catch (error: any) {
    if (error?.digest === 'DYNAMIC_SERVER_USAGE') {
      throw error
    }
    console.error('Error in DashboardLayout:', error)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Desktop Sidebar */}
      <Sidebar profile={profile} />

      {/* Main Viewport Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header Bar */}
        <Navbar profile={profile} />

        {/* Dynamic Pages Context View */}
        <main className="flex-1 overflow-auto p-4 md:p-8 pb-20 md:pb-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation Bar */}
        <BottomNav />
      </div>
    </div>
  )
}
