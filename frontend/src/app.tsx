import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthenticationProvider, useAuthentication } from '@/hooks/useAuthentication'
import KnowledgeBasePage from '@/pages/KnowledgeBasePage'
import UserPage from '@/pages/UserPage'
import SystemSettingsPage from '@/pages/SystemSettingsPage'
import DocumentPage from '@/pages/DocumentPage'
import DocumentsPage from '@/pages/DocumentsPage'
import ChatPage from '@/pages/ChatPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import { Layout } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, FileText, Users } from 'lucide-react'
import { ApiService } from '@/services/api'
import { Helmet } from 'react-helmet-async'
import { UserRole } from '@/types'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthentication()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, hasRole } = useAuthentication()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!hasRole(UserRole.Admin)) {
    return <Navigate to="/chat" replace />
  }

  return <>{children}</>
}

function DashboardPage() {
  const [stats, setStats] = useState({
    knowledgeBaseCount: 0,
    documentCount: 0,
    userCount: 0,
  })

  useEffect(() => {
    ApiService.dashboard.getStats().then((res) => {
      setStats(res.data)
    }).catch((err) => {
      console.error('Failed to get stats:', err)
    })
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-education-blue-900">学习中心</h2>
        <p className="text-muted-foreground">欢迎使用智能课程学习助手，轻松获取学习资源和知识问答</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-education-blue-100 bg-education-blue-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-education-blue-800">课程资源库</CardTitle>
            <BookOpen className="h-4 w-4 text-education-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-education-blue-900">{stats.knowledgeBaseCount}</div>
            <p className="text-xs text-education-blue-600">个知识库</p>
          </CardContent>
        </Card>
        <Card className="border-education-green-100 bg-education-green-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-education-green-800">学习文档</CardTitle>
            <FileText className="h-4 w-4 text-education-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-education-green-900">{stats.documentCount}</div>
            <p className="text-xs text-education-green-600">篇文档</p>
          </CardContent>
        </Card>
        <Card className="border-education-orange-100 bg-education-orange-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-education-orange-800">学习用户</CardTitle>
            <Users className="h-4 w-4 text-education-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-education-orange-900">{stats.userCount}</div>
            <p className="text-xs text-education-orange-600">位学习者</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthenticationProvider>
      <BrowserRouter>
        <Helmet>
          <title>智能课程助手</title>
        </Helmet>
        <Routes>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <AdminRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </AdminRoute>
            }
          />
          <Route
            path="/knowledge-bases"
            element={
              <AdminRoute>
                <Layout>
                  <KnowledgeBasePage />
                </Layout>
              </AdminRoute>
            }
          />
          <Route
            path="/knowledge-bases/:kbId/documents"
            element={
              <AdminRoute>
                <Layout>
                  <DocumentPage />
                </Layout>
              </AdminRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <AdminRoute>
                <Layout>
                  <DocumentsPage />
                </Layout>
              </AdminRoute>
            }
          />
          <Route
            path="/users"
            element={
              <AdminRoute>
                <Layout>
                  <UserPage />
                </Layout>
              </AdminRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <AdminRoute>
                <Layout>
                  <SystemSettingsPage />
                </Layout>
              </AdminRoute>
            }
          />
          <Route path="*" element={<Navigate to="/chat" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthenticationProvider>
  )
}
