"use client"

import type React from "react"
import { PrivyProvider } from "@privy-io/react-auth"
import { useEffect, useState } from "react"
import { AuthProvider } from "@/lib/auth-context"
import { LogoSpinner } from "@/components/logo-spinner"

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const originalError = console.error
    console.error = (...args: any[]) => {
      const message = typeof args[0] === "string" ? args[0] : ""
      if (message.includes("cross-origin") || message.includes("ethereum") || message.includes("Blocked a frame")) {
        return
      }
      originalError.apply(console, args)
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason
      if (
        error &&
        (error.message?.includes("cross-origin") ||
          error.message?.includes("ethereum") ||
          error.message?.includes("Blocked a frame"))
      ) {
        event.preventDefault()
        console.log("[v0] Suppressed Privy cross-origin error in iframe environment")
      }
    }

    window.addEventListener("unhandledrejection", handleUnhandledRejection)

    return () => {
      console.error = originalError
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
    }
  }, [])

  if (!mounted) {
    return <LogoSpinner />
  }

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID as string}
      config={{
        loginMethods: ["wallet"],
        appearance: {
          theme: "dark",
          accentColor: "#3b82f6",
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      <AuthProvider>{children}</AuthProvider>
    </PrivyProvider>
  )
}
