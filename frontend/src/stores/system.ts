import { create } from 'zustand'
import { SystemConfig } from '@/types'
import { ApiService } from '@/services/api'

interface SystemStore {
  config: SystemConfig[]
  isLoading: boolean
  error: string | null

  // Actions
  fetchConfig: (category?: string) => Promise<void>
  updateConfig: (key: string, value: string) => Promise<void>
  clearError: () => void
}

const normalizeSystemConfig = (config: any): SystemConfig => ({
  key: config.key || '',
  value: config.value || '',
  description: config.description || '',
  category: config.category || '',
})

export const useSystemStore = create<SystemStore>((set, get) => ({
  config: [],
  isLoading: false,
  error: null,

  fetchConfig: async (category) => {
    set({ isLoading: true, error: null })
    try {
      const response = await ApiService.system.getConfig(category || '')
      set({ config: (response.data ? [response.data] : []) as SystemConfig[] })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch system config' })
    } finally {
      set({ isLoading: false })
    }
  },

  updateConfig: async (key, value) => {
    set({ isLoading: true, error: null })
    try {
      const response = await ApiService.system.updateConfig(key, value)
      set({
        config: get().config.map((c) => (c.key === key ? normalizeSystemConfig(response.data) : c)),
      })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update config' })
    } finally {
      set({ isLoading: false })
    }
  },

  clearError: () => set({ error: null }),
}))
