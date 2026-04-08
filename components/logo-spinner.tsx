import Image from "next/image"

export function LogoSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-16 w-16">
          {/* Rotating ring */}
          <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          {/* Logo centered inside */}
          <div className="absolute inset-2 flex items-center justify-center">
            <Image src="/logo.png" alt="Shaji" width={40} height={40} className="rounded-full" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
      </div>
    </div>
  )
}
