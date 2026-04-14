import { ReactNode, useState } from 'react'
import {
  BookOpen,
  Users,
  Settings,
  LayoutDashboard,
  Menu,
  X,
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

const menuItems = [
  { icon: LayoutDashboard, label: '概览', path: '/' },
  { icon: BookOpen, label: '知识库管理', path: '/knowledge-bases' },
  { icon: Users, label: '用户管理', path: '/users' },
  { icon: Settings, label: '系统设置', path: '/settings' },
]

interface SidebarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const location = useLocation()

  return (
    <>
      {/* 移动端遮罩 */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 lg:hidden ${
          isOpen ? 'block' : 'hidden'
        }`}
        onClick={() => setIsOpen(false)}
      />

      {/* 侧边栏 */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-background border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <Link to="/" className="text-xl font-bold">
            Simple RAG
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-2 rounded-md hover:bg-accent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-accent'
                }`}
                onClick={() => setIsOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}

interface HeaderProps {
  setIsOpen: (open: boolean) => void
}

export function Header({ setIsOpen }: HeaderProps) {
  return (
    <header className="h-16 px-6 border-b flex items-center justify-between bg-background sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsOpen(true)}
          className="lg:hidden p-2 rounded-md hover:bg-accent"
        >
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-semibold">控制台</h1>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">管理员</span>
        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
          管
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

      <div className="flex-1 flex flex-col lg:ml-64 transition-all duration-300">
        <Header setIsOpen={setIsOpen} />

        <main className="flex-1 p-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
