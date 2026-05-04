import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiService } from '@/services/api'
import type { ReviewReminder } from '@/types'

const POLL_INTERVAL_MS = 30_000
const PAGE_SIZE = 20

function sortByRemindTimeAsc(list: ReviewReminder[]): ReviewReminder[] {
  return [...list].sort((a, b) => {
    const ta = new Date(a.remindTime).getTime() || 0
    const tb = new Date(b.remindTime).getTime() || 0
    if (ta !== tb) return ta - tb
    return (a.id || '').localeCompare(b.id || '')
  })
}

export interface UseReviewReminderPopupResult {
  current: ReviewReminder | null
  pendingCount: number
  acking: boolean
  acknowledge: (id: string) => Promise<void>
  dismiss: (id: string) => void
  refresh: () => Promise<void>
}

export function useReviewReminderPopup(options?: { enabled?: boolean }): UseReviewReminderPopupResult {
  const enabled = options?.enabled ?? true
  const [queue, setQueue] = useState<ReviewReminder[]>([])
  const [acking, setAcking] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const processingRef = useRef<Set<string>>(new Set())
  const dismissedRef = useRef<Set<string>>(new Set())
  const fetchingRef = useRef(false)
  const cancelledRef = useRef(false)

  const fetchPending = useCallback(async () => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const res = await ApiService.reviewReminder.page({
        status: 1,
        pageNum: 1,
        pageSize: PAGE_SIZE,
      })
      if (cancelledRef.current) return
      const list = sortByRemindTimeAsc(res.data || []).filter(
        (r) => !processingRef.current.has(r.id) && !dismissedRef.current.has(r.id),
      )
      setQueue((prev) => {
        const seen = new Set<string>()
        const merged: ReviewReminder[] = []
        for (const item of [...prev, ...list]) {
          if (processingRef.current.has(item.id)) continue
          if (dismissedRef.current.has(item.id)) continue
          if (seen.has(item.id)) continue
          seen.add(item.id)
          merged.push(item)
        }
        return sortByRemindTimeAsc(merged)
      })
    } catch (e) {
      // 轮询错误静默
    } finally {
      fetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      setQueue([])
      return
    }
    cancelledRef.current = false
    fetchPending()
    timerRef.current = setInterval(fetchPending, POLL_INTERVAL_MS)

    const onFired = () => {
      fetchPending()
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('review-reminder-fired', onFired)
    }

    return () => {
      cancelledRef.current = true
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('review-reminder-fired', onFired)
      }
    }
  }, [enabled, fetchPending])

  const acknowledge = useCallback(async (id: string) => {
    if (processingRef.current.has(id)) return
    processingRef.current.add(id)
    setAcking(true)
    try {
      await ApiService.reviewReminder.update(id, { status: 2 })
      setQueue((prev) => prev.filter((r) => r.id !== id))
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('review-reminder-fired'))
      }
    } catch (e) {
      processingRef.current.delete(id)
    } finally {
      setAcking(false)
    }
  }, [])

  const dismiss = useCallback((id: string) => {
    dismissedRef.current.add(id)
    setQueue((prev) => prev.filter((r) => r.id !== id))
  }, [])

  return {
    current: queue[0] || null,
    pendingCount: queue.length,
    acking,
    acknowledge,
    dismiss,
    refresh: fetchPending,
  }
}
