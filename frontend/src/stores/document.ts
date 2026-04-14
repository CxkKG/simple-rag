import { create } from 'zustand'
import { Document } from '@/types'
import { ApiService } from '@/services/api'

interface DocumentStore {
  documents: Document[]
  selectedDocument: Document | null
  isLoading: boolean
  error: string | null
  total: number

  // Actions
  fetchDocuments: (kbId: string, pageNum?: number, pageSize?: number) => Promise<void>
  fetchDocumentById: (id: string) => Promise<void>
  uploadDocument: (kbId: string, file: File, docName?: string) => Promise<void>
  deleteDocument: (id: string) => Promise<void>
  triggerChunking: (id: string) => Promise<void>
  setSelectedDocument: (doc: Document | null) => void
  clearError: () => void
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  documents: [],
  selectedDocument: null,
  isLoading: false,
  error: null,
  total: 0,

  fetchDocuments: async (kbId, pageNum = 1, pageSize = 10) => {
    set({ isLoading: true, error: null })
    try {
      const response = await ApiService.document.list(kbId, pageNum, pageSize)
      set({ documents: response.data || [], total: response.total || 0 })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch documents' })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchDocumentById: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await ApiService.document.getById(id)
      set({ selectedDocument: response.data })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch document' })
    } finally {
      set({ isLoading: false })
    }
  },

  uploadDocument: async (kbId, file, docName) => {
    set({ isLoading: true, error: null })
    try {
      const formData = new FormData()
      formData.append('kbId', kbId)
      formData.append('file', file)
      if (docName) formData.append('docName', docName)
      const response = await ApiService.document.upload(formData)
      set({ documents: [...get().documents, response.data] })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to upload document' })
    } finally {
      set({ isLoading: false })
    }
  },

  deleteDocument: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await ApiService.document.delete(id)
      set({ documents: get().documents.filter((doc) => doc.id !== id) })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete document' })
    } finally {
      set({ isLoading: false })
    }
  },

  triggerChunking: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await ApiService.document.chunk(id)
      set({
        documents: get().documents.map((doc) =>
          doc.id === id ? { ...doc, status: 'running' } : doc
        ),
      })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to trigger chunking' })
    } finally {
      set({ isLoading: false })
    }
  },

  setSelectedDocument: (doc) => set({ selectedDocument: doc }),
  clearError: () => set({ error: null }),
}))
