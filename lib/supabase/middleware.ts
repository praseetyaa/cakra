import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not remove auth.getUser() call. It is required to refresh the session.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Route guarding based on session presence
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register')
  
  // Dashboard sub-routes (everything except /login, /register, and static assets)
  const isDashboardPage =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/permintaan') ||
    request.nextUrl.pathname.startsWith('/persediaan') ||
    request.nextUrl.pathname.startsWith('/riwayat') ||
    request.nextUrl.pathname.startsWith('/laporan') ||
    request.nextUrl.pathname.startsWith('/notifikasi') ||
    request.nextUrl.pathname.startsWith('/akun')

  if (!user && isDashboardPage) {
    // Redirect unauthenticated user to login page
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage) {
    // Redirect authenticated user to dashboard
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
