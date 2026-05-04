import { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StandalonePageProps {
  title: string
  description?: string
  icon?: ReactNode
  actions?: ReactNode
  backTo?: string
  children: ReactNode
}

export function StandalonePage({
  title,
  description,
  icon,
  actions,
  backTo = '/chat',
  children,
}: StandalonePageProps) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-education-blue-50 flex flex-col">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-education-blue-100 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center gap-3 px-4 md:px-6 h-14">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => navigate(backTo)}
            aria-label="返回"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            {icon}
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-education-blue-900 truncate">{title}</h1>
              {description && (
                <p className="text-xs text-education-blue-500 truncate hidden sm:block">{description}</p>
              )}
            </div>
          </div>
          {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
        </div>
      </header>
      <main className="flex-1 overflow-x-hidden">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">{children}</div>
      </main>
    </div>
  )
}
