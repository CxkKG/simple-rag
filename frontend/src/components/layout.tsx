import { ReactNode, useState } from 'react'
import {
  BookOpen,
  Users,
  Settings,
  LayoutDashboard,
  Menu,
  X,
  FileText,
  MessageSquare,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const menuItems = [
  { icon: LayoutDashboard, label: '概览', path: '/' },
  { icon: BookOpen, label: '知识库', path: '/knowledge-bases' },
  { icon: FileText, label: '文档', path: '/documents' },
  { icon: MessageSquare, label: '问答', path: '/chat' },
  { icon: Users, label: '用户管理', path: '/users' },
  { icon: Settings, label: '系统设置', path: '/settings' },
]

interface SidebarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()

  const handleNavigation = (path: string) => {
    navigate(path)
    setIsOpen(false)
  }

  return (
    <>
      {/* 移动端遮罩 */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* 侧边栏 */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static shadow-lg lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* 侧边栏头部 */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-slate-100">
          <Link to="/" className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
              Simple RAG
            </span>
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-2 rounded-md hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* 侧边栏菜单 */}
        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div
                  className={`relative flex items-center justify-center w-5 h-5 ${
                    isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                >
                  <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                  {isActive && (
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-indigo-600" />
                  )}
                </div>
                <span
                  className={`font-medium text-sm transition-colors ${
                    isActive ? 'text-indigo-700' : 'text-slate-600 group-hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            )
          })}
        </nav>

        {/* 侧边栏底部 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 px-2">
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-slate-900 truncate">管理员</p>
              <p className="text-xs text-slate-500 truncate">admin@example.com</p>
            </div>
            <Avatar className="h-8 w-8 border border-slate-200">
              <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 text-sm font-medium">
                管
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </aside>
    </>
  )
}

interface HeaderProps {
  setIsOpen: (open: boolean) => void
}

export function Header({ setIsOpen }: HeaderProps) {
  return (
    <header className="h-16 px-6 border-b border-slate-200 bg-white flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsOpen(true)}
          className="lg:hidden p-2 rounded-md hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-xl font-semibold text-slate-900 hidden sm:block">控制台</h1>
      </div>
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" className="hidden sm:flex">
          帮助文档
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-sm font-medium text-slate-900">管理员</span>
            <span className="text-xs text-slate-500">admin</span>
          </div>
          <Avatar className="h-9 w-9 border border-slate-200">
            <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 text-sm font-medium">
              管
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <div className="flex-1 flex flex-col w-0 lg:ml-0 transition-all duration-300">
        <Header setIsOpen={setIsOpen} />

        <main className="flex-1 p-6 lg:p-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
