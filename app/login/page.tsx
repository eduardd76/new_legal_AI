'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('[LOGIN v2] Starting login process...', { email })
    setLoading(true)
    setError(null)

    try {
      console.log('[LOGIN v2] Calling server-side API: /api/auth/login')

      // Call server-side login API which handles auth and sets cookies properly
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include', // Ensure cookies are sent/received
        redirect: 'follow', // Follow redirects automatically
      })

      console.log('[LOGIN v2] API response status:', response.status)
      console.log('[LOGIN v2] Response was redirected:', response.redirected)
      console.log('[LOGIN v2] Final URL:', response.url)

      // Check if response is a redirect or success
      if (response.redirected || response.url.includes('/dashboard')) {
        // Server redirected us to dashboard - cookies are set, reload page
        console.log('[LOGIN v2] SUCCESS! Server redirected to dashboard')
        window.location.href = '/dashboard'
        return
      }

      // If not redirected, check for JSON error response
      const data = await response.json()
      console.log('[LOGIN v2] API response data:', data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sign in')
      }

      // Should not reach here, but redirect anyway
      console.log('[LOGIN v2] SUCCESS! Redirecting to dashboard...')
      window.location.href = '/dashboard'
    } catch (err: any) {
      console.error('[LOGIN v2] ERROR:', err)
      const errorMessage = err.message || 'Failed to sign in. Please try again.'
      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">AI Contract Review</CardTitle>
          <CardDescription>
            Sign in to analyze contracts with AI-powered legal compliance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="text-center text-sm">
              <span className="text-muted-foreground">Don't have an account? </span>
              <Link href="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
