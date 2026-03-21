"use client"

import { WifiOff, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useConnectionStatus } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

interface LogoProps {
  size?: "xs" | "small" | "medium" | "large" | "xl"
  className?: string
  animated?: boolean
  iconOnly?: boolean
}

export function Logo({ size = "medium", className, animated = false, iconOnly = false }: LogoProps) {
  const [isReady, setIsReady] = useState(!animated)
  const [isColored, setIsColored] = useState(!animated)

  useEffect(() => {
    if (animated) {
      const t1 = setTimeout(() => setIsReady(true), 100)
      const t2 = setTimeout(() => setIsColored(true), 1200)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [animated])

  const metrics = {
    xs: { h: 32, view: "-50 0 500 250" },
    small: { h: 48, view: "-50 0 500 250" },
    medium: { h: 90, view: "-50 0 500 250" },
    large: { h: 180, view: "-50 0 500 250" },
    xl: { h: 320, view: "-50 0 500 250" },
  }

  const m = metrics[size]

  return (
    <div 
      className={cn("flex items-center justify-center select-none bg-transparent overflow-visible", className)}
      style={!className?.includes('h-') ? { height: m.h } : undefined}
    >
      <svg
        viewBox={m.view}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("w-auto h-full transition-all duration-1000", isReady ? "opacity-100 scale-100" : "opacity-0 scale-95")}
        style={{ maxHeight: '100%' }}
      >
        <defs>
          <filter id="scan_glow" x="-20%" y="-20%" width="140%" height="140%">
             <feGaussianBlur stdDeviation="10" result="blur" />
             <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="drop_shadow_logo" x="-10%" y="-10%" width="120%" height="120%">
             <feDropShadow dx="0" dy="12" stdDeviation="6" floodColor="#000000" floodOpacity="0.6"/>
          </filter>
        </defs>

        <g>
          {/* 💎 MARCA CORPORATIVA: JHIMS */}
          <foreignObject x="0" y="0" width="400" height="200" className="overflow-visible">
            <div className="relative w-full h-full flex items-center justify-center overflow-visible">
              
              <div className="relative">
                {/* 1. Base desaturada (Sin Color) */}
                <img 
                  src="/image_1b0560c5.png" 
                  alt="JHIMS Logo Base" 
                  className="w-auto h-auto max-w-full max-h-full object-contain filter grayscale invert brightness-75 opacity-20 mix-blend-screen"
                />

                {/* 2. Carga de Color (De Izquierda a Derecha) */}
                <motion.div
                  className="absolute inset-0 overflow-hidden"
                  initial={animated ? { clipPath: "inset(0 100% 0 0)" } : { clipPath: "inset(0 0 0 0)" }}
                  animate={isColored ? { clipPath: "inset(0 0 0 0)" } : {}}
                  transition={{ duration: 2, ease: "easeInOut", delay: 0.5 }}
                >
                  <img 
                    src="/image_1b0560c5.png" 
                    alt="JHIMS Logo Color" 
                    className="w-auto h-auto max-w-full max-h-full object-contain filter drop-shadow-[0_0_15px_rgba(34,211,238,0.3)] mix-blend-screen"
                  />
                  
                  {/* Línea de carga sutil */}
                  {animated && !isColored && (
                    <motion.div 
                      className="absolute top-0 bottom-0 w-[2px] bg-cyan-400 shadow-[0_0_15px_#22d3ee]"
                      initial={{ left: "0%" }}
                      animate={{ left: "100%" }}
                      transition={{ duration: 2, ease: "easeInOut", delay: 0.5 }}
                    />
                  )}
                </motion.div>
              </div>

            </div>
          </foreignObject>
        </g>
      </svg>
    </div>
  )
}

export function OfflineBanner() {
  const [isRetrying, setIsRetrying] = useState(false)
  const { isOnline } = useConnectionStatus()

  if (isOnline === undefined) return null 
  if (isOnline) return null

  const handleRetry = () => {
    setIsRetrying(true)
    window.location.reload()
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white p-3 text-center shadow-lg">
      <div className="flex items-center justify-center gap-3 max-w-4xl mx-auto">
        <WifiOff className="h-5 w-5 flex-shrink-0" />
        <div className="flex flex-col sm:flex-row items-center gap-2">
          <span className="font-medium">Sin conexión a internet</span>
          <span className="text-sm opacity-90">
            - Modo offline activado. Algunas funciones pueden estar limitadas.
          </span>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleRetry}
          disabled={isRetrying}
          className="bg-white/20 hover:bg-white/30 text-white border-white/30"
        >
          {isRetrying ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-1" />
              Reintentar
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
