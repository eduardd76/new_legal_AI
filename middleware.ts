import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Middleware v2 - Updated with comprehensive logging
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  console.log(`[Middleware v2] ${pathname} - Checking auth...`)

  const allCookies = request.cookies.getAll()
  console.log(`[Middleware v2] Incoming cookies (${allCookies.length}):`, allCookies.map(c => c.name))

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

  // Refresh session if expired
  const { data: { user }, error } = await supabase.auth.getUser()

  console.log(`[Middleware v2] ${pathname} - User:`, user ? `${user.email} (${user.id})` : 'null')
  if (error) {
    console.error(`[Middleware v2] ${pathname} - Auth error:`, error.message)
  }

  // Protect routes that require authentication
  const protectedRoutes = ['/dashboard', '/documents', '/admin']
  const isProtectedRoute = protectedRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  )

  if (isProtectedRoute && !user) {
    console.log(`[Middleware v2] ${pathname} - REDIRECTING to /login (no user)`)
    return NextResponse.redirect(new URL('/login', request.url))
  }

  console.log(`[Middleware v2] ${pathname} - Allowing access`)
  return supabaseResponse
}

export const config = {
  matcher: [
    // Match all routes EXCEPT: _next/static, _next/image, favicon, images, AND API routes
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
