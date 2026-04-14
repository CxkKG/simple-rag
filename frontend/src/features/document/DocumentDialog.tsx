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
import { Upload, X } from 'lucide-react'

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

  const handleRemoveFile = () => {
    setFile(null)
    setDocName('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>上传文档</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
                    <Upload className="h-5 w-5" />
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
                onChange={handleFileChange}
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
