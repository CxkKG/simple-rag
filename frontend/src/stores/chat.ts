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
      return sessionId
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create session' })
      throw error
    } finally {
      set({ isLoading: false })
    }
  },

  selectSession: async (sessionId) => {
    set({ isLoading: true, error: null })
    try {
      const response = await ApiService.chat.getMessages(sessionId)
      set({ currentSessionId: sessionId, messages: response || [] })
    } catch (error) {
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
      const sessions = (response.data || []).map((session: any) => ({
        id: session.conversationId,
        title: session.title || '新会话',
        kbId: session.kbId,
        lastName: session.title || '新会话',
        updatedAt: session.lastTime || session.updateTime || new Date().toISOString(),
      }))
      set({ sessions })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch sessions' })
    } finally {
      set({ isLoading: false })
    }
  },

  deleteSession: async (sessionId) => {
    set({ isLoading: true, error: null })
    try {
      await ApiService.chat.delete(sessionId)
      set({
        sessions: get().sessions.filter((s) => s.id !== sessionId),
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
    if (!currentSessionId) {
      throw new Error('No active session')
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
      //.Call API
      const response = await ApiService.chat.chat(currentSessionId, content)
      const answer = response.answer

      // Add assistant message
      const assistantMessage: Message = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: answer,
        createdAt: new Date().toISOString(),
      }
      set({ messages: [...messages, userMessage, assistantMessage] })
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
