import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ApiService } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { BookOpen, Loader2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const navigate = useNavigate()
  const lookupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 邮箱输入时自动查询用户名
  useEffect(() => {
    if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current)
    if (!email || !email.includes('@')) {
      setUsername('')
      return
    }
    lookupTimerRef.current = setTimeout(async () => {
      try {
        const res = await ApiService.auth.lookupUsername(email.trim())
        if (res.data) {
          setUsername(res.data)
        } else {
          setUsername('')
        }
      } catch {
        setUsername('')
      }
    }, 600)
    return () => { if (lookupTimerRef.current) clearTimeout(lookupTimerRef.current) }
  }, [email])

  const handleSendCode = async () => {
    if (!email) {
      setError('请输入邮箱地址')
      return
    }
    setError('')

    try {
      await ApiService.auth.sendVerifyCode({ email, type: 'reset_password' })
      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '发送验证码失败'
      setError(msg)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!email || !code || !newPassword) {
      setError('请填写所有必填项')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }
    if (newPassword.length < 6) {
      setError('密码长度不能少于6位')
      return
    }

    setIsLoading(true)

    try {
      await ApiService.auth.resetPassword({ username: username || undefined, email, code, newPassword })
      setSuccess('密码重置成功，即将跳转到登录页')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '重置密码失败'
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
              通过邮箱验证码重置密码
            </p>
          </div>
        </div>

        <Card className="border-0 shadow-xl shadow-education-blue-200/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-semibold text-education-blue-900">
              忘记密码
            </CardTitle>
            <CardDescription className="text-education-blue-600">
              输入注册邮箱，获取验证码后重置密码
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
              {success && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <p className="text-sm text-green-600">{success}</p>
                </div>
              )}
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-sm font-medium text-education-blue-700">
                    邮箱地址
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="请输入注册邮箱"
                      disabled={isLoading}
                      className="h-11 transition-all duration-200 focus-visible:ring-education-blue-500"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleSendCode}
                      disabled={countdown > 0 || isLoading}
                      className="h-11 shrink-0 whitespace-nowrap"
                    >
                      {countdown > 0 ? `${countdown}s` : '获取验证码'}
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="code" className="text-sm font-medium text-education-blue-700">
                    验证码
                  </Label>
                  <Input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    placeholder="请输入邮箱验证码"
                    disabled={isLoading}
                    className="h-11 transition-all duration-200 focus-visible:ring-education-blue-500"
                    maxLength={6}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="username" className="text-sm font-medium text-education-blue-700">
                    用户名（选填）
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="填写后可验证账号与邮箱匹配"
                    disabled={isLoading}
                    className="h-11 transition-all duration-200 focus-visible:ring-education-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="newPassword" className="text-sm font-medium text-education-blue-700">
                    新密码
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="请输入新密码（至少6位）"
                    disabled={isLoading}
                    className="h-11 transition-all duration-200 focus-visible:ring-education-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-education-blue-700">
                    确认新密码
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="请再次输入新密码"
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
                    重置中...
                  </>
                ) : (
                  '重置密码'
                )}
              </Button>
            </form>
            <div className="mt-4 text-center text-sm text-education-blue-500">
              <Link to="/login" className="text-education-blue-700 font-medium hover:text-education-blue-800">
                返回登录
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-education-blue-500">
          <p>&copy; 2026 智能课程学习助手. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}
