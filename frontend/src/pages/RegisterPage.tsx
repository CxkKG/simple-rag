import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { ApiService } from '@/services/api'
import { UserRole } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BookOpen, Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const { login } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (password.length < 6) {
      setError('密码长度不能少于6位')
      return
    }

    setIsLoading(true)

    try {
      const res = await ApiService.auth.register({ username, password })
      const userData = res.data as any
      const user = {
        id: userData.id,
        username: userData.username,
        role: userData.role as UserRole,
        avatar: userData.avatar,
        createdAt: userData.createTime,
        updatedAt: userData.updateTime,
      }
      login(user, userData.token)
      navigate('/chat')
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '注册失败，请稍后重试'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-education-blue-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-education-blue-600 to-education-blue-500 shadow-lg shadow-education-blue-500/30">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-education-blue-900">
              智能课程学习助手
            </h1>
            <p className="mt-2 text-sm text-education-blue-600">
              注册新账号，开始学习之旅
            </p>
          </div>
        </div>

        <Card className="border-0 shadow-xl shadow-education-blue-200/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-semibold text-education-blue-900">
              注册账号
            </CardTitle>
            <CardDescription className="text-education-blue-600">
              创建您的学习账号
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
                  <Label htmlFor="username" className="text-sm font-medium text-education-blue-700">
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
                    className="h-11 transition-all duration-200 focus-visible:ring-education-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="password" className="text-sm font-medium text-education-blue-700">
                    密码
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="请输入密码（至少6位）"
                    disabled={isLoading}
                    className="h-11 transition-all duration-200 focus-visible:ring-education-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-education-blue-700">
                    确认密码
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="请再次输入密码"
                    disabled={isLoading}
                    className="h-11 transition-all duration-200 focus-visible:ring-education-blue-500"
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-education-blue-600 to-education-blue-500 hover:from-education-blue-700 hover:to-education-blue-600 shadow-md"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    注册中...
                  </>
                ) : (
                  '注 册'
                )}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-education-blue-500">
              已有账号？{' '}
              <Link to="/login" className="text-education-blue-700 font-medium hover:text-education-blue-800">
                返回登录
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-education-blue-500">
          <p>&copy; 2024 智能课程学习助手. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
