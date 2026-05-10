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
  DialogDescription,
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
  Search,
  BookMarked,
  AlarmClock,
  Globe,
  Edit3,
  Check,
} from 'lucide-react'
import { formatTimeString, formatSessionTime } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'
import { RawFileViewer } from '@/features/document/RawFileViewer'
import { ContextSource } from '@/types'
import { FileText } from 'lucide-react'

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
    searchResults,
    isSearching,
    webSearchEnabled,
    createSession,
    selectSession,
    fetchSessions,
    deleteSession,
    sendMessage,
    clearError,
    setSelectedKnowledgeBase,
    searchConversations,
    clearSearch,
    setWebSearchEnabled,
    summarizeTitle,
    renameSession,
  } = useChatStore()
  const { knowledgeBases, fetchKnowledgeBases } = useKnowledgeBaseStore()

  const [inputValue, setInputValue] = useState('')
  const [isSessionsOpen, setIsSessionsOpen] = useState(true)
  const [isKBSelectOpen, setIsKBSelectOpen] = useState(false)
  const [localSearchKeyword, setLocalSearchKeyword] = useState('')
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [previewDocId, setPreviewDocId] = useState<string | null>(null)
  const [previewDocName, setPreviewDocName] = useState<string>('')
  const [previewFileType, setPreviewFileType] = useState<string | undefined>(undefined)
  const [renameSessionId, setRenameSessionId] = useState<string | null>(null)
  const [renameTitle, setRenameTitle] = useState('')
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false)

  const handleOpenPreview = (source: ContextSource) => {
    if (!source.docId) return
    setPreviewDocId(source.docId)
    setPreviewDocName(source.docName || '知识库文档')
    setPreviewFileType(source.fileType)
  }

  const handleCitationClick = (source: ContextSource) => {
    if (source.type === 'WEB_SEARCH') {
      if (source.url) window.open(source.url, '_blank', 'noopener,noreferrer')
      return
    }
    if (source.docId) {
      handleOpenPreview(source)
    }
  }

  const handleClosePreview = () => {
    setPreviewDocId(null)
  }

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

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchKeyword(localSearchKeyword)
    }, 300)
    return () => clearTimeout(timer)
  }, [localSearchKeyword])

  useEffect(() => {
    if (debouncedSearchKeyword.trim()) {
      searchConversations(debouncedSearchKeyword)
    } else {
      clearSearch()
    }
  }, [debouncedSearchKeyword, searchConversations, clearSearch])

  const displayedSessions = searchResults !== null ? searchResults : sessions

  const handleSearchChange = (value: string) => {
    setLocalSearchKeyword(value)
  }

  const handleClearSearch = () => {
    setLocalSearchKeyword('')
    clearSearch()
  }

  const handleSend = async () => {
    if (!inputValue.trim()) return

    try {
      // 如果没有活动会话，先创建一个
      if (!currentSessionId && selectedKnowledgeBase) {
        const sessionId = await createSession(selectedKnowledgeBase)
        await selectSession(sessionId)
        // 为新创建的会话生成AI标题
        try {
          await summarizeTitle(sessionId)
        } catch (err) {
          console.warn('Failed to generate session title for new session:', err)
        }
      } else if (!currentSessionId && !selectedKnowledgeBase) {
        alert('请先选择知识库')
        return
      }

      await sendMessage(inputValue)
      // 尝试为新会话生成AI标题
      if (currentSessionId) {
        try {
          await summarizeTitle(currentSessionId)
        } catch (err) {
          console.warn('Failed to generate session title:', err)
        }
      }
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

  const handleRenameSession = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      setRenameSessionId(sessionId)
      setRenameTitle(session.title)
      setIsRenameDialogOpen(true)
    }
  }

  const handleSelectSession = (sessionId: string, closeSidebar?: boolean) => {
    selectSession(sessionId).catch(console.error)
    // 尝试为选中的会话生成AI标题（如果还是默认标题）
    const session = sessions.find(s => s.id === sessionId)
    if (session && (session.title === '新会话' || session.title === 'New Session')) {
      try {
        summarizeTitle(sessionId).catch(console.error)
      } catch (err) {
        console.warn('Failed to generate session title for selected session:', err)
      }
    }
    if (searchResults !== null) {
      handleClearSearch()
    }
    if (closeSidebar) {
      setIsSessionsOpen(false)
    }
  }

  const formatTime = (dateStr: string) => {
    return formatTimeString(dateStr)
  }

  // 搜索输入框组件
  const searchInput = (
    <div className="px-4 pb-2 flex-shrink-0">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-education-blue-400" />
        <Input
          placeholder="搜索会话..."
          value={localSearchKeyword}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-10 pr-8 h-9 bg-white border-education-blue-200"
        />
        {localSearchKeyword && (
          <button
            onClick={handleClearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2"
          >
            <X className="h-4 w-4 text-education-blue-400 hover:text-education-blue-600" />
          </button>
        )}
      </div>
    </div>
  )

  // 会话列表渲染
  const renderSessionList = (onSelect: (sessionId: string) => void) => {
    if (isSearching) {
      return (
        <div className="flex items-center justify-center py-8 text-education-blue-500 text-sm">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-education-blue-600 mr-2"></div>
          搜索中...
        </div>
      )
    }

    if (displayedSessions.length === 0) {
      return (
        <div className="text-center py-8 text-education-blue-500 text-sm">
          {searchResults !== null ? '未找到匹配的会话' : '暂无会话记录'}
        </div>
      )
    }

    // 按时间段分组
    const groupedSessions: Record<string, typeof displayedSessions> = {
      '今天': [],
      '昨天': [],
      '过去7天': [],
      '过去30天': [],
      '更早': [],
    }

    displayedSessions.forEach(session => {
      const timeLabel = formatSessionTime(session.updatedAt)
      if (groupedSessions[timeLabel]) {
        groupedSessions[timeLabel].push(session)
      } else {
        groupedSessions['更早'].push(session)
      }
    })

    // 渲染分组
    return Object.entries(groupedSessions).flatMap(([label, sessions]) => {
      if (sessions.length === 0) return []
      
      return [
        <div key={label} className="px-3 py-2 text-xs font-semibold text-education-blue-500 uppercase tracking-wide">
          {label}
        </div>,
        ...sessions.map((session) => (
          <div
            key={session.id}
            onClick={() => onSelect(session.id)}
            className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${currentSessionId === session.id ? 'bg-education-blue-50 border border-education-blue-200' : 'hover:bg-education-blue-100 border border-transparent'}`}
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${currentSessionId === session.id ? 'bg-education-blue-600' : 'bg-education-blue-300'}`}>
              <ChatBubble className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-education-blue-900 truncate">{session.title}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="iconSm"
                onClick={(e) => handleRenameSession(e, session.id)}
                className="opacity-0 group-hover:opacity-100 h-8 w-8 text-education-blue-400 hover:text-education-green-600"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={(e) => handleDeleteSession(e, session.id)}
                className="opacity-0 group-hover:opacity-100 h-8 w-8 text-education-blue-400 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))
      ]
    })
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
        {isSessionsOpen && searchInput}
        <div className="p-4 flex-shrink-0">
          <Button onClick={handleCreateSession} className="w-full bg-gradient-to-r from-education-blue-600 to-education-blue-500 hover:from-education-blue-700 hover:to-education-blue-600 mb-4">
            <Plus className="w-4 h-4 mr-2" />
            新建会话
          </Button>
        </div>
        <div className="px-4 pb-4 space-y-2 overflow-y-auto flex-1 min-h-0 hide-scrollbar">
          {renderSessionList((id) => handleSelectSession(id))}
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
        {isSessionsOpen && searchInput}
        <div className="p-4 flex-shrink-0">
          <Button onClick={handleCreateSession} className="w-full bg-gradient-to-r from-education-blue-600 to-education-blue-500 hover:from-education-blue-700 hover:to-education-blue-600 mb-4">
            <Plus className="w-4 h-4 mr-2" />
            新建会话
          </Button>
        </div>
        <div className="px-4 pb-4 space-y-2 overflow-y-auto flex-1 min-h-0 hide-scrollbar">
          {renderSessionList((id) => handleSelectSession(id, true))}
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
                  <ArrowLeft className="w-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Settings className="w-4 w-4" />
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
                <DropdownMenuItem onClick={() => navigate('/learning-records')}>
                  <BookMarked className="w-4 h-4 mr-2" />
                  学习记录
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/review-reminders')}>
                  <AlarmClock className="w-4 h-4 mr-2" />
                  复习提醒
                </DropdownMenuItem>
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
                <p className="text-education-blue-600 max-w-md mx-auto">
                  选择一个课程资源库，开始向 AI 提问吧。我会根据资源库中的内容为您提供答案。
                </p>
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
                      <div className="prose prose-education-blue max-w-none leading-relaxed">
                        <MarkdownRenderer
                          content={message.content}
                          sources={message.role === 'assistant' ? message.contextSources : undefined}
                          onCitationClick={handleCitationClick}
                        />
                      </div>
                    </div>
                    {message.role === 'assistant' && message.contextSources && message.contextSources.length > 0 && message.contextSources.some(s => s.cited !== false) && (
                      <div className="mt-3 rounded-xl border border-education-blue-100 bg-white/70 px-4 py-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-education-blue-700">
                          参考来源 · References
                        </p>
                        <ol className="space-y-1.5">
                          {message.contextSources.map((src, idx) => {
                            // 仅展示真正被回答引用的条目；保持原始下标作为 [N] 编号，确保与正文角标一致。
                            // 旧数据无 cited 字段时按已引用处理（向后兼容）。
                            if (src.cited === false) return null
                            const key = `${message.id}-src-${idx}`
                            const num = idx + 1
                            if (src.type === 'KNOWLEDGE_BASE') {
                              const label = src.docName || src.docId || `知识片段 ${num}`
                              return (
                                <li key={key} className="flex items-start gap-2 text-xs leading-relaxed text-education-blue-800">
                                  <span className="mt-[1px] inline-flex h-5 min-w-[22px] items-center justify-center rounded-full bg-education-blue-100 px-1.5 text-[10px] font-semibold text-education-blue-700">
                                    [{num}]
                                  </span>
                                  <FileText className="mt-[2px] h-3.5 w-3.5 shrink-0 text-education-blue-500" />
                                  {src.docId ? (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenPreview(src)}
                                      className="flex-1 truncate text-left text-education-blue-700 underline-offset-2 hover:underline"
                                      title={label}
                                    >
                                      {label}
                                      {typeof src.score === 'number' && src.score > 0 && (
                                        <span className="ml-2 text-[10px] text-education-blue-400">
                                          相关度 {src.score.toFixed(2)}
                                        </span>
                                      )}
                                    </button>
                                  ) : (
                                    <span className="flex-1 truncate">{label}</span>
                                  )}
                                </li>
                              )
                            }
                            if (src.type === 'WEB_SEARCH') {
                              const label = src.title || src.url || `网页 ${num}`
                              return (
                                <li key={key} className="flex items-start gap-2 text-xs leading-relaxed text-education-blue-800">
                                  <span className="mt-[1px] inline-flex h-5 min-w-[22px] items-center justify-center rounded-full bg-education-blue-100 px-1.5 text-[10px] font-semibold text-education-blue-700">
                                    [{num}]
                                  </span>
                                  <Globe className="mt-[2px] h-3.5 w-3.5 shrink-0 text-education-blue-500" />
                                  {src.url ? (
                                    <a
                                      href={src.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex-1 min-w-0 text-education-blue-700 underline-offset-2 hover:underline"
                                      title={label}
                                    >
                                      <span className="block truncate font-medium">{label}</span>
                                      {src.url && src.url !== label && (
                                        <span className="block truncate text-[10px] text-education-blue-400">
                                          {src.url}
                                        </span>
                                      )}
                                    </a>
                                  ) : (
                                    <span className="flex-1 truncate">{label}</span>
                                  )}
                                </li>
                              )
                            }
                            return null
                          })}
                        </ol>
                      </div>
                    )}
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
          <div className="max-w-4xl mx-auto">
            {/* 工具栏：联网搜索开关 */}
            <div className="flex items-center gap-3 mb-2">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={webSearchEnabled}
                  onChange={() => setWebSearchEnabled(!webSearchEnabled)}
                />
                <div className="relative w-11 h-6 bg-education-blue-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-education-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-education-blue-600"></div>
                <span className="ml-2 text-sm font-medium text-education-blue-700">联网搜索</span>
              </label>
              {webSearchEnabled && (
                <span className="text-xs text-education-blue-500">
                  知识库未命中时将自动调用联网搜索
                </span>
              )}
            </div>

            <div className="relative">
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
                className="h-12 pl-5 pr-14 rounded-full border-education-blue-200 focus:ring-2 focus:ring-education-blue-500"
                disabled={chatIsLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!inputValue.trim() || chatIsLoading}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 h-10 w-10 bg-gradient-to-r from-education-blue-600 to-education-blue-500 hover:from-education-blue-700 hover:to-education-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-full shadow-sm transition-transform hover:scale-105 active:scale-95"
              >
                <Send className="w-6 h-6" style={{ marginLeft: '-1px', marginTop: '-1px' }} />
              </Button>
            </div>
          </div>
          <p className="text-center text-xs text-education-blue-500 mt-3">
            AI 生成的内容可能存在错误，请注意核实。
          </p>
        </div>
      </div>
    </div>

    <Dialog open={!!previewDocId} onOpenChange={(open) => { if (!open) handleClosePreview() }}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="truncate">{previewDocName || '文档预览'}</DialogTitle>
        </DialogHeader>
        <RawFileViewer
          docId={previewDocId}
          docName={previewDocName}
          fileType={previewFileType}
        />
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClosePreview}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* 重命名会话对话框 */}
    <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重命名会话</DialogTitle>
          <DialogDescription>请输入新的会话标题</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            id="title"
            value={renameTitle}
            onChange={(e) => setRenameTitle(e.target.value)}
            className="col-span-3"
            placeholder="请输入会话标题"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
            取消
          </Button>
          <Button
            onClick={async () => {
              if (renameSessionId && renameTitle.trim()) {
                try {
                  await renameSession(renameSessionId, renameTitle.trim())
                  setIsRenameDialogOpen(false)
                } catch (error) {
                  console.error('Failed to rename session:', error)
                  alert('重命名失败: ' + (error instanceof Error ? error.message : '未知错误'))
                }
              }
            }}
          >
            确认
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  )
}
