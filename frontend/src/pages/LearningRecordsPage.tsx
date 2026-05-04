import { useEffect, useMemo, useState } from 'react'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BookMarked, Search, Trash2, RefreshCw, BarChart3, Eye } from 'lucide-react'
import { ApiService } from '@/services/api'
import type { KnowledgeBase, KnowledgePointStat, LearningRecord } from '@/types'
import { formatDate } from '@/lib/utils'
import { StandalonePage } from '@/components/StandalonePage'

export default function LearningRecordsPage() {
  const [records, setRecords] = useState<LearningRecord[]>([])
  const [total, setTotal] = useState(0)
  const [pageNum, setPageNum] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [pendingKeyword, setPendingKeyword] = useState('')
  const [kbId, setKbId] = useState<string>('')
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<KnowledgePointStat[]>([])
  const [statsSort, setStatsSort] = useState<'count' | 'lastTime'>('count')
  const [statsLoading, setStatsLoading] = useState(false)
  const [detail, setDetail] = useState<LearningRecord | null>(null)

  const loadKnowledgeBases = async () => {
    try {
      const res = await ApiService.knowledgeBase.list(1, 100)
      setKnowledgeBases(res.data || [])
    } catch (e) {
      console.error('Load knowledge bases failed', e)
    }
  }

  const loadRecords = async () => {
    setLoading(true)
    try {
      const res = await ApiService.learningRecord.page({
        kbId: kbId || undefined,
        keyword: keyword || undefined,
        pageNum,
        pageSize,
      })
      setRecords(res.data || [])
      setTotal(res.total || 0)
    } catch (e) {
      console.error('Load learning records failed', e)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    setStatsLoading(true)
    try {
      const res = await ApiService.learningRecord.knowledgePoints({
        kbId: kbId || undefined,
        sortBy: statsSort,
        limit: 30,
      })
      setStats(res.data || [])
    } catch (e) {
      console.error('Load knowledge stats failed', e)
    } finally {
      setStatsLoading(false)
    }
  }

  useEffect(() => {
    loadKnowledgeBases()
  }, [])

  useEffect(() => {
    loadRecords()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNum, pageSize, kbId, keyword])

  useEffect(() => {
    loadStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kbId, statsSort])

  const handleSearch = () => {
    setKeyword(pendingKeyword.trim())
    setPageNum(1)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这条学习记录吗？')) return
    try {
      await ApiService.learningRecord.delete(id)
      await Promise.all([loadRecords(), loadStats()])
    } catch (e) {
      console.error('Delete failed', e)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const kbNameMap = useMemo(() => {
    const m: Record<string, string> = {}
    knowledgeBases.forEach((k) => (m[k.id] = k.name))
    return m
  }, [knowledgeBases])

  return (
    <StandalonePage
      title="学习记录"
      description="回顾你的提问与 AI 答复，按课程筛选高频知识点"
      icon={<BookMarked className="w-5 h-5 text-education-blue-600" />}
      actions={
        <Button variant="outline" size="sm" onClick={() => { loadRecords(); loadStats() }}>
          <RefreshCw className="w-4 h-4 mr-2" /> 刷新
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-education-blue-100 rounded-lg p-4 shadow-sm space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={kbId}
                onChange={(e) => { setKbId(e.target.value); setPageNum(1) }}
                className="h-9 px-3 rounded-md border border-education-blue-200 bg-white text-sm"
              >
                <option value="">全部课程</option>
                {knowledgeBases.map((kb) => (
                  <option key={kb.id} value={kb.id}>{kb.name}</option>
                ))}
              </select>
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="搜索提问或答复..."
                  value={pendingKeyword}
                  onChange={(e) => setPendingKeyword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch() }}
                />
              </div>
              <Button onClick={handleSearch}>搜索</Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[36%]">提问</TableHead>
                  <TableHead className="w-[18%]">课程</TableHead>
                  <TableHead className="w-[22%]">知识点</TableHead>
                  <TableHead className="w-[14%]">时间</TableHead>
                  <TableHead className="w-[10%] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-400 py-10">加载中...</TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-slate-400 py-10">暂无学习记录</TableCell>
                  </TableRow>
                ) : (
                  records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="align-top">
                        <div className="line-clamp-2 text-sm text-slate-800">{r.question}</div>
                      </TableCell>
                      <TableCell className="align-top text-sm text-slate-600">
                        {kbNameMap[r.kbId] || r.kbId}
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-wrap gap-1">
                          {(r.knowledgeTags || '').split(',').filter(Boolean).slice(0, 4).map((t) => (
                            <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="align-top text-xs text-slate-500">
                        {formatDate(r.createTime)}
                      </TableCell>
                      <TableCell className="align-top text-right">
                        <Button size="icon" variant="ghost" onClick={() => setDetail(r)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => handleDelete(r.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="flex items-center justify-between text-sm text-slate-600 pt-2">
              <span>共 {total} 条</span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={pageNum <= 1}
                  onClick={() => setPageNum((n) => Math.max(1, n - 1))}>上一页</Button>
                <span>{pageNum} / {totalPages}</span>
                <Button size="sm" variant="outline" disabled={pageNum >= totalPages}
                  onClick={() => setPageNum((n) => Math.min(totalPages, n + 1))}>下一页</Button>
                <select
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPageNum(1) }}
                  className="h-8 px-2 rounded-md border border-slate-200 bg-white text-sm"
                >
                  {[10, 20, 50].map((s) => <option key={s} value={s}>{s}/页</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-education-blue-100 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-education-blue-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-education-blue-600" /> 高频知识点
              </h3>
              <select
                value={statsSort}
                onChange={(e) => setStatsSort(e.target.value as 'count' | 'lastTime')}
                className="h-8 px-2 rounded-md border border-slate-200 bg-white text-sm"
              >
                <option value="count">按出现次数</option>
                <option value="lastTime">按最近提问</option>
              </select>
            </div>
            {statsLoading ? (
              <div className="text-sm text-slate-400 py-6 text-center">加载中...</div>
            ) : stats.length === 0 ? (
              <div className="text-sm text-slate-400 py-6 text-center">暂无知识点数据</div>
            ) : (
              <ul className="space-y-2 max-h-[520px] overflow-auto">
                {stats.map((s) => (
                  <li key={s.tag + (s.kbId || '')} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded hover:bg-education-blue-50">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-800 truncate">{s.tag}</div>
                      {s.kbId && <div className="text-xs text-slate-500 truncate">{kbNameMap[s.kbId] || s.kbId}</div>}
                    </div>
                    <div className="text-right">
                      <Badge className="bg-education-blue-100 text-education-blue-700 hover:bg-education-blue-100">×{s.count}</Badge>
                      {s.lastTime && <div className="text-[11px] text-slate-400 mt-0.5">{formatDate(s.lastTime)}</div>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={(o) => { if (!o) setDetail(null) }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>学习记录详情</DialogTitle>
            <DialogDescription>
              {detail && (
                <span className="text-xs text-slate-500">
                  {kbNameMap[detail.kbId] || detail.kbId} · {formatDate(detail.createTime)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div>
                <div className="text-xs text-slate-500 mb-1">提问</div>
                <div className="whitespace-pre-wrap rounded-md bg-education-blue-50 p-3 text-slate-800">{detail.question}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">回答</div>
                <div className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-slate-800 max-h-[40vh] overflow-auto">{detail.answer || '（无）'}</div>
              </div>
              {detail.knowledgeTags && (
                <div>
                  <div className="text-xs text-slate-500 mb-1">知识点</div>
                  <div className="flex flex-wrap gap-1">
                    {detail.knowledgeTags.split(',').filter(Boolean).map((t) => (
                      <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </StandalonePage>
  )
}
