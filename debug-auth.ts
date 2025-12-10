import { createServerClient } from '@supabase/ssr'

async function debugAuth() {
  console.log('🔍 Debugging authentication...\n')

  console.log('Environment variables:')
  console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...')
  console.log()

  // Simulate what middleware does
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll(cookiesToSet) {
          console.log('Cookies to set:', cookiesToSet.length)
        },
      },
    }
  )

  console.log('Calling supabase.auth.getUser()...')
  const { data, error } = await supabase.auth.getUser()

  console.log('\nResult:')
  console.log('User:', data.user ? `${data.user.email} (${data.user.id})` : 'null')
  console.log('Error:', error ? error.message : 'null')

  if (data.user) {
    console.log('\n⚠️ WARNING: User found with mock credentials! This should not happen.')
  } else {
    console.log('\n✅ No user found (expected with mock credentials)')
  }
}

debugAuth()
