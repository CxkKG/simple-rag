import { ReactNode, useState } from 'react'
import {
  BookOpen,
  Users,
  Settings,
  LayoutDashboard,
  Menu,
  X,
  FileText,
  LogOut,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthentication } from '@/hooks/useAuthentication'
import { UserRole } from '@/types'
import { MessageSquare } from 'lucide-react'

const allMenuItems = [
  { icon: LayoutDashboard, label: '概览', path: '/dashboard', role: UserRole.Admin },
  { icon: BookOpen, label: '知识库', path: '/knowledge-bases', role: UserRole.Admin },
  { icon: FileText, label: '文档', path: '/documents', role: UserRole.Admin },
  { icon: MessageSquare, label: '问答', path: '/chat', role: undefined },
  { icon: Users, label: '用户管理', path: '/users', role: UserRole.Admin },
  { icon: Settings, label: '系统设置', path: '/settings', role: UserRole.Admin },
]

interface SidebarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

export function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, hasRole, logout } = useAuthentication()

  const menuItems = allMenuItems.filter((item) => {
    if (!item.role) return true
    return hasRole(item.role)
  })

  const handleNavigation = (path: string) => {
    navigate(path)
    setIsOpen(false)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsOpen(false)}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-education-blue-100 transform transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-lg lg:shadow-none overflow-y-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-education-blue-100">
          <Link to="/chat" className="flex items-center gap-2 text-xl font-bold text-education-blue-900">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-education-blue-600 to-education-blue-500 text-white">
              <BookOpen className="h-5 w-5" />
            </div>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-education-blue-600 to-education-blue-500">
              智能课程学习助手
            </span>
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-2 rounded-md hover:bg-education-blue-50 transition-colors"
          >
            <X className="w-5 h-5 text-education-blue-600" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-gradient-to-r from-education-blue-50 to-education-green-50 text-education-blue-600'
                    : 'text-education-blue-700 hover:bg-education-blue-50 hover:text-education-blue-900'
                }`}
              >
                <div
                  className={`relative flex items-center justify-center w-5 h-5 ${
                    isActive ? 'text-education-blue-600' : 'text-education-blue-400 group-hover:text-education-blue-600'
                  }`}
                >
                  <item.icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                  {isActive && (
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-education-blue-600" />
                  )}
                </div>
                <span
                  className={`font-medium text-sm transition-colors ${
                    isActive ? 'text-education-blue-800' : 'text-education-blue-700 group-hover:text-education-blue-900'
                  }`}
                >
                  {item.label}
                </span>
              </button>
            )
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 px-2">
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium text-slate-900 truncate">{user?.username || '用户'}</p>
              <p className="text-xs text-slate-500 truncate">{hasRole(UserRole.Admin) ? '管理员' : '普通用户'}</p>
            </div>
            <Avatar className="h-8 w-8 border border-slate-200">
              <AvatarFallback className="bg-gradient-to-br from-teal-100 to-emerald-100 text-teal-600 text-sm font-medium">
                {user?.username?.substring(0, 1).toUpperCase() || '用'}
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
  const { user, logout } = useAuthentication()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <header className="h-16 px-6 border-b border-education-blue-100 bg-white flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsOpen(true)}
          className="lg:hidden p-2 rounded-md hover:bg-education-blue-50 transition-colors"
        >
          <Menu className="w-5 h-5 text-education-blue-600" />
        </button>
        <h1 className="text-xl font-semibold text-education-blue-900 hidden sm:block">学习中心</h1>
      </div>
      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Avatar className="h-9 w-9 border border-education-blue-200 cursor-pointer">
              <AvatarFallback className="bg-gradient-to-br from-education-blue-100 to-education-green-100 text-education-blue-600 text-sm font-medium">
                {user?.username?.substring(0, 1).toUpperCase() || '用'}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-white border border-education-blue-100 shadow-lg">
            <div className="px-2 py-1.5 text-sm font-medium">
              {user?.username || '用户'}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
    <div className="flex min-h-screen bg-education-blue-50">
      <Sidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      <div className="flex-1 flex flex-col w-0 lg:ml-64 transition-all duration-300">
        <Header setIsOpen={setIsOpen} />

        <main className="flex-1 p-6 lg:p-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
