import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import { ApiService } from '@/services/api'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { KeyRound, Mail, Save, Loader2 } from 'lucide-react'

export function UserSettings() {
  const { user } = useAuthStore()

  // ---- 修改密码 ----
  const [pwMode, setPwMode] = useState<'oldPassword' | 'emailCode'>('oldPassword')
  const [oldPassword, setOldPassword] = useState('')
  const [pwCode, setPwCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState('')
  const [isSavingPw, setIsSavingPw] = useState(false)
  const [pwCountdown, setPwCountdown] = useState(0)

  // ---- 更换邮箱 ----
  const [newEmail, setNewEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailError, setEmailError] = useState('')
  const [emailSuccess, setEmailSuccess] = useState('')
  const [isSavingEmail, setIsSavingEmail] = useState(false)
  const [emailCountdown, setEmailCountdown] = useState(0)

  const [currentEmail, setCurrentEmail] = useState('')

  useEffect(() => {
    ApiService.auth.currentUser().then((res) => {
      const data = res.data as any
      setCurrentEmail(data?.email || '')
    }).catch(() => {})
  }, [])

  const startCountdown = (setter: React.Dispatch<React.SetStateAction<number>>) => {
    setter(60)
    const timer = setInterval(() => {
      setter((prev: number) => {
        if (prev <= 1) { clearInterval(timer); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  // ---- 修改密码操作 ----
  const handleSendPwCode = async () => {
    setPwError('')
    try {
      await ApiService.auth.sendChangePasswordCode()
      startCountdown(setPwCountdown)
    } catch (err: any) {
      setPwError(err?.response?.data?.message || err?.message || '发送验证码失败')
    }
  }

  const handleSavePassword = async () => {
    setPwError('')
    setPwSuccess('')

    if (!newPassword) { setPwError('请输入新密码'); return }
    if (newPassword.length < 6) { setPwError('密码长度不能少于6位'); return }
    if (newPassword !== confirmPassword) { setPwError('两次输入的密码不一致'); return }

    if (pwMode === 'oldPassword' && !oldPassword) { setPwError('请输入旧密码'); return }
    if (pwMode === 'emailCode' && !pwCode) { setPwError('请输入验证码'); return }

    setIsSavingPw(true)
    try {
      await ApiService.auth.changePassword({
        oldPassword: pwMode === 'oldPassword' ? oldPassword : undefined,
        code: pwMode === 'emailCode' ? pwCode : undefined,
        newPassword,
      })
      setPwSuccess('密码修改成功')
      setOldPassword('')
      setPwCode('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setPwError(err?.response?.data?.message || err?.message || '修改密码失败')
    } finally {
      setIsSavingPw(false)
    }
  }

  // ---- 更换邮箱操作 ----
  const handleSendEmailCode = async () => {
    setEmailError('')
    if (!newEmail) { setEmailError('请输入新邮箱地址'); return }
    try {
      await ApiService.auth.sendVerifyCode({ email: newEmail, type: 'change_email' })
      startCountdown(setEmailCountdown)
    } catch (err: any) {
      setEmailError(err?.response?.data?.message || err?.message || '发送验证码失败')
    }
  }

  const handleSaveEmail = async () => {
    setEmailError('')
    setEmailSuccess('')

    if (!newEmail) { setEmailError('请输入新邮箱地址'); return }
    if (!emailCode) { setEmailError('请输入验证码'); return }

    setIsSavingEmail(true)
    try {
      await ApiService.auth.changeEmail({ newEmail, code: emailCode })
      setEmailSuccess('邮箱更换成功')
      setCurrentEmail(newEmail)
      setNewEmail('')
      setEmailCode('')
    } catch (err: any) {
      setEmailError(err?.response?.data?.message || err?.message || '更换邮箱失败')
    } finally {
      setIsSavingEmail(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-education-blue-900">账号设置</h2>
        <p className="text-sm text-education-blue-600 mt-1">管理您的密码和邮箱</p>
      </div>

      {/* 修改密码 */}
      <Card className="border-0 shadow-lg shadow-education-blue-200/50">
        <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                <KeyRound className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-amber-900">修改密码</CardTitle>
                <CardDescription className="text-amber-600">
                  通过旧密码或邮箱验证码修改密码
                </CardDescription>
              </div>
            </div>
            <Button onClick={handleSavePassword} disabled={isSavingPw}>
              <Save className="h-4 w-4 mr-2" />
              {isSavingPw ? '保存中...' : '保存'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {pwError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">{pwError}</div>
          )}
          {pwSuccess && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-600">{pwSuccess}</div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant={pwMode === 'oldPassword' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPwMode('oldPassword')}
            >
              旧密码验证
            </Button>
            <Button
              type="button"
              variant={pwMode === 'emailCode' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPwMode('emailCode')}
            >
              邮箱验证码
            </Button>
          </div>

          {pwMode === 'oldPassword' ? (
            <div className="space-y-2">
              <Label>旧密码</Label>
              <Input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="请输入当前密码"
                disabled={isSavingPw}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>邮箱验证码</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={pwCode}
                  onChange={(e) => setPwCode(e.target.value)}
                  placeholder="请输入验证码"
                  disabled={isSavingPw}
                  maxLength={6}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendPwCode}
                  disabled={pwCountdown > 0 || isSavingPw}
                  className="shrink-0 whitespace-nowrap"
                >
                  {pwCountdown > 0 ? `${pwCountdown}s` : '获取验证码'}
                </Button>
              </div>
              {currentEmail && (
                <p className="text-xs text-muted-foreground">验证码将发送至 {currentEmail}</p>
              )}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>新密码</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码（至少6位）"
                disabled={isSavingPw}
              />
            </div>
            <div className="space-y-2">
              <Label>确认新密码</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="请再次输入新密码"
                disabled={isSavingPw}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 更换邮箱 */}
      <Card className="border-0 shadow-lg shadow-education-blue-200/50">
        <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
                <Mail className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-emerald-900">更换邮箱</CardTitle>
                <CardDescription className="text-emerald-600">
                  更换绑定邮箱后，将通过新邮箱接收验证码
                </CardDescription>
              </div>
            </div>
            <Button onClick={handleSaveEmail} disabled={isSavingEmail}>
              <Save className="h-4 w-4 mr-2" />
              {isSavingEmail ? '保存中...' : '保存'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          {emailError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">{emailError}</div>
          )}
          {emailSuccess && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-600">{emailSuccess}</div>
          )}

          <div className="space-y-2">
            <Label>当前邮箱</Label>
            <Input
              value={currentEmail || '未绑定邮箱'}
              disabled
              className="bg-slate-50"
            />
          </div>

          <div className="space-y-2">
            <Label>新邮箱</Label>
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="请输入新邮箱地址"
              disabled={isSavingEmail}
            />
          </div>

          <div className="space-y-2">
            <Label>验证码</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value)}
                placeholder="请输入新邮箱收到的验证码"
                disabled={isSavingEmail}
                maxLength={6}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSendEmailCode}
                disabled={emailCountdown > 0 || isSavingEmail || !newEmail}
                className="shrink-0 whitespace-nowrap"
              >
                {emailCountdown > 0 ? `${emailCountdown}s` : '获取验证码'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">验证码将发送至您填写的新邮箱</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
