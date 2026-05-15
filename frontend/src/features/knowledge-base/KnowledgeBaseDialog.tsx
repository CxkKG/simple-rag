import { useState, useEffect } from 'react'
import { useAuthentication } from '@/hooks/useAuthentication'
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
import { ApiService } from '@/services/api'

interface KnowledgeBaseDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kb?: KnowledgeBase | null
}

export function KnowledgeBaseDialog({ open, onOpenChange, kb }: KnowledgeBaseDialogProps) {
  const { user } = useAuthentication()
  const [name, setName] = useState('')
  const [defaultModel, setDefaultModel] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const createKnowledgeBase = useKnowledgeBaseStore((s) => s.createKnowledgeBase)
  const updateKnowledgeBase = useKnowledgeBaseStore((s) => s.updateKnowledgeBase)

  // 获取默认 Embedding 模型
  useEffect(() => {
    if (open && !kb) {
      ApiService.config.getDefaultEmbeddingModel()
        .then(response => {
          setDefaultModel(response.data.defaultModel)
        })
        .catch(err => {
          console.error('Failed to get default embedding model:', err)
          setDefaultModel('BAAI/bge-large-zh-v1.5') // fallback
        })
    }
  }, [open, kb])

  useEffect(() => {
    if (open && kb) {
      setName(kb.name || '')
    } else if (open) {
      setName('')
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
        // embeddingModel 由后端自动使用系统配置的默认模型
        const createdBy = user?.username || 'system'
        await createKnowledgeBase({ name, createdBy })
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
          <DialogTitle>{kb ? '编辑课程知识库' : '创建课程知识库'}</DialogTitle>
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
              课程知识库名称
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="请输入课程知识库名称"
            />
          </div>
          {!kb && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                Embedding 模型
              </Label>
              <div className="rounded-md bg-education-blue-50 px-3 py-2 text-sm text-education-blue-900 border border-education-blue-200">
                <div className="font-mono font-semibold">{defaultModel || '加载中...'}</div>
                <div className="text-xs text-education-blue-700 mt-1">
                  系统默认配置（自动使用）
                </div>
              </div>
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
