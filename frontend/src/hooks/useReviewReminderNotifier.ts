import { useEffect, useRef } from 'react'
import { ApiService } from '@/services/api'
import type { ReviewReminder } from '@/types'

const POLL_INTERVAL_MS = 60_000
const SEEN_STORAGE_KEY = 'rr_seen_ids'
const SEEN_MAX_SIZE = 200

function seenKey(r: Pick<ReviewReminder, 'id' | 'remindTime'>): string {
  return `${r.id}@${r.remindTime ?? ''}`
}

function loadSeenIds(): Set<string> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return new Set()
    const raw = window.localStorage.getItem(SEEN_STORAGE_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr)) return new Set()
    return new Set(arr.filter((x) => typeof x === 'string'))
  } catch {
    return new Set()
  }
}

function persistSeenIds(seen: Set<string>) {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return
    const arr = Array.from(seen)
    const trimmed = arr.length > SEEN_MAX_SIZE ? arr.slice(arr.length - SEEN_MAX_SIZE) : arr
    window.localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    // ignore quota errors
  }
}

function ensurePermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return Promise.resolve('denied' as NotificationPermission)
  }
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Promise.resolve(Notification.permission)
  }
  return Notification.requestPermission()
}

function fireNotification(reminder: ReviewReminder, onNavigate?: () => void): boolean {
  try {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') {
      return false
    }
    const n = new Notification('复习提醒：' + (reminder.topic || '到期复习'), {
      body: (reminder.remark || reminder.rawText || '到了复习时间，去看看吧～') + `\n${reminder.remindTime}`,
      tag: reminder.id,
      requireInteraction: false,
    })
    n.onclick = () => {
      window.focus()
      if (onNavigate) {
        onNavigate()
      } else {
        window.location.href = '/review-reminders'
      }
      n.close()
    }
    return true
  } catch (e) {
    return false
  }
}

export function useReviewReminderNotifier(options?: {
  enabled?: boolean
  onNewReminders?: (reminders: ReviewReminder[]) => void
  onNavigate?: () => void
}) {
  const enabled = options?.enabled ?? true
  const onNew = options?.onNewReminders
  const onNavigate = options?.onNavigate
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const seenRef = useRef<Set<string>>(loadSeenIds())

  useEffect(() => {
    if (!enabled) {
      return
    }

    let cancelled = false
    ensurePermission()

    const poll = async () => {
      try {
        const res = await ApiService.reviewReminder.due(false)
        const list = res.data || []
        if (cancelled || list.length === 0) {
          return
        }
        const fresh = list.filter((r) => !seenRef.current.has(seenKey(r)))
        if (fresh.length === 0) {
          return
        }
        const acked: string[] = []
        const fired: ReviewReminder[] = []
        for (const r of fresh) {
          const ok = fireNotification(r, onNavigate)
          if (ok) {
            seenRef.current.add(seenKey(r))
            acked.push(r.id)
            fired.push(r)
          }
        }
        if (acked.length > 0) {
          persistSeenIds(seenRef.current)
          await Promise.all(acked.map((id) => ApiService.reviewReminder.ack(id).catch(() => null)))
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('review-reminder-fired', { detail: fired }))
          }
          onNew?.(fired)
        }
      } catch (e) {
        // 忽略轮询错误
      }
    }

    poll()
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [enabled, onNew, onNavigate])
}

export function requestNotificationPermission() {
  return ensurePermission()
}
