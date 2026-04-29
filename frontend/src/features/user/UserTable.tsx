import { useState } from 'react'
import { useAuthentication } from '@/hooks/useAuthentication'
import { useUserStore } from '@/stores/user'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Edit, Trash2, User as UserIcon } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { UserDialog } from './UserDialog'
import type { User, UserRole } from '@/types'
import { Input } from '@/components/ui/input'
import { useResizableColumns } from '@/hooks/useResizableColumns'

export function UserTable() {
  const [search, setSearch] = useState('')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { users, isLoading, deleteUser } = useUserStore()
  const { user: currentUser } = useAuthentication()
  const tableColumns = useResizableColumns([
    { key: 'username', width: 300, minWidth: 200, maxWidth: 560 },
    { key: 'role', width: 140, minWidth: 110, maxWidth: 220 },
    { key: 'createdAt', width: 170, minWidth: 130, maxWidth: 240 },
    { key: 'actions', width: 88, minWidth: 76, maxWidth: 120 },
  ])

  const filteredUsers = users.filter((u) =>
    u.username?.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm('确定要删除这个用户吗？')) {
      await deleteUser(id)
    }
  }

  const handleEdit = (user: User, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingUser(user)
    setIsDialogOpen(true)
  }

  const getRoleDisplay = (role: UserRole) => {
    return role === 'admin' ? '管理员' : '普通用户'
  }

  const getRoleVariant = (role: UserRole) => {
    return role === 'admin' ? 'default' : 'secondary'
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Input
              placeholder="搜索用户..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              共 {filteredUsers.length} 个用户
            </span>
          </div>
        </div>

        <div className="card">
          <div className="overflow-x-auto">
            <Table className="table-fixed" style={tableColumns.getTableStyle()}>
              <TableHeader>
                <TableRow>
                  <TableHead className="relative group" style={tableColumns.getColumnStyle('username')}>用户名<span {...tableColumns.getResizeHandleProps('username')} /></TableHead>
                  <TableHead className="relative group" style={tableColumns.getColumnStyle('role')}>角色<span {...tableColumns.getResizeHandleProps('role')} /></TableHead>
                  <TableHead className="relative group" style={tableColumns.getColumnStyle('createdAt')}>创建时间<span {...tableColumns.getResizeHandleProps('createdAt')} /></TableHead>
                  <TableHead className="relative group text-right" style={tableColumns.getColumnStyle('actions')}>操作<span {...tableColumns.getResizeHandleProps('actions')} /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      加载中...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      暂无用户
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow
                      key={user.id}
                      className="h-16 cursor-pointer"
                    >
                      <TableCell className="py-2" style={tableColumns.getColumnStyle('username')}>
                        <div className="flex min-w-0 items-center gap-2 font-medium">
                          <UserIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="truncate" title={user.username}>{user.username}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2" style={tableColumns.getColumnStyle('role')}>
                        <Badge
                          variant={getRoleVariant(user.role)}
                        >
                          {getRoleDisplay(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2" style={tableColumns.getColumnStyle('createdAt')}>
                        <span className="block truncate">{formatDate(user.createdAt)}</span>
                      </TableCell>
                      <TableCell className="py-2 text-right" style={tableColumns.getColumnStyle('actions')}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl border-education-blue-100 bg-white p-2 shadow-xl">
                            <div className="px-2 pb-2 pt-1">
                              <p className="truncate text-xs font-medium text-slate-500">用户操作</p>
                              <p className="truncate text-sm font-semibold text-slate-900">{user.username}</p>
                            </div>
                            <DropdownMenuSeparator className="bg-education-blue-50" />
                            <DropdownMenuItem
                              onClick={(e) => handleEdit(user, e)}
                              className="cursor-pointer rounded-lg px-3 py-2 text-slate-700 focus:bg-education-blue-50 focus:text-education-blue-700"
                            >
                              <Edit className="mr-2 h-4 w-4 text-slate-500" />
                              编辑信息
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-education-blue-50" />
                            <DropdownMenuItem
                              onClick={(e) => handleDelete(user.id, e)}
                              disabled={user.id === currentUser?.id}
                              className={user.id === currentUser?.id ? 'cursor-not-allowed rounded-lg px-3 py-2 opacity-50' : 'cursor-pointer rounded-lg px-3 py-2 text-red-600 focus:bg-red-50 focus:text-red-700'}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              删除用户
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <UserDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        user={editingUser}
      />
    </>
  )
}
