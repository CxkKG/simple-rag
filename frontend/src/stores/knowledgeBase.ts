import { create } from 'zustand'
import { KnowledgeBase } from '@/types'
import { ApiService } from '@/services/api'

interface KnowledgeBaseStore {
  knowledgeBases: KnowledgeBase[]
  selectedKnowledgeBase: KnowledgeBase | null
  isLoading: boolean
  error: string | null
  total: number

  // Actions
  fetchKnowledgeBases: (pageNum?: number, pageSize?: number) => Promise<void>
  fetchKnowledgeBaseById: (id: string) => Promise<void>
  createKnowledgeBase: (data: Pick<KnowledgeBase, 'name' | 'embeddingModel'> & { createdBy?: string }) => Promise<void>
  updateKnowledgeBase: (id: string, data: Pick<KnowledgeBase, 'name'>) => Promise<void>
  deleteKnowledgeBase: (id: string) => Promise<void>
  setSelectedKnowledgeBase: (kb: KnowledgeBase | null) => void
  clearError: () => void
}

const normalizeKnowledgeBase = (kb: any): KnowledgeBase => ({
  id: kb.id || '',
  name: kb.name || '',
  embeddingModel: kb.embeddingModel || '',
  collectionName: kb.collectionName || '',
  documentCount: kb.documentCount ?? 0,
  createdBy: kb.createdBy || '',
  createdAt: kb.createTime || kb.createdAt || new Date().toISOString(),
  updatedAt: kb.updateTime || kb.updatedAt || new Date().toISOString(),
})

export const useKnowledgeBaseStore = create<KnowledgeBaseStore>((set, get) => ({
  knowledgeBases: [],
  selectedKnowledgeBase: null,
  isLoading: false,
  error: null,
  total: 0,

  fetchKnowledgeBases: async (pageNum = 1, pageSize = 10) => {
    set({ isLoading: true, error: null })
    try {
      const response = await ApiService.knowledgeBase.list(pageNum, pageSize)
      set({
        knowledgeBases: (response.data || []).map(normalizeKnowledgeBase),
        total: response.total || 0
      })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch knowledge bases' })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchKnowledgeBaseById: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await ApiService.knowledgeBase.getById(id)
      set({ selectedKnowledgeBase: normalizeKnowledgeBase(response.data) })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch knowledge base' })
    } finally {
      set({ isLoading: false })
    }
  },

  createKnowledgeBase: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await ApiService.knowledgeBase.create(data)
      set({ knowledgeBases: [...get().knowledgeBases, normalizeKnowledgeBase(response.data)] })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create knowledge base' })
    } finally {
      set({ isLoading: false })
    }
  },

  updateKnowledgeBase: async (id, data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await ApiService.knowledgeBase.update(id, data)
      set({
        knowledgeBases: get().knowledgeBases.map((kb) =>
          kb.id === id ? normalizeKnowledgeBase(response.data) : kb
        ),
        selectedKnowledgeBase: normalizeKnowledgeBase(response.data),
      })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update knowledge base' })
    } finally {
      set({ isLoading: false })
    }
  },

  deleteKnowledgeBase: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await ApiService.knowledgeBase.delete(id)
      set({
        knowledgeBases: get().knowledgeBases.filter((kb) => kb.id !== id),
        selectedKnowledgeBase: null,
      })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete knowledge base' })
    } finally {
      set({ isLoading: false })
    }
  },

  setSelectedKnowledgeBase: (kb) => set({ selectedKnowledgeBase: kb }),
  clearError: () => set({ error: null }),
}))
