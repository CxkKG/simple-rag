import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BookOpen, Loader2 } from 'lucide-react'
import { UserRole } from '@/types'

export default function LoginPage() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { login } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // TODO: 调用实际的登录 API
      // const response = await ApiService.auth.login(username, password)
      // login(response.data)

      // 模拟登录成功
      login({
        id: '1',
        username: username,
        role: UserRole.Admin,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      localStorage.setItem('ra_admin_user', JSON.stringify({
        id: '1',
        username: username,
        role: UserRole.Admin,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))
      navigate('/')
    } catch (err) {
      setError('用户名或密码错误')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Logo 区域 */}
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-600 to-emerald-600 shadow-lg shadow-teal-500/30">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Simple RAG
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              智能知识库问答系统
            </p>
          </div>
        </div>

        {/* 登录卡片 */}
        <Card className="border-0 shadow-xl shadow-slate-200/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-semibold text-slate-900">
              欢迎登录
            </CardTitle>
            <CardDescription className="text-slate-500">
              请输入您的账号信息访问系统
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="username" className="text-sm font-medium text-slate-700">
                    用户名
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="请输入用户名"
                    disabled={isLoading}
                    className="h-11 transition-all duration-200 focus-visible:ring-teal-500"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                    密码
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="请输入密码"
                    disabled={isLoading}
                    className="h-11 transition-all duration-200 focus-visible:ring-teal-500"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-md"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登录中...
                  </>
                ) : (
                  '登 录'
                )}
              </Button>
            </form>
            <div className="mt-4 text-center text-xs text-slate-500">
              默认账号: <span className="font-medium text-slate-700">admin</span> / <span className="font-medium text-slate-700">admin</span>
            </div>
          </CardContent>
        </Card>

        {/* 底部信息 */}
        <div className="text-center text-sm text-slate-500">
          <p>© 2024 Simple RAG. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
