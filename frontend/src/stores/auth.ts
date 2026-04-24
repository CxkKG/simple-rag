import { create } from 'zustand'
import { User } from '@/types'
import { ApiService } from '@/services/api'

const TOKEN_KEY = 'ra_token'
const USER_KEY = 'ra_admin_user'

interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (user: User, token: string) => void
  logout: () => Promise<void>
  restoreSession: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: (user, token) => {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, JSON.stringify(user))
    set({ user, token, isAuthenticated: true })
  },

  logout: async () => {
    try {
      await ApiService.auth.logout()
    } catch {
      // 即使 API 调用失败也要清除本地状态
    }
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
    set({ user: null, token: null, isAuthenticated: false })
  },

  restoreSession: async () => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false })
      return
    }
    try {
      const res = await ApiService.auth.currentUser()
      const user = res.data as unknown as User
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      set({ user, token, isAuthenticated: true })
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      set({ user: null, token: null, isAuthenticated: false })
    }
  },
}))
