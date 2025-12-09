import { getCurrentUser } from '@/lib/auth/utils'
import { redirect } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, AlertTriangle, CheckCircle2, Clock } from 'lucide-react'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }

  // Mock stats for MVP
  const stats = [
    {
      name: 'Total Documents',
      value: '0',
      icon: FileText,
      description: 'Uploaded contracts',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      name: 'High Risk Issues',
      value: '0',
      icon: AlertTriangle,
      description: 'Requiring attention',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      name: 'Analyses Complete',
      value: '0',
      icon: CheckCircle2,
      description: 'Successfully processed',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      name: 'Processing',
      value: '0',
      icon: Clock,
      description: 'Currently analyzing',
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user.full_name || 'User'}
        </h1>
        <p className="mt-2 text-gray-600">
          AI-powered contract analysis for Romanian and EU law compliance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {stat.name}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
              <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with contract analysis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a 
              href="/dashboard/upload"
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer"
            >
              <FileText className="h-8 w-8 text-blue-600 mb-2" />
              <h3 className="font-semibold text-gray-900">Upload Document</h3>
              <p className="text-sm text-gray-500 mt-1">
                Upload a contract for AI analysis
              </p>
            </a>

            <a 
              href="/dashboard/documents"
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors cursor-pointer"
            >
              <FileText className="h-8 w-8 text-green-600 mb-2" />
              <h3 className="font-semibold text-gray-900">View Documents</h3>
              <p className="text-sm text-gray-500 mt-1">
                Browse your uploaded contracts
              </p>
            </a>

            <a 
              href="/dashboard/legal-db"
              className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors cursor-pointer"
            >
              <FileText className="h-8 w-8 text-purple-600 mb-2" />
              <h3 className="font-semibold text-gray-900">Legal Database</h3>
              <p className="text-sm text-gray-500 mt-1">
                Search Romanian & EU legislation
              </p>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Role-specific disclaimer */}
      {user.role === 'business_user' && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="text-amber-900">Important Notice</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-800">
              This AI-powered tool provides analysis assistance and is <strong>not a substitute for legal advice</strong>. 
              All results should be reviewed by a qualified legal professional before making any decisions or taking action 
              based on the analysis.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
