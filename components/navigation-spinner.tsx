"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"

export function NavigationSpinner() {
  const pathname = usePathname()
  const [loading, setLoading] = useState(false)
  const prevPath = useRef(pathname)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Path changed — start loading
    if (pathname !== prevPath.current) {
      prevPath.current = pathname
      setLoading(true)
      // Clear any existing hide timer
      if (hideTimer.current) clearTimeout(hideTimer.current)
    }
  }, [pathname])

  useEffect(() => {
    // Once loading is true and pathname is stable, hide after one render cycle
    if (loading) {
      hideTimer.current = setTimeout(() => setLoading(false), 100)
      return () => {
        if (hideTimer.current) clearTimeout(hideTimer.current)
      }
    }
  }, [loading, pathname])

  if (!loading) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-14 w-14">
          <svg className="animate-spin" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" className="text-muted-foreground/20" />
            <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="30 96" className="text-primary" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" className="h-7 w-7 rounded-full" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
      </div>
    </div>
  )
}
