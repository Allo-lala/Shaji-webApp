export function LogoSpinner({ fullScreen = true }: { fullScreen?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center bg-background ${
        fullScreen ? "fixed inset-0 z-50" : "min-h-[200px] w-full"
      }`}
    >
      <div className="flex flex-col items-center gap-5">
        {/* Windows-style segmented spinner */}
        <div className="relative h-12 w-12">
          <svg
            className="animate-spin"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background track */}
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="4"
              className="text-muted/30"
            />
            {/* Spinning arc */}
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray="30 96"
              className="text-primary"
            />
          </svg>
          {/* Logo in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Shaji" className="h-6 w-6 rounded-full" />
          </div>
        </div>
        {/* <p className="text-sm text-muted-foreground tracking-wide">Loading…</p> */}
      </div>
    </div>
  )
}
