"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { usePrivy, useWallets } from "@privy-io/react-auth"
import { useRouter } from "next/navigation"
import { LogoSpinner } from "@/components/logo-spinner"

interface AuthContextType {
  isAuthenticated: boolean
  walletAddress: string | null
  isLoading: boolean
  login: () => Promise<void>
  logout: () => void
  isReady: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const privy = usePrivy()
  const { wallets } = useWallets()
  const [fallbackReady, setFallbackReady] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!privy.ready) {
        console.log(" Privy initialization timeout - using fallback ready state")
        setFallbackReady(true)
      }
    }, 3000) // 3 second timeout

    return () => clearTimeout(timeout)
  }, [privy.ready])

  useEffect(() => {
    if (privy.authenticated && wallets[0]?.address) {
      console.log(" Wallet connected, redirecting to dashboard")
      router.push("/dashboard")
    }
  }, [privy.authenticated, wallets, router])

  const handleLogin = async () => {
    try {
      await privy.login()
    } catch (error) {
      console.error(" Login error:", error)
    }
  }

  const handleLogout = () => {
    try {
      privy.logout()
    } catch (error) {
      console.error(" Logout error:", error)
    }
  }

  const isReady = privy.ready || fallbackReady

  const contextValue: AuthContextType = {
    isAuthenticated: privy.authenticated,
    walletAddress: wallets[0]?.address || null,
    isLoading: !isReady,
    login: handleLogin,
    logout: handleLogout,
    isReady,
  }

  if (!isReady) {
    return <LogoSpinner />
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
