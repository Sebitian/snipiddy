import type React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  fallback?: string
}

export function CustomAvatar({ src, alt = "", fallback, className, ...props }: AvatarProps) {
  return (
    <div className={cn("relative h-10 w-10 rounded-full overflow-hidden", className)} {...props}>
      {src ? (
        <Image src={src || "/placeholder.svg"} alt={alt} fill className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
          {fallback || alt.substring(0, 2) || "??"}
        </div>
      )}
    </div>
  )
}

