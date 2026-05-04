import { useReviewReminderPopup } from '@/hooks/useReviewReminderPopup'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlarmClock, BellRing, CheckCircle2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface ReviewReminderPopupProps {
  enabled?: boolean
}

export function ReviewReminderPopup({ enabled = true }: ReviewReminderPopupProps) {
  const { current, pendingCount, acking, acknowledge, dismiss } = useReviewReminderPopup({ enabled })

  const open = !!current

  const handleOpenChange = (next: boolean) => {
    if (!next && current && !acking) {
      dismiss(current.id)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BellRing className="w-5 h-5 text-education-blue-600" />
            复习提醒
            {pendingCount > 1 && (
              <Badge className="ml-2 bg-amber-100 text-amber-700 hover:bg-amber-100">
                还有 {pendingCount - 1} 条待处理
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            到了你设置的复习时间，完成后请标记已读以避免重复提醒。
          </DialogDescription>
        </DialogHeader>

        {current && (
          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs text-slate-500 mb-1">复习主题</div>
              <div className="text-base font-medium text-slate-800">
                {current.topic || '（未命名主题）'}
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-600">
              <AlarmClock className="w-4 h-4 text-education-blue-500" />
              <span>{formatDate(current.remindTime)}</span>
            </div>

            {(current.remark || current.rawText) && (
              <div>
                <div className="text-xs text-slate-500 mb-1">内容</div>
                <div className="whitespace-pre-wrap text-slate-700 bg-slate-50 border border-slate-100 rounded-md p-3">
                  {current.remark || current.rawText}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            disabled={acking}
            onClick={() => current && dismiss(current.id)}
          >
            稍后再说
          </Button>
          <Button
            disabled={acking || !current}
            onClick={() => current && acknowledge(current.id)}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            {acking ? '处理中...' : '标记已读'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ReviewReminderPopup
