import { AlertCircle, ChevronLeft, ChevronRight, FileText, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DocumentContentPage } from '@/types'

interface DocumentContentViewerProps {
  contentPage: DocumentContentPage | null
  docName?: string
  fileType?: string
  isLoading?: boolean
  error?: string
  onPageChange?: (page: number) => void
}

const pageButtonRange = (current: number, total: number) => {
  const count = Math.min(total, 5)
  const start = Math.max(1, Math.min(current - 2, total - count + 1))
  return Array.from({ length: count }, (_, index) => start + index)
}

const normalizeFileType = (fileType?: string) => (fileType || 'document').toLowerCase()

const getDisplayType = (fileType?: string) => {
  const type = normalizeFileType(fileType)
  if (type === 'word') return 'Word'
  if (type === 'excel') return 'Excel'
  if (type === 'markdown') return 'Markdown'
  if (type === 'text') return 'TXT'
  return type.toUpperCase()
}

const renderMarkdown = (content: string) => {
  return content.split('\n').map((line, index) => {
    const trimmed = line.trim()
    if (!trimmed) return <div key={index} className="h-3" />
    if (trimmed.startsWith('### ')) return <h4 key={index} className="mt-4 text-base font-semibold text-slate-900">{trimmed.slice(4)}</h4>
    if (trimmed.startsWith('## ')) return <h3 key={index} className="mt-5 text-lg font-semibold text-slate-900">{trimmed.slice(3)}</h3>
    if (trimmed.startsWith('# ')) return <h2 key={index} className="mt-6 text-xl font-bold text-slate-950">{trimmed.slice(2)}</h2>
    if (/^[-*]\s+/.test(trimmed)) return <p key={index} className="pl-4 leading-7 text-slate-700">• {trimmed.slice(2)}</p>
    if (/^\d+\.\s+/.test(trimmed)) return <p key={index} className="pl-4 leading-7 text-slate-700">{trimmed}</p>
    return <p key={index} className="leading-7 text-slate-700">{line}</p>
  })
}

const renderTableContent = (content: string) => {
  const rows = content
    .split('\n')
    .map((row) => row.trim())
    .filter(Boolean)
    .slice(0, 80)
    .map((row) => row.split(row.includes('\t') ? '\t' : ','))

  if (rows.length === 0) return null

  return (
    <div className="overflow-auto rounded-lg border border-slate-200 bg-white">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className={rowIndex === 0 ? 'bg-slate-50 font-semibold text-slate-800' : 'text-slate-700'}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="max-w-[260px] whitespace-pre-wrap px-3 py-2 align-top">
                  {cell || '-'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const renderContent = (content: string, fileType?: string) => {
  const type = normalizeFileType(fileType)
  if (type === 'markdown') return <div className="space-y-1">{renderMarkdown(content)}</div>
  if (type === 'excel' || type === 'csv') return renderTableContent(content) || <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-7 text-slate-700">{content}</pre>
  return <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-slate-700">{content}</pre>
}

export function DocumentContentViewer({ contentPage, docName, fileType, isLoading, error, onPageChange }: DocumentContentViewerProps) {
  const content = contentPage?.content || ''
  const currentPage = contentPage?.pageNum || 1
  const totalPages = Math.max(1, contentPage?.pages || 1)
  const total = contentPage?.total || 0
  const displayType = getDisplayType(contentPage?.fileType || fileType)
  const title = contentPage?.docName || docName || '文档内容'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-education-blue-100 bg-education-blue-50/70 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-education-blue-600 shadow-sm">
            {isLoading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-education-blue-900">{title}</p>
            <p className="text-xs text-education-blue-600">
              {isLoading ? '正在提取并加载文档内容' : `第 ${currentPage} / ${totalPages} 页 · 共 ${total} 字符`}
            </p>
          </div>
        </div>
        <Badge variant="outline" className="bg-white text-education-blue-700">
          {displayType}
        </Badge>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">文档内容加载失败</p>
            <p className="mt-1 text-red-600">{error}</p>
          </div>
        </div>
      )}

      {contentPage?.previewOnly && contentPage.errorMessage && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{contentPage.errorMessage}</p>
        </div>
      )}

      <div className="min-h-[420px] max-h-[62vh] overflow-auto rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5 shadow-inner">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 8 }, (_, index) => (
              <div key={index} className="h-4 animate-pulse rounded bg-slate-200" style={{ width: `${92 - index * 6}%` }} />
            ))}
          </div>
        ) : content ? (
          renderContent(content, contentPage?.fileType || fileType)
        ) : !error ? (
          <div className="flex h-[320px] flex-col items-center justify-center gap-2 text-slate-500">
            <FileText className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium">暂无可显示的文档内容</p>
            <p className="text-xs text-slate-400">文件可能为空，或当前类型无法提取文本。</p>
          </div>
        ) : null}
      </div>

      {!isLoading && content && totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <p className="text-xs text-slate-500">已按分页加载大文件，切换页码可继续查看后续内容。</p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onPageChange?.(currentPage - 1)} disabled={currentPage === 1}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              上一页
            </Button>
            <div className="flex items-center gap-1">
              {pageButtonRange(currentPage, totalPages).map((page) => (
                <Button
                  key={page}
                  type="button"
                  variant={page === currentPage ? 'default' : 'ghost'}
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onPageChange?.(page)}
                >
                  {page}
                </Button>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => onPageChange?.(currentPage + 1)} disabled={currentPage === totalPages}>
              下一页
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
