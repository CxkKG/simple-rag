import { useMemo, useState } from 'react'

export interface ResizableColumnConfig {
  key: string
  width: number
  minWidth?: number
  maxWidth?: number
}

export function useResizableColumns(columns: ResizableColumnConfig[]) {
  const [widths, setWidths] = useState<Record<string, number>>(() =>
    columns.reduce<Record<string, number>>((acc, column) => {
      acc[column.key] = column.width
      return acc
    }, {})
  )

  const configMap = useMemo(
    () => new Map(columns.map((column) => [column.key, column])),
    [columns]
  )

  const totalWidth = columns.reduce((sum, column) => sum + (widths[column.key] || column.width), 0)

  const getColumnStyle = (key: string) => {
    const width = widths[key] || configMap.get(key)?.width || 120
    return { width, minWidth: width, maxWidth: width }
  }

  const getTableStyle = () => ({
    tableLayout: 'fixed' as const,
    minWidth: totalWidth,
  })

  const getResizeHandleProps = (key: string) => ({
    onMouseDown: (event: React.MouseEvent<HTMLSpanElement>) => {
      event.preventDefault()
      event.stopPropagation()

      const startX = event.clientX
      const startWidth = widths[key] || configMap.get(key)?.width || 120
      const column = configMap.get(key)
      const minWidth = column?.minWidth ?? 80
      const maxWidth = column?.maxWidth ?? 640

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const nextWidth = Math.min(maxWidth, Math.max(minWidth, startWidth + moveEvent.clientX - startX))
        setWidths((current) => ({ ...current, [key]: nextWidth }))
      }

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    className: 'absolute right-0 top-0 h-full w-2 cursor-col-resize touch-none select-none after:absolute after:right-0 after:top-2 after:h-8 after:w-px after:bg-education-blue-200 after:opacity-0 hover:after:opacity-100 group-hover:after:opacity-100',
  })

  return {
    columns,
    widths,
    getColumnStyle,
    getTableStyle,
    getResizeHandleProps,
  }
}
