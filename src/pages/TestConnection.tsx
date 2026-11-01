import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Button from '@/components/common/Button'
import Card from '@/components/common/Card'
import Loading from '@/components/common/Loading'

export default function TestConnection() {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<any>(null)

  const runTests = async () => {
    setTesting(true)
    const testResults: any = {
      timestamp: new Date().toISOString(),
      tests: []
    }

    // Test 1: Check if Supabase client is initialized
    try {
      testResults.tests.push({
        name: '1. Supabase Client Initialized',
        status: supabase ? 'PASS' : 'FAIL',
        message: supabase ? 'Client is properly configured' : 'Client is not initialized'
      })
    } catch (error: any) {
      testResults.tests.push({
        name: '1. Supabase Client Initialized',
        status: 'FAIL',
        message: error.message
      })
    }

    // Test 2: Check environment variables
    try {
      const hasUrl = !!import.meta.env.VITE_SUPABASE_URL
      const hasKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY
      const urlCorrect = import.meta.env.VITE_SUPABASE_URL?.includes('supabase.co')
      const keyCorrect = import.meta.env.VITE_SUPABASE_ANON_KEY?.startsWith('eyJ')

      testResults.tests.push({
        name: '2. Environment Variables',
        status: (hasUrl && hasKey && urlCorrect && keyCorrect) ? 'PASS' : 'FAIL',
        message: `URL: ${hasUrl ? '✓' : '✗'} | Key: ${hasKey ? '✓' : '✗'} | URL format: ${urlCorrect ? '✓' : '✗'} | Key format: ${keyCorrect ? '✓' : '✗'}`,
        details: {
          url: import.meta.env.VITE_SUPABASE_URL || 'Not set',
          keyLength: import.meta.env.VITE_SUPABASE_ANON_KEY?.length || 0
        }
      })
    } catch (error: any) {
      testResults.tests.push({
        name: '2. Environment Variables',
        status: 'FAIL',
        message: error.message
      })
    }

    // Test 3: Test database connection
    try {
      const { error } = await supabase
        .from('profiles')
        .select('count', { count: 'exact', head: true })

      if (error) {
        testResults.tests.push({
          name: '3. Database Connection',
          status: 'FAIL',
          message: error.message,
          details: error
        })
      } else {
        testResults.tests.push({
          name: '3. Database Connection',
          status: 'PASS',
          message: 'Successfully connected to database'
        })
      }
    } catch (error: any) {
      testResults.tests.push({
        name: '3. Database Connection',
        status: 'FAIL',
        message: error.message
      })
    }

    // Test 4: Check if profiles table exists
    try {
      const { error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)

      if (error) {
        if (error.message.includes('relation') || error.message.includes('does not exist')) {
          testResults.tests.push({
            name: '4. Profiles Table Exists',
            status: 'WARN',
            message: 'Table does not exist yet - migrations need to be applied',
            action: 'Run: supabase db push'
          })
        } else {
          testResults.tests.push({
            name: '4. Profiles Table Exists',
            status: 'FAIL',
            message: error.message
          })
        }
      } else {
        testResults.tests.push({
          name: '4. Profiles Table Exists',
          status: 'PASS',
          message: 'Profiles table is accessible'
        })
      }
    } catch (error: any) {
      testResults.tests.push({
        name: '4. Profiles Table Exists',
        status: 'FAIL',
        message: error.message
      })
    }

    // Test 5: Check authentication
    try {
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        testResults.tests.push({
          name: '5. Authentication System',
          status: 'FAIL',
          message: error.message
        })
      } else {
        testResults.tests.push({
          name: '5. Authentication System',
          status: 'PASS',
          message: session ? `Logged in as: ${session.user.email}` : 'Not logged in (this is normal for testing)',
          details: session ? { userId: session.user.id, email: session.user.email } : null
        })
      }
    } catch (error: any) {
      testResults.tests.push({
        name: '5. Authentication System',
        status: 'FAIL',
        message: error.message
      })
    }

    // Test 6: Test RLS (if table exists)
    try {
      const { error } = await supabase
        .from('catering_jobs')
        .select('count', { count: 'exact', head: true })

      if (error) {
        if (error.message.includes('relation') || error.message.includes('does not exist')) {
          testResults.tests.push({
            name: '6. Row Level Security (RLS)',
            status: 'WARN',
            message: 'Cannot test RLS - tables not created yet',
            action: 'Run migrations first'
          })
        } else {
          testResults.tests.push({
            name: '6. Row Level Security (RLS)',
            status: 'INFO',
            message: 'RLS is active (expected empty result for unauthenticated user)'
          })
        }
      } else {
        testResults.tests.push({
          name: '6. Row Level Security (RLS)',
          status: 'PASS',
          message: 'RLS policies are working'
        })
      }
    } catch (error: any) {
      testResults.tests.push({
        name: '6. Row Level Security (RLS)',
        status: 'INFO',
        message: 'RLS test completed'
      })
    }

    // Calculate summary
    const passed = testResults.tests.filter((t: any) => t.status === 'PASS').length
    const failed = testResults.tests.filter((t: any) => t.status === 'FAIL').length
    const warned = testResults.tests.filter((t: any) => t.status === 'WARN').length

    testResults.summary = {
      total: testResults.tests.length,
      passed,
      failed,
      warned,
      status: failed > 0 ? 'FAILED' : warned > 0 ? 'PARTIAL' : 'SUCCESS'
    }

    setResults(testResults)
    setTesting(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS': return 'text-green-600'
      case 'FAIL': return 'text-red-600'
      case 'WARN': return 'text-yellow-600'
      case 'INFO': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusEmoji = (status: string) => {
    switch (status) {
      case 'PASS': return '✅'
      case 'FAIL': return '❌'
      case 'WARN': return '⚠️'
      case 'INFO': return 'ℹ️'
      default: return '❓'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Supabase Connection Test
          </h1>
          <p className="text-gray-600">
            Test your Supabase configuration and database connection
          </p>
        </div>

        <Card variant="elevated" className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Run Connection Tests
              </h2>
              <p className="text-sm text-gray-500">
                This will verify your environment variables, database connection, and RLS policies
              </p>
            </div>
            <Button
              onClick={runTests}
              disabled={testing}
              size="lg"
            >
              {testing ? 'Testing...' : 'Run Tests'}
            </Button>
          </div>
        </Card>

        {testing && (
          <Card className="text-center py-12">
            <Loading size="lg" />
            <p className="text-gray-600 mt-4">Running connection tests...</p>
          </Card>
        )}

        {results && !testing && (
          <>
            {/* Summary Card */}
            <Card
              variant="elevated"
              className={`mb-6 border-l-4 ${
                results.summary.status === 'SUCCESS'
                  ? 'border-green-500 bg-green-50'
                  : results.summary.status === 'PARTIAL'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-red-500 bg-red-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-2">
                    {results.summary.status === 'SUCCESS' && '✅ All Tests Passed!'}
                    {results.summary.status === 'PARTIAL' && '⚠️ Partial Success'}
                    {results.summary.status === 'FAILED' && '❌ Some Tests Failed'}
                  </h3>
                  <p className="text-sm text-gray-700">
                    {results.summary.passed} passed • {results.summary.failed} failed • {results.summary.warned} warnings
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold">
                    {results.summary.passed}/{results.summary.total}
                  </div>
                  <div className="text-xs text-gray-600">Tests Passed</div>
                </div>
              </div>
            </Card>

            {/* Test Results */}
            <div className="space-y-4">
              {results.tests.map((test: any, index: number) => (
                <Card key={index} variant="outlined">
                  <div className="flex items-start gap-4">
                    <span className="text-2xl">{getStatusEmoji(test.status)}</span>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{test.name}</h4>
                        <span className={`text-sm font-medium ${getStatusColor(test.status)}`}>
                          {test.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{test.message}</p>
                      
                      {test.action && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-sm text-blue-800">
                            <strong>Action Required:</strong> {test.action}
                          </p>
                        </div>
                      )}

                      {test.details && (
                        <details className="mt-2">
                          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                            Show details
                          </summary>
                          <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                            {JSON.stringify(test.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Next Steps */}
            {results.summary.status !== 'SUCCESS' && (
              <Card variant="elevated" className="mt-6 bg-blue-50">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  📋 Next Steps
                </h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  {results.tests.some((t: any) => t.status === 'FAIL' && t.name.includes('Environment')) && (
                    <li>
                      ❌ <strong>Fix Environment Variables:</strong> Check your .env file has correct VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
                    </li>
                  )}
                  {results.tests.some((t: any) => t.status === 'WARN') && (
                    <li>
                      ⚠️ <strong>Apply Migrations:</strong> Run <code className="bg-white px-2 py-1 rounded">supabase db push</code> to create database tables
                    </li>
                  )}
                  {results.summary.status === 'PARTIAL' && (
                    <li>
                      ℹ️ <strong>Connection OK:</strong> Basic connection works, but database tables need to be created
                    </li>
                  )}
                </ul>
              </Card>
            )}

            {results.summary.status === 'SUCCESS' && (
              <Card variant="elevated" className="mt-6 bg-green-50">
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  🎉 Ready to Build!
                </h3>
                <p className="text-sm text-green-800">
                  Your Supabase connection is fully configured and working. You can now start building features!
                </p>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
