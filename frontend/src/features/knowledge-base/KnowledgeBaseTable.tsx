import { useState, useEffect } from 'react'
import { useAuthentication } from '@/hooks/useAuthentication'
import { useKnowledgeBaseStore } from '@/stores/knowledgeBase'
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
  FileText,
  Search,
  RefreshCw,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { formatDate } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { useResizableColumns } from '@/hooks/useResizableColumns'
import { KnowledgeBase, UserRole } from '@/types'

interface KnowledgeBaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void | Promise<void>
  kb?: KnowledgeBase | null
}

function KnowledgeBaseDialog({ open, onOpenChange, kb }: KnowledgeBaseDialogProps) {
  const { user } = useAuthentication()
  const [name, setName] = useState('')
  const [embeddingModel, setEmbeddingModel] = useState('text-embedding-ada-002')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const createKnowledgeBase = useKnowledgeBaseStore((s) => s.createKnowledgeBase)
  const updateKnowledgeBase = useKnowledgeBaseStore((s) => s.updateKnowledgeBase)

  useEffect(() => {
    if (open && kb) {
      setName(kb.name || '')
      setEmbeddingModel(kb.embeddingModel || 'text-embedding-ada-002')
    } else if (open) {
      setName('')
      setEmbeddingModel('text-embedding-ada-002')
    }
  }, [open, kb])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (kb) {
        await updateKnowledgeBase(kb.id, { name })
      } else {
        // 使用当前登录用户的用户名作为创建人
        const createdBy = user?.username || 'system'
        await createKnowledgeBase({ name, embeddingModel, createdBy })
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{kb ? '编辑课程资源库' : '创建课程资源库'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              课程资源库名称
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="请输入知识库名称"
            />
          </div>
          {!kb && (
            <div className="space-y-2">
              <Label htmlFor="model" className="text-sm font-medium">
                Embedding 模型
              </Label>
              <Input
                id="model"
                value={embeddingModel}
                onChange={(e) => setEmbeddingModel(e.target.value)}
                required
                placeholder="text-embedding-ada-002"
              />
            </div>
          )}
          {!kb && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                创建人
              </Label>
              <div className="rounded-md bg-education-blue-50 px-3 py-2 text-sm text-education-blue-900 border border-education-blue-200">
                {user?.username || 'system'}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? '提交中...' : kb ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function KnowledgeBaseTable() {
  const [search, setSearch] = useState('')
  const [editingKb, setEditingKb] = useState<KnowledgeBase | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [pageNum, setPageNum] = useState(1)
  const [pageSize, setPageLength] = useState(10)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingKb, setDeletingKb] = useState<KnowledgeBase | null>(null)

  const { knowledgeBases, isLoading, total, deleteKnowledgeBase, fetchKnowledgeBases } = useKnowledgeBaseStore()
  const { user, hasRole } = useAuthentication()

  const navigate = useNavigate()
  const tableColumns = useResizableColumns([
    { key: 'index', width: 64, minWidth: 56, maxWidth: 90 },
    { key: 'name', width: 320, minWidth: 220, maxWidth: 560 },
    { key: 'documents', width: 120, minWidth: 100, maxWidth: 180 },
    { key: 'createdBy', width: 160, minWidth: 120, maxWidth: 280 },
    { key: 'createdAt', width: 160, minWidth: 130, maxWidth: 240 },
    { key: 'actions', width: 88, minWidth: 76, maxWidth: 120 },
  ])

  useEffect(() => {
    fetchKnowledgeBases(pageNum, pageSize)
  }, [pageNum, pageSize, fetchKnowledgeBases])

  const handleDelete = async (kb: KnowledgeBase, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingKb(kb)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!deletingKb) return
    await deleteKnowledgeBase(deletingKb.id)
    await fetchKnowledgeBases(pageNum, pageSize)
    setIsDeleteDialogOpen(false)
    setDeletingKb(null)
  }

  const handleEdit = (kb: KnowledgeBase, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingKb(kb)
    setIsDialogOpen(true)
  }

  const handleViewDocuments = (kb: KnowledgeBase) => {
    navigate(`/knowledge-bases/${kb.id}/documents`)
  }

  const handleDialogOpenChange = async (open: boolean) => {
    setIsDialogOpen(open)
    if (!open) {
      setEditingKb(null)
      await fetchKnowledgeBases(pageNum, pageSize)
    }
  }

  const handlePageChange = (page: number) => {
    setPageNum(page)
  }

  const totalPages = Math.ceil(total / pageSize)

  // 检查用户是否有权限编辑/删除知识库
  const canWriteKnowledgeBase = (kb: KnowledgeBase): boolean => {
    // admin 可以操作所有知识库
    if (hasRole(UserRole.Admin)) {
      return true
    }
    // teacher 只能操作自己创建的知识库
    if (hasRole(UserRole.Teacher)) {
      return kb.createdBy === user?.username
    }
    // student 不能操作任何知识库
    return false
  }

  return (
    <>
      <div className="space-y-4">
        {/* 搜索栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="搜索知识库..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            <span className="text-sm text-slate-500">
              共 {total} 个知识库
            </span>
          </div>
        </div>

        {/* 知识库列表 */}
        <div className="rounded-xl border border-education-blue-100 bg-white">
          <div className="overflow-x-auto">
            <Table className="table-fixed" style={tableColumns.getTableStyle()}>
              <TableHeader className="bg-education-blue-50">
                <TableRow>
                  <TableHead className="relative group text-education-blue-800" style={tableColumns.getColumnStyle('index')}>#<span {...tableColumns.getResizeHandleProps('index')} /></TableHead>
                  <TableHead className="relative group text-education-blue-800" style={tableColumns.getColumnStyle('name')}>课程资源库名称<span {...tableColumns.getResizeHandleProps('name')} /></TableHead>
                  <TableHead className="relative group text-education-blue-800" style={tableColumns.getColumnStyle('documents')}>文档数量<span {...tableColumns.getResizeHandleProps('documents')} /></TableHead>
                  <TableHead className="relative group text-education-blue-800" style={tableColumns.getColumnStyle('createdBy')}>创建人<span {...tableColumns.getResizeHandleProps('createdBy')} /></TableHead>
                  <TableHead className="relative group text-education-blue-800" style={tableColumns.getColumnStyle('createdAt')}>创建时间<span {...tableColumns.getResizeHandleProps('createdAt')} /></TableHead>
                  <TableHead className="relative group text-right text-education-blue-800" style={tableColumns.getColumnStyle('actions')}>操作<span {...tableColumns.getResizeHandleProps('actions')} /></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
                        <span className="text-sm text-slate-500">加载中...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : total === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                        <FileText className="h-8 w-8 text-slate-300" />
                        <span className="text-sm">暂无知识库</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  knowledgeBases.map((kb: any, index: number) => (
                    <TableRow
                      key={kb.id}
                      className="h-16 cursor-pointer transition-colors hover:bg-slate-50"
                      onClick={() => handleViewDocuments(kb)}
                    >
                      <TableCell className="py-2 font-medium text-slate-500" style={tableColumns.getColumnStyle('index')}>{(pageNum - 1) * pageSize + index + 1}</TableCell>
                      <TableCell className="py-2" style={tableColumns.getColumnStyle('name')}>
                        <div className="flex min-w-0 items-center gap-3 font-medium">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                            <FileText className="h-4 w-4 text-slate-600" />
                          </div>
                          <span className="truncate text-slate-900" title={kb.name}>{kb.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2" style={tableColumns.getColumnStyle('documents')}>
                        <Badge variant="secondary" className="text-xs">
                          {kb.documentCount ?? 0} 个文档
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2" style={tableColumns.getColumnStyle('createdBy')}>
                        <div className="flex min-w-0 items-center gap-2">
                          <div className="h-6 w-6 shrink-0 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-medium">
                            {kb.createdBy?.[0]?.toUpperCase() || 'A'}
                          </div>
                          <span className="truncate text-sm text-slate-600" title={kb.createdBy}>{kb.createdBy}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2 text-sm text-slate-500" style={tableColumns.getColumnStyle('createdAt')}>
                        <span className="block truncate">{formatDate(kb.createdAt)}</span>
                      </TableCell>
                      <TableCell className="py-2 text-right" style={tableColumns.getColumnStyle('actions')}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="iconSm" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl border-education-blue-100 bg-white p-2 shadow-xl">
                            <div className="px-2 pb-2 pt-1">
                              <p className="truncate text-xs font-medium text-slate-500">知识库操作</p>
                              <p className="truncate text-sm font-semibold text-slate-900">{kb.name}</p>
                            </div>
                            {canWriteKnowledgeBase(kb) && (
                              <>
                                <DropdownMenuSeparator className="bg-education-blue-50" />
                                <DropdownMenuItem
                                  onClick={(e) => handleEdit(kb, e as any)}
                                  className="cursor-pointer rounded-lg px-3 py-2 text-slate-700 focus:bg-education-blue-50 focus:text-education-blue-700"
                                >
                                  <Edit className="mr-2 h-4 w-4 text-slate-500" />
                                  编辑信息
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-education-blue-50" />
                                <DropdownMenuItem
                                  onClick={(e) => handleDelete(kb, e as any)}
                                  className="cursor-pointer rounded-lg px-3 py-2 text-red-600 focus:bg-red-50 focus:text-red-700"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  删除知识库
                                </DropdownMenuItem>
                              </>
                            )}
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

      <KnowledgeBaseDialog
        open={isDialogOpen}
        onOpenChange={handleDialogOpenChange}
        kb={editingKb}
      />

      {/* 删除确认对话框 */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">确认删除知识库</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 mb-4">
              <p className="text-sm font-medium text-red-800 mb-2">
                ⚠️ 警告：此操作不可撤销
              </p>
              <p className="text-sm text-red-700">
                您正在删除知识库 <strong className="font-semibold">「{deletingKb?.name}」</strong>
              </p>
            </div>
            <div className="space-y-2 text-sm text-slate-700">
              <p>此操作将同步删除以下内容：</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>该知识库下的 <strong className="font-semibold">{deletingKb?.documentCount ?? 0} 个文档</strong></li>
                <li>所有相关的向量数据</li>
                <li>所有相关的文件存储</li>
              </ul>
              <p className="mt-3 font-medium text-slate-800">
                是否确认执行此删除操作？
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setDeletingKb(null)
              }}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
