import { useState } from 'react'
import { ApiService } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'

interface ChangePasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangePasswordDialog({ open, onOpenChange }: ChangePasswordDialogProps) {
  const [mode, setMode] = useState<'oldPassword' | 'emailCode'>('oldPassword')
  const [oldPassword, setOldPassword] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const handleSendCode = async () => {
    setError('')
    try {
      const res = await ApiService.auth.sendChangePasswordCode()
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

    if (!newPassword) {
      setError('请输入新密码')
      return
    }
    if (newPassword.length < 6) {
      setError('密码长度不能少于6位')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (mode === 'oldPassword' && !oldPassword) {
      setError('请输入旧密码')
      return
    }
    if (mode === 'emailCode' && !code) {
      setError('请输入验证码')
      return
    }

    setIsLoading(true)

    try {
      await ApiService.auth.changePassword({
        oldPassword: mode === 'oldPassword' ? oldPassword : undefined,
        code: mode === 'emailCode' ? code : undefined,
        newPassword,
      })
      setSuccess('密码修改成功')
      setTimeout(() => {
        onOpenChange(false)
        resetForm()
      }, 1500)
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '修改密码失败'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setMode('oldPassword')
    setOldPassword('')
    setCode('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess('')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>修改密码</DialogTitle>
          <DialogDescription>选择验证方式后修改密码</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-600">
              {success}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'oldPassword' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('oldPassword')}
            >
              旧密码验证
            </Button>
            <Button
              type="button"
              variant={mode === 'emailCode' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('emailCode')}
            >
              邮箱验证码
            </Button>
          </div>

          {mode === 'oldPassword' ? (
            <div className="space-y-2">
              <Label>旧密码</Label>
              <Input
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="请输入当前密码"
                disabled={isLoading}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label>邮箱验证码</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="请输入验证码"
                  disabled={isLoading}
                  maxLength={6}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendCode}
                  disabled={countdown > 0 || isLoading}
                  className="shrink-0 whitespace-nowrap"
                >
                  {countdown > 0 ? `${countdown}s` : '获取验证码'}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>新密码</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="请输入新密码（至少6位）"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label>确认新密码</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="请再次输入新密码"
              disabled={isLoading}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  修改中...
                </>
              ) : (
                '确认修改'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
