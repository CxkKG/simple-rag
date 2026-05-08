import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Download, FileText, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'
import { ApiService } from '@/services/api'

interface RawFileViewerProps {
  docId: string | null
  docName?: string
  fileType?: string
}

type RenderKind = 'pdf' | 'image' | 'text' | 'markdown' | 'html' | 'binary'

const normalize = (s?: string) => (s || '').toLowerCase().trim()

const decideKind = (fileType?: string, mime?: string): RenderKind => {
  const t = normalize(fileType)
  const m = normalize(mime)
  if (t === 'pdf' || m === 'application/pdf') return 'pdf'
  if (t === 'png' || t === 'jpg' || t === 'jpeg' || t === 'gif' || m.startsWith('image/')) return 'image'
  if (t === 'md' || t === 'markdown') return 'markdown'
  if (t === 'html' || t === 'htm' || m === 'text/html') return 'html'
  if (
    t === 'txt' ||
    t === 'text' ||
    t === 'csv' ||
    t === 'json' ||
    m.startsWith('text/') ||
    m === 'application/json'
  )
    return 'text'
  return 'binary'
}

const getDisplayType = (fileType?: string) => {
  const t = normalize(fileType)
  if (!t) return 'FILE'
  if (t === 'word' || t === 'docx' || t === 'doc') return 'Word'
  if (t === 'excel' || t === 'xlsx' || t === 'xls') return 'Excel'
  if (t === 'markdown' || t === 'md') return 'Markdown'
  if (t === 'text' || t === 'txt') return 'TXT'
  return t.toUpperCase()
}

export function RawFileViewer({ docId, docName, fileType }: RawFileViewerProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | undefined>(undefined)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [resolvedMime, setResolvedMime] = useState<string | undefined>(undefined)
  const previousUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!docId) {
      return
    }
    let cancelled = false
    setLoading(true)
    setError(undefined)
    setTextContent(null)
    setBlobUrl(null)
    setResolvedMime(undefined)

    ApiService.document
      .getRaw(docId)
      .then(async (res: any) => {
        if (cancelled) return
        const blob: Blob = res?.data instanceof Blob ? res.data : (res as Blob)
        const mime = blob.type || ''
        const kind = decideKind(fileType, mime)

        if (kind === 'text' || kind === 'markdown' || kind === 'html') {
          const text = await blob.text()
          if (cancelled) return
          setTextContent(text)
          setResolvedMime(mime)
        } else {
          const url = URL.createObjectURL(blob)
          if (previousUrlRef.current) {
            URL.revokeObjectURL(previousUrlRef.current)
          }
          previousUrlRef.current = url
          setBlobUrl(url)
          setResolvedMime(mime)
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : '加载失败')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [docId, fileType])

  useEffect(() => {
    return () => {
      if (previousUrlRef.current) {
        URL.revokeObjectURL(previousUrlRef.current)
        previousUrlRef.current = null
      }
    }
  }, [])

  const kind = decideKind(fileType, resolvedMime)
  const displayType = getDisplayType(fileType)
  const title = docName || '文档预览'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-education-blue-100 bg-education-blue-50/70 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-education-blue-600 shadow-sm">
            {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <FileText className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-education-blue-900">{title}</p>
            <p className="text-xs text-education-blue-600">
              {loading ? '正在加载原始文件...' : '原始文件'}
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
            <p className="font-medium">原始文件加载失败</p>
            <p className="mt-1 text-red-600">{error}</p>
          </div>
        </div>
      )}

      <div className="min-h-[420px] max-h-[70vh] overflow-auto rounded-xl border border-slate-200 bg-white p-0 shadow-inner">
        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 8 }, (_, index) => (
              <div
                key={index}
                className="h-4 animate-pulse rounded bg-slate-200"
                style={{ width: `${92 - index * 6}%` }}
              />
            ))}
          </div>
        ) : !error && (blobUrl || textContent !== null) ? (
          <>
            {kind === 'pdf' && blobUrl && (
              <iframe
                src={blobUrl}
                title={title}
                className="h-[70vh] w-full border-0"
              />
            )}
            {kind === 'image' && blobUrl && (
              <div className="flex items-center justify-center bg-slate-50 p-4">
                <img src={blobUrl} alt={title} className="max-h-[68vh] max-w-full object-contain" />
              </div>
            )}
            {kind === 'markdown' && textContent !== null && (
              <div className="p-5">
                <MarkdownRenderer content={textContent} />
              </div>
            )}
            {kind === 'html' && textContent !== null && (
              <pre className="whitespace-pre-wrap break-words p-5 font-mono text-xs leading-6 text-slate-700">
                {textContent}
              </pre>
            )}
            {kind === 'text' && textContent !== null && (
              <pre className="whitespace-pre-wrap break-words p-5 font-mono text-sm leading-7 text-slate-700">
                {textContent}
              </pre>
            )}
            {kind === 'binary' && blobUrl && (
              <div className="flex h-[320px] flex-col items-center justify-center gap-3 text-slate-600">
                <FileText className="h-12 w-12 text-slate-300" />
                <p className="text-sm">该文件类型无法在浏览器内联预览，请下载后用本地软件打开。</p>
                <a
                  href={blobUrl}
                  download={docName || `document.${fileType || 'bin'}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-education-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-education-blue-700"
                >
                  <Download className="h-4 w-4" />
                  下载原始文件
                </a>
              </div>
            )}
          </>
        ) : !error ? (
          <div className="flex h-[320px] flex-col items-center justify-center gap-2 text-slate-500">
            <FileText className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-medium">暂无可显示的原始文件</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
