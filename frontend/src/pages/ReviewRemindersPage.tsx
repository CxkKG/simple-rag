import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlarmClock, BellRing, Pencil, Plus, RefreshCw, Trash2, Wand2, CheckCircle2 } from 'lucide-react'
import { ApiService } from '@/services/api'
import type { KnowledgeBase, ReviewReminder } from '@/types'
import { formatDate } from '@/lib/utils'
import { StandalonePage } from '@/components/StandalonePage'

const STATUS_META: Record<number, { label: string; className: string }> = {
  0: { label: '待提醒', className: 'bg-education-blue-100 text-education-blue-700' },
  1: { label: '已提醒', className: 'bg-amber-100 text-amber-700' },
  2: { label: '已完成', className: 'bg-emerald-100 text-emerald-700' },
  3: { label: '已取消', className: 'bg-slate-100 text-slate-500' },
}

type DialogState =
  | { mode: 'create' }
  | { mode: 'edit'; reminder: ReviewReminder }
  | null

function toDatetimeLocal(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromDatetimeLocal(local: string): string {
  if (!local) return ''
  const d = new Date(local)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

export default function ReviewRemindersPage() {
  const [reminders, setReminders] = useState<ReviewReminder[]>([])
  const [total, setTotal] = useState(0)
  const [pageNum, setPageNum] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [loading, setLoading] = useState(false)
  const [kbId, setKbId] = useState('')
  const [status, setStatus] = useState<string>('')
  const [knowledgeBases, setKnowledgeBases] = useState<KnowledgeBase[]>([])

  const [dialog, setDialog] = useState<DialogState>(null)
  const [form, setForm] = useState({
    rawText: '',
    topic: '',
    remark: '',
    kbId: '',
    remindTime: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [parseHint, setParseHint] = useState<string | null>(null)


  const kbNameMap = useMemo(() => {
    const m: Record<string, string> = {}
    knowledgeBases.forEach((k) => (m[k.id] = k.name))
    return m
  }, [knowledgeBases])

  const loadKnowledgeBases = async () => {
    try {
      const res = await ApiService.knowledgeBase.list(1, 100)
      setKnowledgeBases(res.data || [])
    } catch (e) {
      console.error('Load knowledge bases failed', e)
    }
  }

  const loadReminders = async () => {
    setLoading(true)
    try {
      const res = await ApiService.reviewReminder.page({
        kbId: kbId || undefined,
        status: status === '' ? undefined : Number(status),
        pageNum,
        pageSize,
      })
      setReminders(res.data || [])
      setTotal(res.total || 0)
    } catch (e) {
      console.error('Load reminders failed', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadKnowledgeBases()
  }, [])

  useEffect(() => {
    const handler = () => loadReminders()
    window.addEventListener('review-reminder-fired', handler)
    return () => window.removeEventListener('review-reminder-fired', handler)
  }, [])

  useEffect(() => {
    loadReminders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNum, pageSize, kbId, status])

  const openCreate = () => {
    setForm({ rawText: '', topic: '', remark: '', kbId: '', remindTime: '' })
    setParseHint(null)
    setDialog({ mode: 'create' })
  }

  const openEdit = (r: ReviewReminder) => {
    setForm({
      rawText: r.rawText || '',
      topic: r.topic || '',
      remark: r.remark || '',
      kbId: r.kbId || '',
      remindTime: toDatetimeLocal(r.remindTime),
    })
    setParseHint(null)
    setDialog({ mode: 'edit', reminder: r })
  }

  const closeDialog = () => setDialog(null)

  const handleParse = async () => {
    if (!form.rawText.trim()) {
      setParseHint('请输入自然语言描述再解析')
      return
    }
    setParsing(true)
    setParseHint(null)
    try {
      const res = await ApiService.reviewReminder.parse(form.rawText.trim())
      const parsed = res.data
      setForm((f) => ({
        ...f,
        remindTime: toDatetimeLocal(parsed.remindTime),
        topic: f.topic || parsed.topic || '',
        remark: f.remark || parsed.remark || '',
      }))
      setParseHint(`已解析（来源：${parsed.source || 'llm'}）`)
    } catch (e: any) {
      setParseHint(e?.message || '解析失败，请手动填写时间')
    } finally {
      setParsing(false)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (dialog?.mode === 'create') {
        if (!form.rawText.trim() && !form.remindTime) {
          setParseHint('请输入自然语言描述或选择提醒时间')
          setSubmitting(false)
          return
        }
        await ApiService.reviewReminder.create({
          rawText: form.rawText.trim() || undefined,
          topic: form.topic.trim() || undefined,
          remark: form.remark.trim() || undefined,
          kbId: form.kbId || undefined,
          remindTime: form.remindTime ? fromDatetimeLocal(form.remindTime) : undefined,
        })
      } else if (dialog?.mode === 'edit') {
        await ApiService.reviewReminder.update(dialog.reminder.id, {
          topic: form.topic.trim() || undefined,
          remark: form.remark,
          remindTime: form.remindTime ? fromDatetimeLocal(form.remindTime) : undefined,
        })
      }
      closeDialog()
      await loadReminders()
    } catch (e: any) {
      setParseHint(e?.message || '保存失败')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这条提醒吗？')) return
    try {
      await ApiService.reviewReminder.delete(id)
      await loadReminders()
    } catch (e) {
      console.error('Delete failed', e)
    }
  }

  const handleStatus = async (r: ReviewReminder, newStatus: number) => {
    try {
      await ApiService.reviewReminder.update(r.id, { status: newStatus })
      await loadReminders()
    } catch (e) {
      console.error('Update status failed', e)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <StandalonePage
      title="复习提醒"
      description="用自然语言创建复习计划，到点通过浏览器通知提醒你"
      icon={<AlarmClock className="w-5 h-5 text-education-blue-600" />}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={() => loadReminders()}>
            <RefreshCw className="w-4 h-4 mr-2" /> 刷新
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> 新建提醒
          </Button>
        </>
      }
    >
      <div className="space-y-6">

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
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPageNum(1) }}
            className="h-9 px-3 rounded-md border border-education-blue-200 bg-white text-sm"
          >
            <option value="">全部状态</option>
            <option value="0">待提醒</option>
            <option value="1">已提醒</option>
            <option value="2">已完成</option>
            <option value="3">已取消</option>
          </select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[26%]">复习主题</TableHead>
              <TableHead className="w-[18%]">提醒时间</TableHead>
              <TableHead className="w-[14%]">课程</TableHead>
              <TableHead className="w-[10%]">状态</TableHead>
              <TableHead className="w-[18%]">备注</TableHead>
              <TableHead className="w-[14%] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-400 py-10">加载中...</TableCell>
              </TableRow>
            ) : reminders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-400 py-10">暂无复习提醒</TableCell>
              </TableRow>
            ) : (
              reminders.map((r) => {
                const meta = STATUS_META[r.status] || STATUS_META[0]
                return (
                  <TableRow key={r.id}>
                    <TableCell className="align-top">
                      <div className="text-sm text-slate-800 font-medium line-clamp-2">{r.topic}</div>
                      {r.rawText && <div className="text-xs text-slate-400 mt-1 line-clamp-1">{r.rawText}</div>}
                    </TableCell>
                    <TableCell className="align-top text-sm text-slate-700">{formatDate(r.remindTime)}</TableCell>
                    <TableCell className="align-top text-sm text-slate-600">{r.kbId ? (kbNameMap[r.kbId] || r.kbId) : '-'}</TableCell>
                    <TableCell className="align-top">
                      <Badge className={meta.className + ' hover:' + meta.className}>{meta.label}</Badge>
                    </TableCell>
                    <TableCell className="align-top text-sm text-slate-600 line-clamp-2">{r.remark || '-'}</TableCell>
                    <TableCell className="align-top text-right">
                      {r.status !== 2 && (
                        <Button size="icon" variant="ghost" title="标记已完成" onClick={() => handleStatus(r, 2)}>
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" title="编辑" onClick={() => openEdit(r)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" title="删除" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
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

      <Dialog open={!!dialog} onOpenChange={(o) => { if (!o) closeDialog() }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BellRing className="w-5 h-5 text-education-blue-600" />
              {dialog?.mode === 'edit' ? '编辑复习提醒' : '新建复习提醒'}
            </DialogTitle>
            <DialogDescription>
              {dialog?.mode === 'edit'
                ? '修改主题、时间或备注'
                : '可直接输入"三天后复习反向传播"等自然语言描述，由 AI 自动解析'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            {dialog?.mode === 'create' && (
              <div>
                <div className="text-xs text-slate-500 mb-1">自然语言描述</div>
                <Textarea
                  rows={2}
                  value={form.rawText}
                  onChange={(e) => setForm((f) => ({ ...f, rawText: e.target.value }))}
                  placeholder="例如：三天后下午三点复习反向传播"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-400">{parseHint || ' '}</span>
                  <Button size="sm" variant="outline" onClick={handleParse} disabled={parsing}>
                    <Wand2 className="w-4 h-4 mr-1" />
                    {parsing ? '解析中...' : 'AI 解析'}
                  </Button>
                </div>
              </div>
            )}

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <div className="text-xs text-slate-500 mb-1">复习主题</div>
                <Input
                  value={form.topic}
                  onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                  placeholder="例如：反向传播"
                />
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">提醒时间</div>
                <Input
                  type="datetime-local"
                  value={form.remindTime}
                  onChange={(e) => setForm((f) => ({ ...f, remindTime: e.target.value }))}
                />
              </div>
            </div>

            {dialog?.mode === 'create' && (
              <div>
                <div className="text-xs text-slate-500 mb-1">关联课程（可选）</div>
                <select
                  value={form.kbId}
                  onChange={(e) => setForm((f) => ({ ...f, kbId: e.target.value }))}
                  className="w-full h-9 px-3 rounded-md border border-education-blue-200 bg-white text-sm"
                >
                  <option value="">不关联课程</option>
                  {knowledgeBases.map((kb) => (
                    <option key={kb.id} value={kb.id}>{kb.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <div className="text-xs text-slate-500 mb-1">备注</div>
              <Textarea
                rows={2}
                value={form.remark}
                onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
                placeholder="选填"
              />
            </div>

            {dialog?.mode === 'edit' && parseHint && (
              <div className="text-xs text-red-500">{parseHint}</div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>取消</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </StandalonePage>
  )
}
