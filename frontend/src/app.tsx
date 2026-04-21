import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthenticationProvider } from '@/hooks/useAuthentication'
import KnowledgeBasePage from '@/pages/KnowledgeBasePage'
import UserPage from '@/pages/UserPage'
import SystemSettingsPage from '@/pages/SystemSettingsPage'
import DocumentPage from '@/pages/DocumentPage'
import DocumentsPage from '@/pages/DocumentsPage'
import ChatPage from '@/pages/ChatPage'
import LoginPage from '@/pages/LoginPage'
import { Layout } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, FileText, Users } from 'lucide-react'
import { ApiService } from '@/services/api'
import { Helmet } from 'react-helmet-async'

export default function App() {
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
    <AuthenticationProvider>
      <BrowserRouter>
        <Helmet>
          <title>智能课程助手管理后台</title>
        </Helmet>
        <Routes>
          <Route
            path="/"
            element={
              <Layout>
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
              </Layout>
            }
          />
          <Route
            path="/knowledge-bases"
            element={
              <Layout>
                <KnowledgeBasePage />
              </Layout>
            }
          />
          <Route
            path="/knowledge-bases/:kbId/documents"
            element={
              <Layout>
                <DocumentPage />
              </Layout>
            }
          />
          <Route
            path="/documents"
            element={
              <Layout>
                <DocumentsPage />
              </Layout>
            }
          />
          <Route
            path="/users"
            element={
              <Layout>
                <UserPage />
              </Layout>
            }
          />
          <Route
            path="/settings"
            element={
              <Layout>
                <SystemSettingsPage />
              </Layout>
            }
          />
          <Route
            path="/chat"
            element={<ChatPage />}
          />
          <Route
            path="/login"
            element={<LoginPage />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthenticationProvider>
  )
}
