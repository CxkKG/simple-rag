import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function formatSessionTime(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString

  if (isNaN(date.getTime())) {
    return '更早'
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const inputDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const diffTime = today.getTime() - inputDate.getTime()
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (diffDays <= 7) return '过去7天'
  if (diffDays <= 30) return '过去30天'
  return '更早'
}


/**
 * Merge class names with Tailwind CSS
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date to string
 */
export function formatDate(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  if (isNaN(date.getTime())) {
    return '-'
  }
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format file size to readable string
 */
export function formatFileSize(size?: number): string {
  if (size === undefined || size === null) {
    return '-'
  }
  if (size < 1024) {
    return `${size} B`
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`
  }
  return `${(size / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Format time to readable string (HH:mm)
 */
export function formatTimeString(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  if (isNaN(date.getTime())) {
    return '-'
  }
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false, // 24小时制
  })
}