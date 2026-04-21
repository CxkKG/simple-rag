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

export default function UserPage() {
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [pageNum, setPageNum] = useState(1)
  const [pageSize, setPageLength] = useState(10)

  const { users, isLoading, deleteUser, total, fetchUsers } = useUserStore()
  const { user: currentUser } = useAuthentication()

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
        <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-to-r from-education-blue-600 to-education-blue-500 hover:from-education-blue-700 hover:to-education-blue-600">
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
            <Table>
              <TableHeader className="bg-education-blue-50">
                <TableRow>
                  <TableHead className="text-education-blue-800">用户名</TableHead>
                  <TableHead className="text-education-blue-800">角色</TableHead>
                  <TableHead className="text-education-blue-800">创建时间</TableHead>
                  <TableHead className="text-right text-education-blue-800">操作</TableHead>
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
                    <TableRow key={user.id} className="hover:bg-slate-50 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3 font-medium">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-medium">
                            {user.username?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <span className="text-slate-900">{user.username}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={user.role === 'admin' ? 'default' : 'secondary'}
                          className={user.role === 'admin' ? 'bg-education-blue-600 hover:bg-education-blue-700' : ''}
                        >
                          {user.role === 'admin' ? '管理员' : '普通用户'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="iconSm" className="h-8 w-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32">
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuContent sideOffset={4} className="w-32">
                              <DropdownMenuItem
                                onSelect={(e) => handleDelete(user.id, e as any)}
                                disabled={user.id === currentUser?.id}
                                className={user.id === currentUser?.id ? 'opacity-50 cursor-not-allowed' : 'text-red-600 focus:text-red-600'}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
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
        onOpenChange={setIsDialogOpen}
        user={null}
      />
    </div>
  )
}
