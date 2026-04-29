import { useState, useEffect } from 'react'
import { useAuthentication } from '@/hooks/useAuthentication'
import { useUserStore } from '@/stores/user'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import {
  MoreHorizontal,
  Edit,
  Trash2,
  User,
  Plus,
  Search,
  RefreshCw,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { UserDialog } from '@/features/user/UserDialog'
import { useResizableColumns } from '@/hooks/useResizableColumns'

export default function UserPage() {
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [pageNum, setPageNum] = useState(1)
  const [pageSize, setPageLength] = useState(10)

  const { users, isLoading, deleteUser, total, fetchUsers } = useUserStore()
  const { user: currentUser } = useAuthentication()
  const tableColumns = useResizableColumns([
    { key: 'username', width: 320, minWidth: 200, maxWidth: 560 },
    { key: 'role', width: 150, minWidth: 110, maxWidth: 220 },
    { key: 'createdAt', width: 170, minWidth: 130, maxWidth: 240 },
    { key: 'actions', width: 88, minWidth: 76, maxWidth: 120 },
  ])

  useEffect(() => {
    fetchUsers(pageNum, pageSize).catch(console.error)
  }, [pageNum, pageSize, fetchUsers])

  const filteredUsers = users.filter((u) =>
    u.username?.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm('确定要删除这个用户吗？')) {
      await deleteUser(id)
      await fetchUsers(pageNum, pageSize)
    }
  }

  const handleEdit = (user: any) => {
    setEditingUser(user)
    setIsDialogOpen(true)
  }

  const handleDialogOpenChange = async (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setEditingUser(null)
      await fetchUsers(pageNum, pageSize)
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  const handlePageChange = (page: number) => {
    setPageNum(page)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-education-blue-900">用户管理</h2>
          <p className="text-sm text-education-blue-600">管理系统用户和权限</p>
        </div>
        <Button onClick={() => {
          setEditingUser(null)
          setIsDialogOpen(true)
        }} className="bg-gradient-to-r from-education-blue-600 to-education-blue-500 hover:from-education-blue-700 hover:to-education-blue-600">
          <Plus className="w-4 h-4 mr-2" />
          添加用户
        </Button>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-education-blue-400" />
              <Input
                placeholder="搜索用户..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            <span className="text-sm text-education-blue-500">
              共 {filteredUsers.length} 个用户
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-education-blue-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <Table className="table-fixed" style={tableColumns.getTableStyle()}>
              <TableHeader className="bg-education-blue-50">
                <TableRow>
                  <TableHead className="relative group text-education-blue-800" style={tableColumns.getColumnStyle('username')}>用户名<span {...tableColumns.getResizeHandleProps('username')} /></TableHead>
                  <TableHead className="relative group text-education-blue-800" style={tableColumns.getColumnStyle('role')}>角色<span {...tableColumns.getResizeHandleProps('role')} /></TableHead>
                  <TableHead className="relative group text-education-blue-800" style={tableColumns.getColumnStyle('createdAt')}>创建时间<span {...tableColumns.getResizeHandleProps('createdAt')} /></TableHead>
                  <TableHead className="relative group text-right text-education-blue-800" style={tableColumns.getColumnStyle('actions')}>操作<span {...tableColumns.getResizeHandleProps('actions')} /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
                        <span className="text-sm text-slate-500">加载中...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                        <User className="h-8 w-8 text-slate-300" />
                        <span className="text-sm">暂无用户</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="h-16 hover:bg-slate-50 transition-colors">
                      <TableCell className="py-2" style={tableColumns.getColumnStyle('username')}>
                        <div className="flex min-w-0 items-center gap-3 font-medium">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-medium">
                            {user.username?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <span className="truncate text-slate-900" title={user.username}>{user.username}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2" style={tableColumns.getColumnStyle('role')}>
                        <Badge
                          variant={user.role === 'admin' ? 'default' : 'secondary'}
                          className={user.role === 'admin' ? 'bg-education-blue-600 hover:bg-education-blue-700' : ''}
                        >
                          {user.role === 'admin' ? '管理员' : '普通用户'}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 text-sm text-slate-500" style={tableColumns.getColumnStyle('createdAt')}>
                        <span className="block truncate">{formatDate(user.createdAt)}</span>
                      </TableCell>
                      <TableCell className="py-2 text-right" style={tableColumns.getColumnStyle('actions')}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="iconSm" className="h-8 w-8">
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
                              onClick={() => handleEdit(user)}
                              className="cursor-pointer rounded-lg px-3 py-2 text-slate-700 focus:bg-education-blue-50 focus:text-education-blue-700"
                            >
                              <Edit className="mr-2 h-4 w-4 text-slate-500" />
                              编辑信息
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-education-blue-50" />
                            <DropdownMenuItem
                              onClick={(e) => handleDelete(user.id, e as any)}
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

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200 p-4">
              <div className="text-sm text-slate-500">
                第 {pageNum} / {totalPages} 页
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pageNum - 1)}
                  disabled={pageNum === 1 || isLoading}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pageNum + 1)}
                  disabled={pageNum === totalPages || isLoading}
                >
                  下一页
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <UserDialog
        open={isDialogOpen}
        onOpenChange={handleDialogOpenChange}
        user={editingUser}
      />
    </div>
  )
}
