import { create } from 'zustand'
import { Message } from '@/types'
import { ApiService } from '@/services/api'

interface ChatStore {
  messages: Message[]
  isLoading: boolean
  error: string | null
  currentSessionId: string | null
  sessions: { id: string; title: string; kbId: string; lastName: string; updatedAt: string }[]
  selectedKnowledgeBase: string | null

  // Actions
  createSession: (kbId: string) => Promise<string>
  selectSession: (sessionId: string) => Promise<void>
  fetchSessions: () => Promise<void>
  deleteSession: (sessionId: string) => Promise<void>
  sendMessage: (content: string) => Promise<void>
  clearError: () => void
  setSelectedKnowledgeBase: (kbId: string) => void
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  error: null,
  currentSessionId: null,
  sessions: [],
  selectedKnowledgeBase: null,

  createSession: async (kbId) => {
    set({ isLoading: true, error: null })
    try {
      const response = await ApiService.chat.createSession({ kbId, userId: 'admin' })
      const sessionId = response.conversationId
      set({ currentSessionId: sessionId, selectedKnowledgeBase: kbId })
      // 创建会话后立即获取会话列表更新
      await get().fetchSessions()
      return sessionId
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create session' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  selectSession: async (sessionId) => {
    console.log('selectSession called with sessionId:', sessionId)
    set({ isLoading: true, error: null })
    try {
      // 先设置当前会话 ID
      set({ currentSessionId: sessionId })

      // 获取会话消息
      const response = await ApiService.chat.getMessages(sessionId)
      console.log('getMessages response:', response)

      // 响应格式: Message[] (直接返回消息数组)
      const messages = Array.isArray(response) ? response : []
      console.log('Setting messages:', messages)

      // 更新消息
      set({ messages })

      // 刷新会话列表以更新最后时间
      await get().fetchSessions()
    } catch (error) {
      console.error('Failed to load session:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to load session' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  fetchSessions: async () => {
    set({ isLoading: true, error: null })
    try {
      const userId = 'admin'
      const response = await ApiService.chat.listConversations(userId)
      console.log('listConversations response:', response)

      // 响应格式: {code, message, data: ChatSession[], total}
      const sessionsData = (response as any).data || []

      const sessions = sessionsData.map((session: any) => ({
        id: session.conversationId,
        title: session.title || '新会话',
        kbId: session.kbId,
        lastName: session.title || '新会话',
        updatedAt: session.lastTime || session.updateTime || new Date().toISOString(),
      }))

      set({ sessions })
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to fetch sessions' })
    } finally {
      set({ isLoading: false })
    }
  },

  deleteSession: async (sessionId) => {
    set({ isLoading: true, error: null })
    try {
      await ApiService.chat.delete(sessionId)
      // 删除后刷新会话列表
      await get().fetchSessions()

      set({
        currentSessionId: get().currentSessionId === sessionId ? null : get().currentSessionId,
      })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete session' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  sendMessage: async (content) => {
    const { currentSessionId, selectedKnowledgeBase, messages } = get()

    // 如果没有活动会话，先创建一个
    let sessionId = currentSessionId
    if (!sessionId) {
      if (!selectedKnowledgeBase) {
        throw new Error('请先选择知识库')
      }
      sessionId = await get().createSession(selectedKnowledgeBase)
    }

    set({ isLoading: true, error: null })

    // Add user message temporarily
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    }
    set({ messages: [...messages, userMessage] })

    try {
      // 使用 EventSource 接收流式响应
      const kbId = selectedKnowledgeBase!
      const streamPath = ApiService.chat.streamChat(kbId, content, sessionId)
      // 构建完整的 URL（EventSource 不支持 axios 拦截器，需要完整 URL）
      const baseURL = import.meta.env.VITE_API_BASE_URL || window.location.origin + '/api/simple-rag'
      const streamUrl = baseURL + streamPath

      // 创建完整的 AI 消息占位符
      const assistantMessageId = `assistant_${Date.now()}`
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
      }

      // 使用 ref 存储消息 ID，避免闭包问题
      let currentAssistantMessageId = assistantMessageId
      // 先添加用户消息和空的 AI 消息占位符，然后设置 isLoading = false 隐藏加载动画
      set({ messages: [...messages, userMessage, assistantMessage], isLoading: false })

      // 使用 EventSource 连接 SSE
      await new Promise<void>((resolve, reject) => {
        const eventSource = new EventSource(streamUrl)
        let accumulatedContent = ''
        let hasError = false

        // 接收会话 ID
        eventSource.addEventListener('conversationId', (event) => {
          console.log('Received conversationId:', event.data)
        })

        // 接收内容片段
        eventSource.addEventListener('content', (event) => {
          const chunk = event.data
          accumulatedContent += chunk

          // 更新消息内容 - 使用函数式更新避免闭包问题
          set((state) => {
            const newMessages = state.messages.map(msg =>
              msg.id === currentAssistantMessageId
                ? { ...msg, content: accumulatedContent }
                : msg
            )
            return { messages: newMessages }
          })
        })

        // 接收完成事件
        eventSource.addEventListener('end', () => {
          console.log('Stream completed')
          eventSource.close()
          resolve()
        })

        // 接收错误事件
        eventSource.addEventListener('error', (event: MessageEvent) => {
          console.error('Stream error:', event.data)
          hasError = true
          eventSource.close()
          reject(new Error(event.data || '流式响应失败'))
        })

        // 连接打开
        eventSource.onopen = () => {
          console.log('SSE connection opened')
        }

        // 连接错误
        eventSource.onerror = () => {
          if (!hasError) {
            eventSource.close()
            reject(new Error('SSE connection error'))
          }
        }

        // 设置超时
        const timeout = setTimeout(() => {
          eventSource.close()
          if (!hasError) {
            reject(new Error('请求超时'))
          }
        }, 60000) // 60 秒超时

        // 当完成时清除超时
        const originalClose = eventSource.close.bind(eventSource)
        eventSource.close = () => {
          clearTimeout(timeout)
          originalClose()
        }
      })

      // 发送消息后更新会话标题（如果还是默认标题）
      if (messages.length === 0) {
        const firstMessage = content.length > 20 ? content.substring(0, 20) + '...' : content
        ApiService.chat.renameSession(sessionId, firstMessage).catch(() => {})
      }
    } catch (error) {
      console.error('Send error:', error)
      set({ error: error instanceof Error ? error.message : 'Failed to send message' })
      // Remove temporary user message on error
      set({ messages: messages })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  clearError: () => set({ error: null }),
  setSelectedKnowledgeBase: (kbId) => set({ selectedKnowledgeBase: kbId }),
}))
