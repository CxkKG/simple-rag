import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthenticationProvider, useAuthentication } from '@/hooks/useAuthentication'
import { useReviewReminderNotifier, requestNotificationPermission } from '@/hooks/useReviewReminderNotifier'
import { ReviewReminderPopup } from '@/components/ReviewReminderPopup'
import KnowledgeBasePage from '@/pages/KnowledgeBasePage'
import UserPage from '@/pages/UserPage'
import SystemSettingsPage from '@/pages/SystemSettingsPage'
import UserSettingsPage from '@/pages/UserSettingsPage'
import DocumentPage from '@/pages/DocumentPage'
import DocumentsPage from '@/pages/DocumentsPage'
import ChatPage from '@/pages/ChatPage'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import ForgotPasswordPage from '@/pages/ForgotPasswordPage'
import LearningRecordsPage from '@/pages/LearningRecordsPage'
import ReviewRemindersPage from '@/pages/ReviewRemindersPage'
import { Layout } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, FileText, Users } from 'lucide-react'
import { ApiService } from '@/services/api'
import { Helmet } from 'react-helmet-async'
import { UserRole } from '@/types'

function GlobalReviewReminder() {
  const { isAuthenticated } = useAuthentication()
  const navigate = useNavigate()
  useReviewReminderNotifier({
    enabled: isAuthenticated,
    onNavigate: () => navigate('/review-reminders'),
  })
  useEffect(() => {
    if (isAuthenticated) {
      requestNotificationPermission()
    }
  }, [isAuthenticated])
  return null
}

function GlobalReviewReminderPopup() {
  const { isAuthenticated } = useAuthentication()
  return <ReviewReminderPopup enabled={isAuthenticated} />
}

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

function AdminOrTeacherRoute({ children }: { children: React.ReactNode }) {
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

  if (!hasRole([UserRole.Admin, UserRole.Teacher])) {
    return <Navigate to="/chat" replace />
  }

  return <>{children}</>
}

function DashboardPage() {
  const navigate = useNavigate()
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
        <Card 
          className="border-education-blue-100 bg-education-blue-50/50 cursor-pointer hover:shadow-lg hover:bg-education-blue-50 transition-all duration-200"
          onClick={() => navigate('/knowledge-bases')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-education-blue-800">课程知识库</CardTitle>
            <BookOpen className="h-4 w-4 text-education-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-education-blue-900">{stats.knowledgeBaseCount}</div>
            <p className="text-xs text-education-blue-600">个知识库（点击跳转）</p>
          </CardContent>
        </Card>
        <Card 
          className="border-education-green-100 bg-education-green-50/50 cursor-pointer hover:shadow-lg hover:bg-education-green-50 transition-all duration-200"
          onClick={() => navigate('/documents')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-education-green-800">文档管理</CardTitle>
            <FileText className="h-4 w-4 text-education-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-education-green-900">{stats.documentCount}</div>
            <p className="text-xs text-education-green-600">篇文档（点击跳转）</p>
          </CardContent>
        </Card>
        <Card 
          className="border-education-orange-100 bg-education-orange-50/50 cursor-pointer hover:shadow-lg hover:bg-education-orange-50 transition-all duration-200"
          onClick={() => navigate('/users')}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-education-orange-800">用户管理</CardTitle>
            <Users className="h-4 w-4 text-education-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-education-orange-900">{stats.userCount}</div>
            <p className="text-xs text-education-orange-600">位用户（点击跳转）</p>
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
        <GlobalReviewReminder />
        <GlobalReviewReminderPopup />
        <Helmet>
          <title>智能课程助手</title>
        </Helmet>
        <Routes>
          <Route path="/" element={<Navigate to="/chat" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route
            path="/chat"
            element={
              <ProtectedRoute>
                <ChatPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/learning-records"
            element={
              <ProtectedRoute>
                <LearningRecordsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/review-reminders"
            element={
              <ProtectedRoute>
                <ReviewRemindersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <AdminOrTeacherRoute>
                <Layout>
                  <DashboardPage />
                </Layout>
              </AdminOrTeacherRoute>
            }
          />
          <Route
            path="/knowledge-bases"
            element={
              <AdminOrTeacherRoute>
                <Layout>
                  <KnowledgeBasePage />
                </Layout>
              </AdminOrTeacherRoute>
            }
          />
          <Route
            path="/knowledge-bases/:kbId/documents"
            element={
              <ProtectedRoute>
                <Layout>
                  <DocumentPage />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/documents"
            element={
              <ProtectedRoute>
                <Layout>
                  <DocumentsPage />
                </Layout>
              </ProtectedRoute>
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
            path="/user-settings"
            element={
              <ProtectedRoute>
                <UserSettingsPage />
              </ProtectedRoute>
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
