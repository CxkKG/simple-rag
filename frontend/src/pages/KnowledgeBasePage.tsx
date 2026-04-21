import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthentication } from '@/hooks/useAuthentication'
import { KnowledgeBaseTable } from '@/features/knowledge-base/KnowledgeBaseTable'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { KnowledgeBaseDialog } from '@/features/knowledge-base/KnowledgeBaseDialog'

export default function KnowledgeBasePage() {
  const { user } = useAuthentication()
  const navigate = useNavigate()
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-education-blue-900">课程资源库管理</h2>
          <p className="text-muted-foreground">管理您的课程资源库和学习文档</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-to-r from-education-blue-600 to-education-blue-500 hover:from-education-blue-700 hover:to-education-blue-600">
          <Plus className="w-4 h-4 mr-2" />
          创建课程资源库
        </Button>
      </div>

      <KnowledgeBaseTable />

      <KnowledgeBaseDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </div>
  )
}
