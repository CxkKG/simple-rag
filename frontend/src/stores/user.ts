import { create } from 'zustand'
import { User, UserRole } from '@/types'
import { ApiService } from '@/services/api'

interface UserStore {
  users: User[]
  selectedUser: User | null
  isLoading: boolean
  error: string | null
  total: number

  // Actions
  fetchUsers: (pageNum?: number, pageSize?: number) => Promise<void>
  fetchUserById: (id: string) => Promise<void>
  createUser: (data: { username: string; password: string; role?: UserRole }) => Promise<void>
  updateUser: (id: string, data: { username?: string; password?: string; role?: UserRole }) => Promise<void>
  deleteUser: (id: string) => Promise<void>
  setSelectedUser: (user: User | null) => void
  clearError: () => void
}

const normalizeUser = (user: any): User => ({
  id: user.id || '',
  username: user.username || '',
  role: (user.role as UserRole) || UserRole.User,
  avatar: user.avatar,
  createdAt: user.createdAt || new Date().toISOString(),
  updatedAt: user.updatedAt || new Date().toISOString(),
})

export const useUserStore = create<UserStore>((set, get) => ({
  users: [],
  selectedUser: null,
  isLoading: false,
  error: null,
  total: 0,

  fetchUsers: async (pageNum = 1, pageSize = 10) => {
    set({ isLoading: true, error: null })
    try {
      const response = await ApiService.user.list(pageNum, pageSize)
      set({
        users: (response.data || []).map(normalizeUser),
        total: response.total || 0
      })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch users' })
    } finally {
      set({ isLoading: false })
    }
  },

  fetchUserById: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await ApiService.user.getById(id)
      set({ selectedUser: normalizeUser(response.data) })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to fetch user' })
    } finally {
      set({ isLoading: false })
    }
  },

  createUser: async (data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await ApiService.user.create(data)
      set({ users: [...get().users, normalizeUser(response.data)] })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to create user' })
    } finally {
      set({ isLoading: false })
    }
  },

  updateUser: async (id, data) => {
    set({ isLoading: true, error: null })
    try {
      const response = await ApiService.user.update(id, data)
      set({
        users: get().users.map((user) => (user.id === id ? normalizeUser(response.data) : user)),
        selectedUser: normalizeUser(response.data),
      })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update user' })
    } finally {
      set({ isLoading: false })
    }
  },

  deleteUser: async (id) => {
    set({ isLoading: true, error: null })
    try {
      await ApiService.user.delete(id)
      set({ users: get().users.filter((user) => user.id !== id) })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete user' })
    } finally {
      set({ isLoading: false })
    }
  },

  setSelectedUser: (user) => set({ selectedUser: user }),
  clearError: () => set({ error: null }),
}))
