import { useState, useEffect, useRef } from 'react'
import { useAuthentication } from '@/hooks/useAuthentication'
import { useKnowledgeBaseStore } from '@/stores/knowledgeBase'
import { useDocumentStore } from '@/stores/document'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { SimpleRagDocument, DocumentContentPage } from '@/types'
import { DocumentContentViewer } from '@/features/document/DocumentContentViewer'
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
  Edit,
  Eye,
} from 'lucide-react'
import { formatFileSize, formatDate } from '@/lib/utils'
import { useNavigate, useParams } from 'react-router-dom'
import { useResizableColumns } from '@/hooks/useResizableColumns'
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<SimpleRagDocument | null>(null)
  const [editDocName, setEditDocName] = useState('')
  const [editSummary, setEditSummary] = useState('')
  const [editKeywords, setEditKeywords] = useState<string[]>([])
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [viewingDoc, setViewingDoc] = useState<SimpleRagDocument | null>(null)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [documentContentPage, setDocumentContentPage] = useState<DocumentContentPage | null>(null)
  const [isContentLoading, setIsContentLoading] = useState(false)
  const [contentError, setContentError] = useState('')
  const contentPageSize = 3000

  const { knowledgeBases, fetchKnowledgeBaseById } = useKnowledgeBaseStore()
  const { documents, isLoading, fetchDocuments, deleteDocument, total, uploadDocument, triggerChunking, updateDocumentInfo, fetchDocumentContent } = useDocumentStore()

  const navigate = useNavigate()
  const { user } = useAuthentication()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const tableColumns = useResizableColumns([
    { key: 'name', width: 300, minWidth: 220, maxWidth: 520 },
    { key: 'type', width: 110, minWidth: 90, maxWidth: 180 },
    { key: 'size', width: 120, minWidth: 100, maxWidth: 180 },
    { key: 'summary', width: 240, minWidth: 160, maxWidth: 520 },
    { key: 'keywords', width: 220, minWidth: 150, maxWidth: 420 },
    { key: 'status', width: 100, minWidth: 90, maxWidth: 150 },
    { key: 'createdAt', width: 150, minWidth: 130, maxWidth: 220 },
    { key: 'actions', width: 88, minWidth: 76, maxWidth: 120 },
  ])

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
      if (kbId) {
        await fetchDocuments(kbId, pageNum, pageSize)
      }
    }
  }

  const handleOpenEditDialog = (doc: SimpleRagDocument) => {
    setEditingDoc(doc)
    setEditDocName(doc.docName)
    setEditSummary(doc.summary || '')
    setEditKeywords(doc.keywords ? doc.keywords.split(',') : [])
    setIsEditDialogOpen(true)
  }

  const loadDocumentContent = async (docId: string, page = 1) => {
    setIsContentLoading(true)
    setContentError('')
    try {
      const content = await fetchDocumentContent(docId, page, contentPageSize)
      setDocumentContentPage(content)
    } catch (err) {
      setDocumentContentPage(null)
      setContentError(err instanceof Error ? err.message : '加载文档内容失败')
    } finally {
      setIsContentLoading(false)
    }
  }

  const handleOpenViewDialog = async (doc: SimpleRagDocument) => {
    setViewingDoc(doc)
    setSelectedDocId(doc.id)
    setDocumentContentPage(null)
    setContentError('')
    setIsViewDialogOpen(true)
    await loadDocumentContent(doc.id)
  }

  const handleSaveDocumentInfo = async () => {
    if (!editingDoc) return

    try {
      await updateDocumentInfo(editingDoc.id, {
        docName: editDocName,
        summary: editSummary,
        keywords: editKeywords,
      })
      setIsEditDialogOpen(false)
      fetchDocuments(kbId, pageNum, pageSize)
    } catch (err) {
      console.error('Failed to update document info:', err)
      setError('更新文档信息失败')
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
      await fetchDocuments(kbId, pageNum, pageSize)
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
              <h2 className="text-2xl font-bold text-education-blue-900">课程文档</h2>
              <p className="text-sm text-education-blue-600">管理课程资源库中的学习文档</p>
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
            <Button onClick={handleButtonClick} className="bg-gradient-to-r from-education-blue-600 to-education-blue-500 hover:from-education-blue-700 hover:to-education-blue-600">
              <Upload className="w-4 h-4 mr-2" />
              上传文档
            </Button>
          </div>
        </div>

        {/* 知识库信息卡片 */}
        {kb && (
            <div className="rounded-xl border border-education-blue-100 bg-education-blue-50/50 p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-education-blue-900">{kb.name}</h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs bg-education-blue-100 text-education-blue-700 border-education-blue-200">
                      Embedding 模型: {kb.embeddingModel}
                    </Badge>
                    <Badge variant="outline" className="text-xs font-mono bg-education-blue-100 text-education-blue-700 border-education-blue-200">
                      Collection: {kb.collectionName}
                    </Badge>
                  </div>
                </div>
                <Badge className="bg-education-green-100 text-education-green-700 hover:bg-education-green-200">
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
        <div className="rounded-xl border border-education-blue-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <Table className="table-fixed" style={tableColumns.getTableStyle()}>
              <TableHeader className="bg-education-blue-50">
                <TableRow>
                  <TableHead className="relative group text-education-blue-800" style={tableColumns.getColumnStyle('name')}>文档名称<span {...tableColumns.getResizeHandleProps('name')} /></TableHead>
                  <TableHead className="relative group text-education-blue-800" style={tableColumns.getColumnStyle('type')}>文件类型<span {...tableColumns.getResizeHandleProps('type')} /></TableHead>
                  <TableHead className="relative group text-education-blue-800" style={tableColumns.getColumnStyle('size')}>文件大小<span {...tableColumns.getResizeHandleProps('size')} /></TableHead>
                  <TableHead className="relative group text-education-blue-800" style={tableColumns.getColumnStyle('summary')}>摘要<span {...tableColumns.getResizeHandleProps('summary')} /></TableHead>
                  <TableHead className="relative group text-education-blue-800" style={tableColumns.getColumnStyle('keywords')}>关键词<span {...tableColumns.getResizeHandleProps('keywords')} /></TableHead>
                  <TableHead className="relative group text-education-blue-800" style={tableColumns.getColumnStyle('status')}>状态<span {...tableColumns.getResizeHandleProps('status')} /></TableHead>
                  <TableHead className="relative group text-education-blue-800" style={tableColumns.getColumnStyle('createdAt')}>创建时间<span {...tableColumns.getResizeHandleProps('createdAt')} /></TableHead>
                  <TableHead className="relative group text-right text-education-blue-800" style={tableColumns.getColumnStyle('actions')}>操作<span {...tableColumns.getResizeHandleProps('actions')} /></TableHead>
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
                    filteredDocuments.map((doc) => {
                      const isSelected = selectedDocId === doc.id
                      return (
                        <TableRow
                          key={doc.id}
                          data-state={isSelected ? 'selected' : undefined}
                          className={`h-16 transition-colors ${isSelected ? 'bg-education-blue-50/80 hover:bg-education-blue-50' : 'hover:bg-slate-50'}`}
                        >
                          <TableCell className="py-2" style={tableColumns.getColumnStyle('name')}>
                            <div className="flex min-w-0 items-center gap-3 font-medium">
                              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isSelected ? 'bg-education-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}>
                                <FileText className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="block truncate text-slate-900" title={doc.docName}>{doc.docName}</span>
                                {isSelected && <span className="text-xs font-medium text-education-blue-600">当前查看</span>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-2" style={tableColumns.getColumnStyle('type')}>
                            <code className="block truncate rounded bg-slate-100 px-2 py-1 text-xs font-mono text-slate-600" title={doc.fileType}>
                              {doc.fileType}
                            </code>
                          </TableCell>
                          <TableCell className="py-2" style={tableColumns.getColumnStyle('size')}>
                            <span className="block truncate text-sm text-slate-600">
                              {doc.fileSize ? formatFileSize(doc.fileSize) : '-'}
                            </span>
                          </TableCell>
                          <TableCell className="py-2" style={tableColumns.getColumnStyle('summary')}>
                            <div className="truncate text-sm text-slate-600" title={doc.summary || ''}>
                              {doc.summary || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="py-2" style={tableColumns.getColumnStyle('keywords')}>
                            <div className="truncate text-sm text-slate-600" title={doc.keywords || ''}>
                              {doc.keywords || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="py-2" style={tableColumns.getColumnStyle('status')}>
                            <Badge
                                variant={
                                  doc.status === 'success'
                                      ? 'default'
                                      : doc.status === 'failed'
                                          ? 'error'
                                          : doc.status === 'pending'
                                              ? 'pending'
                                              : 'processing'
                                }
                            >
                              {doc.status === 'success'
                                  ? '已完成'
                                  : doc.status === 'failed'
                                      ? '失败'
                                      : doc.status === 'pending'
                                          ? '待处理'
                                          : '处理中'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 text-sm text-slate-500" style={tableColumns.getColumnStyle('createdAt')}>
                            <span className="block truncate">{formatDate(doc.createdAt)}</span>
                          </TableCell>
                          <TableCell className="py-2 text-right" style={tableColumns.getColumnStyle('actions')}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant={isSelected ? 'outline' : 'ghost'}
                                  size="iconSm"
                                  className={`h-8 w-8 rounded-full ${isSelected ? 'border-education-blue-200 bg-white text-education-blue-700 shadow-sm' : 'hover:bg-education-blue-50 hover:text-education-blue-700'}`}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 rounded-xl border-education-blue-100 bg-white p-2 shadow-xl">
                                <div className="px-2 pb-2 pt-1">
                                  <p className="truncate text-xs font-medium text-slate-500">文档操作</p>
                                  <p className="truncate text-sm font-semibold text-slate-900">{doc.docName}</p>
                                </div>
                                <DropdownMenuSeparator className="bg-education-blue-50" />
                                <DropdownMenuItem
                                  onClick={() => handleOpenViewDialog(doc)}
                                  className="cursor-pointer rounded-lg px-3 py-2 text-slate-700 focus:bg-education-blue-50 focus:text-education-blue-700"
                                >
                                  <Eye className="mr-2 h-4 w-4 text-education-blue-500" />
                                  查看内容
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleOpenEditDialog(doc)}
                                  className="cursor-pointer rounded-lg px-3 py-2 text-slate-700 focus:bg-education-blue-50 focus:text-education-blue-700"
                                >
                                  <Edit className="mr-2 h-4 w-4 text-slate-500" />
                                  编辑信息
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleTriggerChunking(doc.id)}
                                  disabled={doc.status === 'success'}
                                  className="cursor-pointer rounded-lg px-3 py-2 text-slate-700 focus:bg-education-blue-50 focus:text-education-blue-700"
                                >
                                  <RefreshCw className="mr-2 h-4 w-4 text-emerald-500" />
                                  {doc.status === 'success' ? '已解析' : '解析向量'}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-education-blue-50" />
                                <DropdownMenuItem
                                    onClick={(e) => handleDelete(doc.id, e as any)}
                                    className="cursor-pointer rounded-lg px-3 py-2 text-red-600 focus:bg-red-50 focus:text-red-700"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  删除文档
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })
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

        {/* 编辑文档对话框 */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>编辑文档信息</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-red-500" />
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="edit-docName" className="text-sm font-medium">
                  文档名称
                </Label>
                <Input
                  id="edit-docName"
                  value={editDocName}
                  onChange={(e) => setEditDocName(e.target.value)}
                  placeholder="请输入文档名称"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-summary" className="text-sm font-medium">
                  摘要
                </Label>
                <Input
                  id="edit-summary"
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  placeholder="请输入文档摘要"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-keywords" className="text-sm font-medium">
                  关键词（用逗号分隔）
                </Label>
                <Input
                  id="edit-keywords"
                  value={editKeywords.join(',')}
                  onChange={(e) => setEditKeywords(e.target.value.split(',').map(keyword => keyword.trim()).filter(keyword => keyword))}
                  placeholder="请输入关键词，用逗号分隔"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  取消
                </Button>
                <Button type="button" onClick={handleSaveDocumentInfo}>
                  保存
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* 查看文档对话框 */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-5xl">
            <DialogHeader>
              <DialogTitle>{viewingDoc?.docName || '查看文档'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <DocumentContentViewer
                contentPage={documentContentPage}
                docName={viewingDoc?.docName}
                fileType={viewingDoc?.fileType}
                isLoading={isContentLoading}
                error={contentError}
                onPageChange={(page) => viewingDoc && loadDocumentContent(viewingDoc.id, page)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
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