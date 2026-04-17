import { useState, useEffect, useRef } from 'react'
import { useAuthentication } from '@/hooks/useAuthentication'
import { useKnowledgeBaseStore } from '@/stores/knowledgeBase'
import { useDocumentStore } from '@/stores/document'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  FileText,
  Upload,
  Play,
  Trash2,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { formatFileSize, formatDate } from '@/lib/utils'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

// @ts-ignore
export default function DocumentPage() {
  const { kbId } = useParams<{ kbId: string }>()
  const [search, setSearch] = useState('')
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [pageNum, setPageNum] = useState(1)
  const [pageSize, setPageLength] = useState(10)
  const [file, setFile] = useState<File | null>(null)
  const [docName, setDocName] = useState('')
  const [error, setError] = useState('')

  const { knowledgeBases, fetchKnowledgeBaseById } = useKnowledgeBaseStore()
  const { documents, isLoading, fetchDocuments, deleteDocument, total, uploadDocument, triggerChunking } = useDocumentStore()

  const navigate = useNavigate()
  const { user } = useAuthentication()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 点击上传按钮时触发隐藏的文件输入框
  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const kb = knowledgeBases.find((k) => k.id === kbId)
  const filteredDocuments = documents.filter((doc) =>
      doc.docName?.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    if (kbId) {
      fetchKnowledgeBaseById(kbId)
      fetchDocuments(kbId, pageNum, pageSize)
    }
  }, [kbId, fetchKnowledgeBaseById, fetchDocuments, pageNum, pageSize])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm('确定要删除这个文档吗？')) {
      await deleteDocument(id)
    }
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && kbId) {
      setFile(selectedFile)
      setDocName(selectedFile.name)
      setIsUploadDialogOpen(true)
    }
    // Reset the input value so the same file can be selected again
    e.target.value = ''
  }

  const handleRemoveFile = () => {
    setFile(null)
    setDocName('')
  }

  const handleTriggerChunking = async (id: string) => {
    await triggerChunking(id)
    // Refresh document list after triggering chunking
    if (kbId) {
      fetchDocuments(kbId, pageNum, pageSize)
    }
  }

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!file || !kbId) return

    try {
      await uploadDocument(kbId, file, docName || file.name)
      setIsUploadDialogOpen(false)
      setFile(null)
      setDocName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败')
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  const handlePageChange = (page: number) => {
    setPageNum(page)
  }

  return (
      <div className="space-y-6">
        {/* 头部导航 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate('/knowledge-bases')}>
              <Play className="w-4 h-4 rotate-180" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">文档管理</h2>
              <p className="text-sm text-slate-500">管理知识库中的文档</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
                id="upload-file"
                type="file"
                className="hidden"
                onChange={handleUpload}
                accept=".pdf,.doc,.docx,.md,.txt,.csv,.xlsx"
                ref={fileInputRef}
            />
            <Button onClick={handleButtonClick} className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700">
              <Upload className="w-4 h-4 mr-2" />
              上传文档
            </Button>
          </div>
        </div>

        {/* 知识库信息卡片 */}
        {kb && (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{kb.name}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      Embedding 模型: {kb.embeddingModel}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-mono">
                      Collection: {kb.collectionName}
                    </Badge>
                  </div>
                </div>
                <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200">
                  {total} 个文档
                </Badge>
              </div>
            </div>
        )}

        {/* 搜索栏 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                  placeholder="搜索文档..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-10"
              />
            </div>
            <span className="text-sm text-slate-500">
            共 {filteredDocuments.length} 个文档
          </span>
          </div>
        </div>

        {/* 文档列表 */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>文档名称</TableHead>
                  <TableHead>文件类型</TableHead>
                  <TableHead>文件大小</TableHead>
                  <TableHead>摘要</TableHead>
                  <TableHead>关键词</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
                          <span className="text-sm text-slate-500">加载中...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                ) : filteredDocuments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                          <FileText className="h-8 w-8 text-slate-300" />
                          <span className="text-sm">暂无文档</span>
                        </div>
                      </TableCell>
                    </TableRow>
                ) : (
                    filteredDocuments.map((doc) => (
                        <TableRow key={doc.id} className="hover:bg-slate-50 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3 font-medium">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                                <FileText className="h-4 w-4 text-slate-600" />
                              </div>
                              <span className="text-slate-900">{doc.docName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="rounded bg-slate-100 px-2 py-1 text-xs font-mono text-slate-600">
                              {doc.fileType}
                            </code>
                          </TableCell>
                          <TableCell>
                      <span className="text-sm text-slate-600">
                        {doc.fileSize ? formatFileSize(doc.fileSize) : '-'}
                      </span>
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate text-sm text-slate-600" title={doc.summary || ''}>
                              {doc.summary || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {doc.keywords && doc.keywords.split(',').map((keyword, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                              {!doc.keywords && <span className="text-sm text-slate-400">-</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                                variant={
                                  doc.status === 'success'
                                      ? 'default'
                                      : doc.status === 'failed'
                                          ? 'error'
                                          : 'processing'
                                }
                            >
                              {doc.status === 'success'
                                  ? '已完成'
                                  : doc.status === 'failed'
                                      ? '失败'
                                      : '处理中'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {formatDate(doc.createdAt)}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="iconSm" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem
                                  onClick={() => handleTriggerChunking(doc.id)}
                                  disabled={doc.status === 'success'}
                                >
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  {doc.status === 'success' ? '已解析' : '解析向量'}
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Play className="mr-2 h-4 w-4" />
                                  查看
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onSelect={(e) => handleDelete(doc.id, e as any)}
                                    className="text-red-600 focus:text-red-600"
                                >
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

        {/* 上传文档对话框 - ✅ 现在在最外层 div 内部 */}
        <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>上传文档</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitUpload} className="space-y-4">
              {error && (
                  <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    {error}
                  </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="file" className="text-sm font-medium">
                  选择文件
                </Label>
                <div className="flex items-center gap-3 rounded-lg border border-dashed border-slate-300 p-4 hover:bg-slate-50 transition-colors">
                  {file ? (
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                          <p className="text-xs text-slate-500">
                            {file.size ? `${(file.size / 1024).toFixed(2)} KB` : ''}
                          </p>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="iconSm"
                            onClick={handleRemoveFile}
                            className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                  ) : (
                      <div className="flex flex-col items-center justify-center py-4 text-slate-500">
                        <Upload className="h-8 w-8 mb-2 text-slate-400" />
                        <p className="text-sm">点击或拖拽文件到此处上传</p>
                        <p className="text-xs text-slate-400 mt-1">
                          支持 PDF, Word, Markdown, TXT 等格式
                        </p>
                      </div>
                  )}
                  <input
                      id="file"
                      type="file"
                      className="hidden"
                      onChange={handleUpload}
                      accept=".pdf,.doc,.docx,.md,.txt,.csv,.xlsx"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="docName" className="text-sm font-medium">
                  文档名称（可选）
                </Label>
                <Input
                    id="docName"
                    value={docName}
                    onChange={(e) => setDocName(e.target.value)}
                    placeholder="自动从文件名获取"
                    disabled={!file}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                  取消
                </Button>
                <Button type="submit" disabled={!file}>
                  上传
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div> // ✅ 最外层 div 的关闭标签移到这里
  )
}