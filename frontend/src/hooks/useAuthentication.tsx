import { createContext, useContext, useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth'
import { UserRole, User } from '@/types'

interface AuthenticationContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  hasRole: (role: UserRole | UserRole[]) => boolean
  login: (user: User, token: string) => void
  logout: () => Promise<void>
}

const AuthenticationContext = createContext<AuthenticationContextType | undefined>(undefined)

export function AuthenticationProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, login, logout, restoreSession } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    restoreSession().finally(() => setIsLoading(false))
  }, [restoreSession])

  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!user) return false
    const roles = Array.isArray(role) ? role : [role]
    return roles.includes(user.role as UserRole)
  }

  return (
    <AuthenticationContext.Provider value={{ user, isAuthenticated, isLoading, hasRole, login, logout }}>
      {children}
    </AuthenticationContext.Provider>
  )
}

export function useAuthentication() {
  const context = useContext(AuthenticationContext)
  if (context === undefined) {
    throw new Error('useAuthentication must be used within an AuthenticationProvider')
  }
  return context
}
