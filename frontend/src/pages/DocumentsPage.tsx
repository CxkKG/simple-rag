import { useState, useEffect } from 'react'
import { useAuthentication } from '@/hooks/useAuthentication'
import { useDocumentStore } from '@/stores/document'
import { useKnowledgeBaseStore } from '@/stores/knowledgeBase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { SimpleRagDocument, KnowledgeBase } from '@/types'
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
  Filter,
} from 'lucide-react'
import { formatFileSize, formatDate } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'

export default function DocumentsPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('')
  const [fileType, setFileType] = useState<string>('')
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [pageNum, setPageNum] = useState(1)
  const [pageSize, setPageLength] = useState(10)
  const [selectedKbId, setSelectedKbId] = useState<string>('')
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadDocName, setUploadDocName] = useState<string>('')

  const { documents, isLoading, queryDocuments, deleteDocuments, total, selectedIds, toggleSelectId, clearSelectedIds, uploadDocument } = useDocumentStore()
  const { knowledgeBases, fetchKnowledgeBases } = useKnowledgeBaseStore()

  const navigate = useNavigate()
  const { user } = useAuthentication()

  // 获取知识库列表
  useEffect(() => {
    fetchKnowledgeBases()
  }, [fetchKnowledgeBases])

  // 查询文档
  useEffect(() => {
    const request = {
      docName: search,
      status: status || undefined,
      fileType: fileType || undefined,
      startTime: startDate ? startDate.toISOString() : undefined,
      endTime: endDate ? endDate.toISOString() : undefined,
      kbId: selectedKbId || undefined,
      pageNum,
      pageSize,
    }
    queryDocuments(request)
  }, [search, status, fileType, startDate, endDate, selectedKbId, pageNum, pageSize, queryDocuments])

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return
    if (window.confirm(`确定要删除选中的 ${selectedIds.length} 个文档吗？`)) {
      await deleteDocuments(selectedIds)
    }
  }

  // 全选/取消全选
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = documents.map(doc => doc.id)
      useDocumentStore.getState().setSelectedIds(allIds)
    } else {
      clearSelectedIds()
    }
  }

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      setUploadFile(file)
      setUploadDocName(file.name)
    }
  }

  // 处理上传文档
  const handleUploadDocument = async () => {
    if (!uploadFile || !selectedKbId) {
      return
    }
    await uploadDocument(selectedKbId, uploadFile, uploadDocName)
    setIsUploadModalOpen(false)
    setUploadFile(null)
    setUploadDocName('')
    setSelectedKbId('')
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
            <h2 className="text-2xl font-bold text-education-blue-900">文档管理</h2>
            <p className="text-sm text-education-blue-600">管理所有知识库中的学习文档</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsUploadModalOpen(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              上传文档
            </Button>
            {selectedIds.length > 0 && (
              <Button
                variant="destructive"
                onClick={handleBatchDelete}
                disabled={isLoading}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                删除选中 ({selectedIds.length})
              </Button>
            )}
          </div>
        </div>

        {/* 查询条件 */}
        <div className="rounded-xl border border-education-blue-100 bg-white shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search" className="text-sm font-medium">
                文档名称
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="search"
                  placeholder="搜索文档..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium">
                状态
              </Label>
              <Input
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="所有状态"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fileType" className="text-sm font-medium">
                文件类型
              </Label>
              <Input
                id="fileType"
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                placeholder="所有类型"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kbId" className="text-sm font-medium">
                所属知识库
              </Label>
              <select
                id="kbId"
                value={selectedKbId}
                onChange={(e) => setSelectedKbId(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">所有知识库</option>
                {knowledgeBases.map(kb => (
                  <option key={kb.id} value={kb.id}>{kb.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateRange" className="text-sm font-medium">
                创建时间
              </Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={startDate ? startDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setStartDate(e.target.value ? new Date(e.target.value) : undefined)}
                  placeholder="开始日期"
                  className="h-10"
                />
                <Input
                  type="date"
                  value={endDate ? endDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => setEndDate(e.target.value ? new Date(e.target.value) : undefined)}
                  placeholder="结束日期"
                  className="h-10"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 文档列表 */}
        <div className="rounded-xl border border-education-blue-100 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-education-blue-50">
                <TableRow>
                  <TableHead className="text-education-blue-800 w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === documents.length && documents.length > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 text-education-blue-600 focus:ring-education-blue-500"
                    />
                  </TableHead>
                  <TableHead className="text-education-blue-800">文档名称</TableHead>
                  <TableHead className="text-education-blue-800">所属知识库</TableHead>
                  <TableHead className="text-education-blue-800">文件类型</TableHead>
                  <TableHead className="text-education-blue-800">文件大小</TableHead>
                  <TableHead className="text-education-blue-800">摘要</TableHead>
                  <TableHead className="text-education-blue-800">关键词</TableHead>
                  <TableHead className="text-education-blue-800">状态</TableHead>
                  <TableHead className="text-education-blue-800">创建时间</TableHead>
                  <TableHead className="text-right text-education-blue-800">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-24 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
                          <span className="text-sm text-slate-500">加载中...</span>
                        </div>
                      </TableCell>
                    </TableRow>
                ) : documents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-24 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-slate-500">
                          <FileText className="h-8 w-8 text-slate-300" />
                          <span className="text-sm">暂无文档</span>
                        </div>
                      </TableCell>
                    </TableRow>
                ) : (
                    documents.map((doc) => (
                        <TableRow key={doc.id} className="hover:bg-slate-50 transition-colors">
                          <TableCell>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(doc.id)}
                              onChange={(e) => toggleSelectId(doc.id)}
                              className="rounded border-slate-300 text-education-blue-600 focus:ring-education-blue-500"
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3 font-medium">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                                <FileText className="h-4 w-4 text-slate-600" />
                              </div>
                              <span className="text-slate-900">{doc.docName}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs bg-education-blue-100 text-education-blue-700 border-education-blue-200">
                              {doc.kbName || '未知知识库'}
                            </Badge>
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
                                  onClick={() => {}}
                                  disabled={doc.status === 'success'}
                                >
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  {doc.status === 'success' ? '已解析' : '解析向量'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {}}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  编辑
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {}}>
                                  <Play className="mr-2 h-4 w-4" />
                                  查看
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => {}}
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
                  第 {pageNum} / {totalPages} 页，共 {total} 条记录
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

        {/* 上传文档模态框 */}
        <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>上传文档</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="uploadKbId" className="text-sm font-medium">
                  选择知识库
                </Label>
                <select
                  id="uploadKbId"
                  value={selectedKbId}
                  onChange={(e) => setSelectedKbId(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">请选择知识库</option>
                  {knowledgeBases.map(kb => (
                    <option key={kb.id} value={kb.id}>{kb.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="uploadFile" className="text-sm font-medium">
                  选择文件
                </Label>
                <Input
                  id="uploadFile"
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx"
                  onChange={handleFileChange}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="uploadDocName" className="text-sm font-medium">
                  文档名称
                </Label>
                <Input
                  id="uploadDocName"
                  type="text"
                  value={uploadDocName}
                  onChange={(e) => setUploadDocName(e.target.value)}
                  placeholder="请输入文档名称"
                  className="h-10"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUploadModalOpen(false)}>
                取消
              </Button>
              <Button onClick={handleUploadDocument} disabled={!uploadFile || !selectedKbId}>
                上传
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  )
}
