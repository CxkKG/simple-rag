import { useState } from 'react'
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
  MoreHorizontal,
  Edit,
  Trash2,
  Play,
  Pause,
  FileText,
  RefreshCw,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatFileSize, formatDate } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { KnowledgeBaseDialog } from './KnowledgeBaseDialog'

export function KnowledgeBaseTable() {
  const [search, setSearch] = useState('')
  const [editingKb, setEditingKb] = useState<KnowledgeBase | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const { knowledgeBases, isLoading, deleteKnowledgeBase } = useKnowledgeBaseStore()

  const navigate = useNavigate()

  const filteredKnowledgeBases = knowledgeBases.filter((kb) =>
    kb.name?.toLowerCase().includes(search.toLowerCase())
  )

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

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Input
              placeholder="搜索知识库..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              共 {filteredKnowledgeBases.length} 个知识库
            </span>
          </div>
        </div>

        <div className="card">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>Embedding 模型</TableHead>
                  <TableHead>Collection 名称</TableHead>
                  <TableHead>创建人</TableHead>
                  <TableHead>创建时间</TableHead>
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
                ) : filteredKnowledgeBases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      暂无知识库
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredKnowledgeBases.map((kb) => (
                    <TableRow
                      key={kb.id}
                      className="cursor-pointer"
                      onClick={() => handleViewDocuments(kb)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2 font-medium">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          {kb.name}
                        </div>
                      </TableCell>
                      <TableCell>{kb.embeddingModel}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-xs">
                          {kb.collectionName}
                        </Badge>
                      </TableCell>
                      <TableCell>{kb.createdBy}</TableCell>
                      <TableCell>{formatDate(kb.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => handleEdit(kb, e)}>
                              <Edit className="w-4 h-4 mr-2" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleDelete(kb.id, e)}>
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

      <KnowledgeBaseDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        kb={editingKb}
      />
    </>
  )
}
