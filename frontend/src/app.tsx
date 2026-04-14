import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthenticationProvider } from '@/hooks/useAuthentication'
import KnowledgeBasePage from '@/pages/KnowledgeBasePage'
import UserPage from '@/pages/UserPage'
import SystemSettingsPage from '@/pages/SystemSettingsPage'
import DocumentPage from '@/pages/DocumentPage'
import LoginPage from '@/pages/LoginPage'
import { Layout } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, FileText, Users, Layers } from 'lucide-react'

export default function App() {
  return (
    <AuthenticationProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/"
            element={
              <Layout>
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold">概览</h2>
                    <p className="text-muted-foreground">欢迎使用 Simple RAG 管理后台</p>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">知识库总数</CardTitle>
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">待配置</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">文档总数</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">待上传</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">用户数</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">系统用户</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">分块数量</CardTitle>
                        <Layers className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">0</div>
                        <p className="text-xs text-muted-foreground">向量分块</p>
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
            path="/login"
            element={<LoginPage />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthenticationProvider>
  )
}
