import { useState, useEffect } from 'react'
import { useUserStore } from '@/stores/user'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { User } from '@/types'
import { UserRole } from '@/types'

interface UserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: User | null
}

export function UserDialog({ open, onOpenChange, user }: UserDialogProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole | ''>(UserRole.User)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const createUser = useUserStore((s) => s.createUser)
  const updateUser = useUserStore((s) => s.updateUser)

  useEffect(() => {
    if (open && user) {
      setUsername(user.username || '')
      setRole(user.role || UserRole.User)
      setPassword('')
    } else if (open) {
      setUsername('')
      setPassword('')
      setRole(UserRole.User)
    }
  }, [open, user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (user) {
        await updateUser(user.id, { username, role: role as UserRole, password: password || undefined })
      } else {
        await createUser({ username, password, role: role as UserRole })
      }
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{user ? '编辑用户' : '创建用户'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium">
              用户名
            </Label>
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="请输入用户名"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              密码 {user && '(留空则不修改)'}
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={user ? '留空则不修改' : '请输入密码'}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">角色</Label>
            <RadioGroup value={role} onValueChange={(v) => setRole(v as UserRole | '')} className="mt-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={UserRole.User} id="user" />
                <Label htmlFor="user">普通用户</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value={UserRole.Admin} id="admin" />
                <Label htmlFor="admin">管理员</Label>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '提交中...' : user ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
