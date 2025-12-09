import { getCurrentUser } from '@/lib/auth/utils'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

export default async function ProfilePage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }

  const getRoleDisplay = (role: string) => {
    const roles = {
      admin: { label: 'Administrator', color: 'destructive' },
      legal_professional: { label: 'Legal Professional', color: 'default' },
      business_user: { label: 'Business User', color: 'secondary' },
    }
    return roles[role as keyof typeof roles] || { label: role, color: 'secondary' }
  }

  const roleDisplay = getRoleDisplay(user.role)

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>Your account details and role</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Full Name</label>
              <p className="mt-1 text-lg">{user.full_name || 'Not set'}</p>
            </div>
            
            <Separator />

            <div>
              <label className="text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-lg">{user.email}</p>
            </div>

            <Separator />

            <div>
              <label className="text-sm font-medium text-gray-700">Role</label>
              <div className="mt-2">
                <Badge variant={roleDisplay.color as any}>{roleDisplay.label}</Badge>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {user.role === 'legal_professional' && 
                  'You have full access to all features and can provide legal review.'}
                {user.role === 'business_user' && 
                  'You can upload and analyze documents. AI analysis is not legal advice.'}
                {user.role === 'admin' && 
                  'You have full administrative access to the system.'}
              </p>
            </div>

            <Separator />

            <div>
              <label className="text-sm font-medium text-gray-700">Account Created</label>
              <p className="mt-1">{new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {user.role === 'business_user' && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">Important Notice</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-800">
              As a Business User, the AI-powered analysis you receive is for informational purposes only 
              and <strong>does not constitute legal advice</strong>. All contract reviews and decisions 
              should be validated by a qualified legal professional before acting on them.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
