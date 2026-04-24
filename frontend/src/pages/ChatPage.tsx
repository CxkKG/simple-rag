import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthentication } from '@/hooks/useAuthentication'
import { useChatStore } from '@/stores/chat'
import { useKnowledgeBaseStore } from '@/stores/knowledgeBase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Helmet } from 'react-helmet-async'
import { UserRole } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  MessageSquare as ChatBubble,
  Send,
  Plus,
  Trash2,
  Settings,
  BookOpen,
  MoreVertical,
  X,
  User,
  Bot,
  ChevronDown,
  LogOut,
  ArrowLeft,
} from 'lucide-react'
import { formatTimeString } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default function ChatPage() {
  const navigate = useNavigate()
  const { user, isAuthenticated, isLoading, hasRole, logout } = useAuthentication()
  const {
    messages,
    isLoading: chatIsLoading,
    error,
    currentSessionId,
    sessions,
    selectedKnowledgeBase,
    createSession,
    selectSession,
    fetchSessions,
    deleteSession,
    sendMessage,
    clearError,
    setSelectedKnowledgeBase,
  } = useChatStore()
  const { knowledgeBases, fetchKnowledgeBases } = useKnowledgeBaseStore()

  const [inputValue, setInputValue] = useState('')
  const [isSessionsOpen, setIsSessionsOpen] = useState(true)
  const [isKBSelectOpen, setIsKBSelectOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    if (user && knowledgeBases.length === 0) {
      fetchKnowledgeBases().finally(() => setPageLoading(false))
    } else {
      setPageLoading(false)
    }
  }, [user, fetchKnowledgeBases, knowledgeBases.length])

  useEffect(() => {
    if (user) {
      fetchSessions().catch(console.error)
    }
  }, [user, fetchSessions])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatIsLoading])

  useEffect(() => {
    if (knowledgeBases.length > 0 && !selectedKnowledgeBase) {
      setSelectedKnowledgeBase(knowledgeBases[0].id)
    }
  }, [knowledgeBases, selectedKnowledgeBase, setSelectedKnowledgeBase])

  const handleSend = async () => {
    if (!inputValue.trim()) return

    try {
      // 如果没有活动会话，先创建一个
      if (!currentSessionId && selectedKnowledgeBase) {
        const sessionId = await createSession(selectedKnowledgeBase)
        await selectSession(sessionId)
      } else if (!currentSessionId && !selectedKnowledgeBase) {
        alert('请先选择知识库')
        return
      }

      await sendMessage(inputValue)
      setInputValue('')
      inputRef.current?.focus()
    } catch (err) {
      console.error('Send error:', err)
      alert('发送失败: ' + (err instanceof Error ? err.message : '未知错误'))
    }
  }

  const handleCreateSession = async () => {
    if (!selectedKnowledgeBase) {
      alert('请先选择知识库')
      return
    }
    const sessionId = await createSession(selectedKnowledgeBase)
    await selectSession(sessionId)
    setIsSessionsOpen(false)
  }

  const handleDeleteSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    if (window.confirm('确定要删除这个会话吗？')) {
      deleteSession(sessionId).catch(console.error)
    }
  }

  const formatTime = (dateStr: string) => {
    return formatTimeString(dateStr)
  }

  if (isLoading || pageLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <>
      <Helmet>
        <title>智能课程助手</title>
      </Helmet>
      <div className="flex h-screen bg-education-blue-50 overflow-hidden">
      {/* 会话侧边栏 - 桌面端可收起，移动端抽屉式 */}
      <div className={`hidden md:flex bg-education-blue-50 border-r border-education-blue-100 flex-col transition-all duration-300 ${isSessionsOpen ? 'w-80' : 'w-0'}`}>
        <div className="p-4 border-b border-education-blue-100 flex items-center justify-between flex-shrink-0">
          <h2 className="font-semibold text-education-blue-900 overflow-hidden">会话历史</h2>
          <Button variant="ghost" size="iconSm" onClick={() => setIsSessionsOpen(false)} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 flex-shrink-0">
          <Button onClick={handleCreateSession} className="w-full bg-gradient-to-r from-education-blue-600 to-education-blue-500 hover:from-education-blue-700 hover:to-education-blue-600 mb-4">
            <Plus className="w-4 h-4 mr-2" />
            新建会话
          </Button>
        </div>
        <div className="px-4 pb-4 space-y-2 overflow-y-auto flex-1 min-h-0 hide-scrollbar">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-education-blue-500 text-sm">
              暂无会话记录
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => {
                  selectSession(session.id).catch(console.error)
                }}
                className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${currentSessionId === session.id ? 'bg-education-blue-50 border border-education-blue-200' : 'hover:bg-education-blue-100 border border-transparent'}`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${currentSessionId === session.id ? 'bg-education-blue-600' : 'bg-education-blue-300'}`}>
                  <ChatBubble className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-education-blue-900 truncate">{session.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-education-blue-600 truncate">{formatTimeString(session.updatedAt)}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={(e) => handleDeleteSession(e, session.id)}
                  className="opacity-0 group-hover:opacity-100 h-8 w-8 text-education-blue-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 移动端会话侧边栏 - 抽屉式 */}
      <div className={`md:hidden fixed inset-0 bg-black/50 z-30 ${isSessionsOpen ? 'block' : 'hidden'}`} onClick={() => setIsSessionsOpen(false)} />
      <div className={`md:hidden fixed left-0 top-0 h-full w-80 bg-education-blue-50 border-r border-education-blue-100 z-40 transform transition-transform duration-300 ${isSessionsOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        <div className="p-4 border-b border-education-blue-100 flex items-center justify-between flex-shrink-0">
          <h2 className="font-semibold text-education-blue-900">会话历史</h2>
          <Button variant="ghost" size="iconSm" onClick={() => setIsSessionsOpen(false)} className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-4 flex-shrink-0">
          <Button onClick={handleCreateSession} className="w-full bg-gradient-to-r from-education-blue-600 to-education-blue-500 hover:from-education-blue-700 hover:to-education-blue-600 mb-4">
            <Plus className="w-4 h-4 mr-2" />
            新建会话
          </Button>
        </div>
        <div className="px-4 pb-4 space-y-2 overflow-y-auto flex-1 min-h-0 hide-scrollbar">
          {sessions.length === 0 ? (
            <div className="text-center py-8 text-education-blue-500 text-sm">
              暂无会话记录
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => {
                  selectSession(session.id).catch(console.error)
                  setIsSessionsOpen(false)
                }}
                className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${currentSessionId === session.id ? 'bg-education-blue-50 border border-education-blue-200' : 'hover:bg-education-blue-100 border border-transparent'}`}
              >
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${currentSessionId === session.id ? 'bg-education-blue-600' : 'bg-education-blue-300'}`}>
                  <ChatBubble className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-education-blue-900 truncate">{session.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-education-blue-600 truncate">{formatTimeString(session.updatedAt)}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={(e) => handleDeleteSession(e, session.id)}
                  className="opacity-0 group-hover:opacity-100 h-8 w-8 text-education-blue-400 hover:text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 flex flex-col h-full">
        {/* 顶部导航栏 */}
        <div className="h-16 border-b border-education-blue-100 bg-white flex items-center justify-between px-6 flex-shrink-0">
          {/* 移动端：显示菜单按钮 */}
          <Button variant="ghost" size="icon" onClick={() => setIsSessionsOpen(true)} className="md:hidden h-8 w-8">
            <MoreVertical className="h-5 w-5" />
          </Button>

          {/* 桌面端：显示知识库选择和菜单按钮 */}
          <div className="hidden md:flex items-center gap-3 w-full">
            <Button variant="ghost" size="icon" onClick={() => setIsSessionsOpen(!isSessionsOpen)} className="h-8 w-8">
              <MoreVertical className="h-5 w-5" />
            </Button>
            <div className="flex-1 max-w-md">
              <div className="relative">
              <Button
                variant="outline"
                onClick={() => setIsKBSelectOpen(!isKBSelectOpen)}
                className="h-9 bg-education-blue-50 hover:bg-education-blue-100"
              >
                {selectedKnowledgeBase
                  ? knowledgeBases.find(kb => kb.id === selectedKnowledgeBase)?.name || '未知知识库'
                  : '选择课程资源库'}
                <ChevronDown className="w-4 h-4 ml-2 text-education-blue-400" />
              </Button>
              {isKBSelectOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsKBSelectOpen(false)} />
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-education-blue-100 z-20 max-h-80 overflow-y-auto">
                    {knowledgeBases.map((kb) => (
                      <div
                        key={kb.id}
                        onClick={() => {
                          setSelectedKnowledgeBase(kb.id)
                          setIsKBSelectOpen(false)
                          if (messages.length === 0) {
                            createSession(kb.id).then(setSelectedKnowledgeBase).catch(console.error)
                          }
                        }}
                        className="px-4 py-3 hover:bg-education-blue-50 cursor-pointer border-b border-education-blue-100 last:border-0"
                      >
                        <div className="font-medium text-sm text-education-blue-900">{kb.name}</div>
                        <div className="text-xs text-education-blue-600 mt-1">{kb.embeddingModel}</div>
                      </div>
                    ))}
                    {knowledgeBases.length === 0 && (
                      <div className="px-4 py-3 text-center text-sm text-education-blue-500">
                        暂无课程资源库，请先创建资源库
                      </div>
                    )}
                  </div>
                </>
              )}
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            {hasRole(UserRole.Admin) && (
              <>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/dashboard')}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      进入后台管理
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600 text-sm font-medium">
                      {user.username.substring(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white border border-education-blue-100 shadow-lg">
                <div className="px-2 py-1.5 text-sm font-medium">
                  {user.username}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => {
                  await logout()
                  navigate('/login')
                }}>
                  <LogOut className="w-4 h-4 mr-2" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 消息列表 - 可滚动区域 */}
        <div className="flex-1 overflow-y-auto p-6 bg-education-blue-50 hide-scrollbar">
          <div className="max-w-3xl mx-auto space-y-6 pb-4">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-education-blue-100 mb-6">
                  <BookOpen className="w-8 h-8 text-education-blue-600" />
                </div>
                <h2 className="text-2xl font-semibold text-education-blue-900 mb-2">开始新的对话</h2>
                <p className="text-education-blue-600 mb-8 max-w-md mx-auto">
                  选择一个课程资源库，开始向 AI 提问吧。我会根据资源库中的内容为您提供答案。
                </p>
                {knowledgeBases.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {knowledgeBases.slice(0, 3).map((kb) => (
                      <Button
                        key={kb.id}
                        variant="outline"
                        onClick={() => {
                          setSelectedKnowledgeBase(kb.id)
                          createSession(kb.id).catch(console.error)
                        }}
                        className="border-education-blue-200 hover:bg-education-blue-50"
                      >
                        <BookOpen className="w-4 h-4 mr-2" />
                        {kb.name}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${message.role === 'user' ? 'bg-education-blue-200' : 'bg-education-blue-100'}`}>
                    {message.role === 'user' ? <User className="w-4 h-4 text-education-blue-600" /> : <Bot className="w-4 h-4 text-education-blue-600" />}
                  </div>
                  <div className={`flex-1 max-w-[calc(100%-48px)] ${message.role === 'user' ? 'text-right' : ''}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-education-blue-600">
                        {message.role === 'user' ? '您' : 'AI 学习助手'}
                      </span>
                      <span className="text-xs text-education-blue-500">
                        {formatTimeString(message.createdAt || '')}
                      </span>
                    </div>
                    <div className={`p-4 rounded-2xl max-w-full ${
                      message.role === 'user'
                        ? 'bg-education-blue-600 text-white rounded-tr-none'
                        : 'bg-education-blue-50 text-education-blue-900 rounded-tl-none border border-education-blue-100'
                    }`}>
                      <div className="prose prose-education-blue max-w-none leading-relaxed whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
            {chatIsLoading && (
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-education-blue-100 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-education-blue-600" />
                </div>
                <div className="flex items-center gap-1 p-4 bg-education-blue-50 rounded-2xl rounded-tl-none border border-education-blue-100">
                  <div className="w-2 h-2 bg-education-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-education-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-education-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 输入区域 */}
        <div className="border-t border-education-blue-100 bg-white p-4 flex-shrink-0">
          <div className="max-w-3xl mx-auto relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="输入您的问题..."
              className="h-12 pl-4 pr-12"
              disabled={chatIsLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || chatIsLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-gradient-to-r from-education-blue-600 to-education-blue-500 hover:from-education-blue-700 hover:to-education-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-full shadow-sm"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-center text-xs text-education-blue-500 mt-3">
            AI 生成的内容可能存在错误，请注意核实。
          </p>
        </div>
      </div>
    </div>
    </>
  )
}
