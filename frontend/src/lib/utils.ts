import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function parseDate(date: string | number | Date): Date | null {
  const d = new Date(date)
  return isNaN(d.getTime()) ? null : d
}

export function formatSessionTime(
  dateInput: string | number | Date
): string {
  const date = parseDate(dateInput)

  if (!date) return '更早'

  const now = new Date()

  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  )

  const inputDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  )

  const diffDays = Math.floor(
    (today.getTime() - inputDate.getTime()) / 86400000
  )

  if (diffDays < 0) return '未来'
  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays <= 7) return '过去7天'
  if (diffDays <= 30) return '过去30天'

  return '更早'
}

export function formatDate(
  dateInput: string | number | Date
): string {
  const date = parseDate(dateInput)

  if (!date) return '-'

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatTimeString(
  dateInput: string | number | Date
): string {
  const date = parseDate(dateInput)

  if (!date) return '-'

  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatFileSize(bytes?: number): string {
  if (bytes == null || isNaN(bytes) || bytes < 0) {
    return '-'
  }

  if (bytes === 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']

  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )

  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}