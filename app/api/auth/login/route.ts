import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()

    // Create response first
    const response = NextResponse.json({ success: true })

    // Create Supabase client with proper cookie handling
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
              response.cookies.set(name, value, options)
            })
          },
        },
      }
    )

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      console.error('Login error:', error)

      // Return specific error messages
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

    console.log('Login successful, cookies set in response')

    // Return response with cookies
    return NextResponse.json({
      success: true,
      user: data.user,
    }, {
      headers: response.headers,
    })
  } catch (error: any) {
    console.error('Unexpected login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
