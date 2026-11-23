import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useCurrentUserQuery } from './queries'
import { api } from '../services/api'
import { useQueryClient } from '@tanstack/react-query'
import type { Role, User } from '../types'

interface AuthContextValue {
  user?: User | null
  isLoading: boolean
  error?: Error
  retryAuth: () => Promise<unknown>
  isAuthenticated: boolean
  isSessionExpired: boolean
  login: (email: string, password: string, role: Role) => Promise<User>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const currentUserQuery = useCurrentUserQuery()
  const { data: user, isLoading, error } = currentUserQuery
  const queryClient = useQueryClient()
  const [isSessionExpired, setIsSessionExpired] = useState(false)
  const expiredRef = useRef(false)

  useEffect(() => {
    const expireSession = () => {
      if (expiredRef.current) return
      expiredRef.current = true
      setIsSessionExpired(true)
      queryClient.clear()
    }
    window.addEventListener('salim:auth-expired', expireSession)
    return () => window.removeEventListener('salim:auth-expired', expireSession)
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      error: error instanceof Error ? error : undefined,
      retryAuth: () => currentUserQuery.refetch(),
      isAuthenticated: Boolean(user) && !isSessionExpired,
      isSessionExpired,
      login: async (email: string, password: string, role: Role) => {
        const signedIn = await api.auth.login(email, password, role)
        expiredRef.current = false
        setIsSessionExpired(false)
        queryClient.setQueryData(['me'], signedIn)
        return signedIn
      },
      logout: async () => {
        try {
          await api.auth.logout()
        } catch {
          // Clear the local session even when the API cannot be reached.
        } finally {
          expiredRef.current = true
          setIsSessionExpired(true)
          queryClient.clear()
        }
      },
    }),
    [currentUserQuery, error, isLoading, isSessionExpired, queryClient, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
