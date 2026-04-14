"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { AuthProvider } from "@/lib/auth-context"
import { LogoSpinner } from "@/components/logo-spinner"
import dynamic from "next/dynamic"

// Dynamically import PrivyProvider to avoid SSR bundling issues
const PrivyProvider = dynamic(
  () => import("@privy-io/react-auth").then(mod => ({ default: mod.PrivyProvider })),
  { ssr: false }
)

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    return () => {}
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
