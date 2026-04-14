import { useState } from 'react'
import { useDocumentStore } from '@/stores/document'
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

interface DocumentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  kbId: string
}

export function DocumentDialog({ open, onOpenChange, kbId }: DocumentDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [docName, setDocName] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const uploadDocument = useDocumentStore((s) => s.uploadDocument)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    if (!file) {
      setError('请选择文件')
      setIsLoading(false)
      return
    }

    try {
      await uploadDocument(kbId, file, docName || file.name)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setDocName(selectedFile.name)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>上传文档</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="text-red-500 text-sm">{error}</div>}
          <div>
            <Label htmlFor="file">文件</Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileChange}
              required
              accept=".pdf,.doc,.docx,.md,.txt,.csv,.xlsx"
            />
          </div>
          <div>
            <Label htmlFor="docName">文档名称（可选）</Label>
            <Input
              id="docName"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              placeholder="自动从文件名获取"
            />
          </div>
          {file && (
            <div className="text-sm text-muted-foreground">
              已选择: {file.name} ({file.size ? `${(file.size / 1024).toFixed(2)} KB` : ''})
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={isLoading || !file}>
              {isLoading ? '上传中...' : '上传'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
