import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Collect cookies that Supabase wants to set
    const cookiesToSet: Array<{ name: string; value: string; options: any }> = []

    // Create Supabase client with cookie collection
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookies) {
            console.log('[API v2 setAll] Called with', cookies.length, 'cookies')
            // Collect all cookies that Supabase wants to set
            cookies.forEach((cookie) => {
              console.log('[API v2 setAll] Cookie:', cookie.name)
              cookiesToSet.push(cookie)
            })
            console.log('[API v2 setAll] Total collected:', cookiesToSet.length)
          },
        },
      }
    )

    // Attempt login
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Login error:', error)

      if (error.message?.includes('Email not confirmed')) {
        return NextResponse.json(
          { error: 'Please confirm your email address before signing in.' },
          { status: 401 }
        )
      }
      if (error.message?.includes('Invalid login credentials')) {
        return NextResponse.json(
          { error: 'Invalid email or password.' },
          { status: 401 }
        )
      }

      return NextResponse.json(
        { error: error.message || 'Failed to sign in' },
        { status: 401 }
      )
    }

    if (!data?.session) {
      return NextResponse.json(
        { error: 'No session created' },
        { status: 500 }
      )
    }

    console.log('[API v2] Login successful!')
    console.log('[API v2] Cookies to set:', cookiesToSet.length)
    console.log('[API v2] Cookie names:', cookiesToSet.map(c => c.name))

    // Create redirect response to dashboard
    // Server-side redirect ensures cookies are set before navigation
    const redirectUrl = new URL('/dashboard', request.url)
    const response = NextResponse.redirect(redirectUrl)

    // Apply all cookies to the response
    cookiesToSet.forEach(({ name, value, options }) => {
      console.log('[API v2] Setting cookie:', name, 'with options:', options)
      response.cookies.set(name, value, options)
    })

    console.log('[API v2] Response created with', cookiesToSet.length, 'cookies and redirect to /dashboard')
    return response
  } catch (error: any) {
    console.error('Unexpected login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
