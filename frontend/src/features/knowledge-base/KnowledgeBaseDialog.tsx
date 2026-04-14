import { useState, useEffect } from 'react'
import { useKnowledgeBaseStore } from '@/stores/knowledgeBase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import type { KnowledgeBase } from '@/types'

interface KnowledgeBaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kb?: KnowledgeBase | null
}

export function KnowledgeBaseDialog({ open, onOpenChange, kb }: KnowledgeBaseDialogProps) {
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
          <DialogTitle>{kb ? '编辑知识库' : '创建知识库'}</DialogTitle>
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
              知识库名称
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
