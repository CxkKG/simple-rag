import { useState, useEffect } from 'react'
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
import type { KnowledgeBase } from '@/types'

interface KnowledgeBaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kb?: KnowledgeBase | null
}

function KnowledgeBaseDialog({ open, onOpenChange, kb }: KnowledgeBaseDialogProps) {
  const [name, setName] = useState('')
  const [embeddingModel, setEmbeddingModel] = useState('text-embedding-ada-002')
  const [createdBy, setCreatedBy] = useState('admin')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const createKnowledgeBase = useKnowledgeBaseStore((s) => s.createKnowledgeBase)
  const updateKnowledgeBase = useKnowledgeBaseStore((s) => s.updateKnowledgeBase)

  useEffect(() => {
    if (open && kb) {
      setName(kb.name || '')
      setEmbeddingModel(kb.embeddingModel || 'text-embedding-ada-002')
      setCreatedBy(kb.createdBy || 'admin')
    } else if (open) {
      setName('')
      setEmbeddingModel('text-embedding-ada-002')
      setCreatedBy('admin')
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
          <div className="space-y-2">
            <Label htmlFor="createdBy" className="text-sm font-medium">
              创建人
            </Label>
            <Input
              id="createdBy"
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              required
              placeholder="admin"
            />
          </div>
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

  const { knowledgeBases, isLoading, total, deleteKnowledgeBase, fetchKnowledgeBases } = useKnowledgeBaseStore()

  const navigate = useNavigate()

  useEffect(() => {
    fetchKnowledgeBases(pageNum, pageSize)
  }, [pageNum, pageSize, fetchKnowledgeBases])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm('确定要删除这个知识库吗？')) {
      await deleteKnowledgeBase(id)
    }
  }

  const handleEdit = (kb: KnowledgeBase, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingKb(kb)
    setIsDialogOpen(true)
  }

  const handleViewDocuments = (kb: KnowledgeBase) => {
    navigate(`/knowledge-bases/${kb.id}/documents`)
  }

  const handlePageChange = (page: number) => {
    setPageNum(page)
  }

  const totalPages = Math.ceil(total / pageSize)

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
            <Table>
              <TableHeader className="bg-education-blue-50">
                <TableRow>
                  <TableHead className="w-12 text-education-blue-800">#</TableHead>
                  <TableHead className="text-education-blue-800">课程资源库名称</TableHead>
                  <TableHead className="text-education-blue-800">Embedding 模型</TableHead>
                  <TableHead className="text-education-blue-800">Collection 名称</TableHead>
                  <TableHead className="text-education-blue-800">创建人</TableHead>
                  <TableHead className="text-education-blue-800">创建时间</TableHead>
                  <TableHead className="text-right text-education-blue-800">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
                        <span className="text-sm text-slate-500">加载中...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : total === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
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
                      className="cursor-pointer transition-colors hover:bg-slate-50"
                      onClick={() => handleViewDocuments(kb)}
                    >
                      <TableCell className="font-medium text-slate-500">{(pageNum - 1) * pageSize + index + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3 font-medium">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                            <FileText className="h-4 w-4 text-slate-600" />
                          </div>
                          <span className="text-slate-900">{kb.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {kb.embeddingModel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-slate-100 px-2 py-1 text-xs font-mono text-slate-600">
                          {kb.collectionName}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-medium">
                            {kb.createdBy?.[0]?.toUpperCase() || 'A'}
                          </div>
                          <span className="text-sm text-slate-600">{kb.createdBy}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-slate-500">
                        {formatDate(kb.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="iconSm" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32">
                            <DropdownMenuItem onClick={(e) => handleEdit(kb, e as any)}>
                              <Edit className="mr-2 h-4 w-4" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleDelete(kb.id, e as any)} className="text-red-600 focus:text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              删除
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

      <KnowledgeBaseDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        kb={editingKb}
      />
    </>
  )
}
