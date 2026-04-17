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
      // Call API
      const response = await ApiService.chat.chat(sessionId, content)
      const answer = response.answer

      // Add assistant message
      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: answer,
        createdAt: new Date().toISOString(),
      }
      set({ messages: [...messages, userMessage, assistantMessage] })

      // 发送消息后更新会话标题（如果还是默认标题）
      if (messages.length === 0) {
        const firstMessage = content.length > 20 ? content.substring(0, 20) + '...' : content
        ApiService.chat.renameSession(sessionId, firstMessage).catch(() => {})
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to send message' })
      // Remove temporary user message on error
      set({ messages: messages })
    } finally {
      set({ isLoading: false })
    }
  },

  clearError: () => set({ error: null }),
  setSelectedKnowledgeBase: (kbId) => set({ selectedKnowledgeBase: kbId }),
}))
