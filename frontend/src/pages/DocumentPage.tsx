import { useState, useEffect } from 'react'
import { useAuthentication } from '@/hooks/useAuthentication'
import { Layout } from '@/components/layout'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Play,
  Pause,
  FileText,
  RefreshCw,
  Upload,
  Plus,
  Backward,
} from 'lucide-react'
import { formatFileSize, formatDate } from '@/lib/utils'
import { useNavigate, useParams } from 'react-router-dom'
import { KnowledgeBaseDialog } from '@/features/knowledge-base/KnowledgeBaseDialog'
import { DocumentDialog } from '@/features/document/DocumentDialog'

export default function DocumentPage() {
  const { kbId } = useParams<{ kbId: string }>()
  const [search, setSearch] = useState('')
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)

  const { knowledgeBases, fetchKnowledgeBaseById } = useKnowledgeBaseStore()
  const { documents, isLoading, fetchDocuments, deleteDocument } = useDocumentStore()

  const navigate = useNavigate()
  const { user } = useAuthentication()

  const kb = knowledgeBases.find((k) => k.id === kbId)
  const filteredDocuments = documents.filter((doc) =>
    doc.docName?.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    if (kbId) {
      fetchKnowledgeBaseById(kbId)
      fetchDocuments(kbId)
    }
  }, [kbId, fetchKnowledgeBaseById, fetchDocuments])

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (window.confirm('确定要删除这个文档吗？')) {
      await deleteDocument(id)
    }
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && kbId) {
      // TODO: 调用上传 API
      // await documentStore.uploadDocument(kbId, file, file.name)
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate('/knowledge-bases')}>
              <Backward className="w-4 h-4" />
            </Button>
            <div>
              <h2 className="text-2xl font-bold">文档管理</h2>
              <p className="text-muted-foreground">管理知识库中的文档</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="upload-file" className="cursor-pointer">
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                上传文档
              </Button>
              <input
                id="upload-file"
                type="file"
                className="hidden"
                onChange={handleUpload}
                accept=".pdf,.doc,.docx,.md,.txt,.csv,.xlsx"
              />
            </Label>
          </div>
        </div>

        {kb && (
          <div className="card">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{kb.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Embedding 模型: {kb.embeddingModel}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Collection: {kb.collectionName}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {documents.length} 个文档
                </Badge>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Input
                placeholder="搜索文档..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
              />
              <span className="text-sm text-muted-foreground">
                共 {filteredDocuments.length} 个文档
              </span>
            </div>
          </div>

          <div className="card">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>文档名称</TableHead>
                    <TableHead>文件类型</TableHead>
                    <TableHead>文件大小</TableHead>
                    <TableHead>分块数量</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ) : filteredDocuments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        暂无文档
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDocuments.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-2 font-medium">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            {doc.docName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                            {doc.fileType}
                          </code>
                        </TableCell>
                        <TableCell>{doc.fileSize ? formatFileSize(doc.fileSize) : '-'}</TableCell>
                        <TableCell>{doc.chunkCount}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              doc.status === 'success'
                                ? 'default'
                                : doc.status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {doc.status === 'success'
                              ? '已完成'
                              : doc.status === 'failed'
                              ? '失败'
                              : '处理中'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => {}}>
                                <Play className="w-4 h-4 mr-2" />
                                查看
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => {}}>
                                <RefreshCw className="w-4 h-4 mr-2" />
                                重建向量
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={(e) => handleDelete(doc.id, e as any)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
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
          </div>
        </div>
      </div>

      <DocumentDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        kbId={kbId || ''}
      />
    </Layout>
  )
}
