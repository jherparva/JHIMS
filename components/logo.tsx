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
  variant?: "text" | "icon" | "full"
}

export function Logo({ 
  size = "medium", 
  className, 
  animated = false, 
  iconOnly = false,
  variant = "text"
}: LogoProps) {
  const [isReady, setIsReady] = useState(!animated)
  const [isColored, setIsColored] = useState(!animated)
  // Determinar si debemos mostrar el icono basado en las props
  const showIcon = iconOnly || variant === "icon" || variant === "full"
  const showText = !iconOnly && (variant === "text" || variant === "full")

  useEffect(() => {
    if (animated) {
      const t1 = setTimeout(() => setIsReady(true), 100)
      const t2 = setTimeout(() => setIsColored(true), 800)
      return () => { clearTimeout(t1); clearTimeout(t2) }
    }
  }, [animated])

  const metrics = {
    xs: { h: 32, view: "-50 0 500 250" },
    small: { h: 48, view: "-50 0 500 250" },
    medium: { h: 90, view: "-50 0 500 250" },
    large: { h: 180, view: "-50 0 500 250" },
    xl: { h: 320, view: "-50 0 600 300" },
  }

  const m = metrics[size]

  return (
    <div 
      className={cn("flex flex-col items-center justify-center select-none bg-transparent overflow-visible", className)}
      style={!className?.includes('h-') ? { height: m.h } : undefined}
    >
      <div className={cn(
        "flex items-center gap-4 transition-all duration-1000",
        isReady ? "opacity-100 scale-100" : "opacity-0 scale-95"
      )}>
        {/* ICONO 3D PREMIUM */}
        {showIcon && (
          <div className="relative group">
            <motion.div
              initial={animated ? { rotateY: 90, opacity: 0 } : {}}
              animate={isReady ? { rotateY: 0, opacity: 1 } : {}}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="relative"
            >
              <img 
                src="/icon.png" 
                alt="JHIMS 3D" 
                className={cn(
                  "drop-shadow-[0_0_25px_rgba(34,211,238,0.4)] object-contain",
                  size === "xl" ? "h-48" : size === "large" ? "h-32" : size === "medium" ? "h-16" : "h-10"
                )}
              />
              {/* Brillo dinámico detrás del icono */}
              <div className="absolute inset-0 bg-cyan-500/10 blur-[40px] rounded-full -z-10 animate-pulse" />
            </motion.div>
          </div>
        )}

        {/* TEXTO JHIMS CON EFECTO DE CARGA */}
        {showText && (
          <div className="relative">
            <div className="relative">
              {/* 1. Base desaturada (Sin Color) */}
              <img 
                src="/image_1b0560c5.png" 
                alt="JHIMS Logo Base" 
                className={cn(
                  "w-auto h-auto object-contain filter grayscale invert brightness-75 opacity-20 mix-blend-screen",
                  size === "xl" ? "h-24" : "h-full"
                )}
                style={size !== "xl" ? { maxHeight: m.h * 0.8 } : {}}
              />

              {/* 2. Carga de Color (De Izquierda a Derecha) */}
              <motion.div
                className="absolute inset-0 overflow-hidden"
                initial={animated ? { clipPath: "inset(0 100% 0 0)" } : { clipPath: "inset(0 0 0 0)" }}
                animate={isColored ? { clipPath: "inset(0 0 0 0)" } : {}}
                transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5 }}
              >
                <img 
                  src="/image_1b0560c5.png" 
                  alt="JHIMS Logo Color" 
                  className={cn(
                    "w-auto h-auto object-contain filter drop-shadow-[0_0_15px_rgba(34,211,238,0.3)] mix-blend-screen",
                    size === "xl" ? "h-24" : "h-full"
                  )}
                  style={size !== "xl" ? { maxHeight: m.h * 0.8 } : {}}
                />
                
                {/* Línea de carga sutil */}
                {animated && !isColored && (
                  <motion.div 
                    className="absolute top-0 bottom-0 w-[2px] bg-cyan-400 shadow-[0_0_15px_#22d3ee]"
                    initial={{ left: "0%" }}
                    animate={{ left: "100%" }}
                    transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5 }}
                  />
                )}
              </motion.div>
            </div>
            {size === "xl" && (
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={isColored ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 1.8 }}
                className="text-cyan-400/60 text-xs font-bold tracking-[0.3em] uppercase mt-2 text-center"
              >
                Intelligent Inventory Management
              </motion.p>
            )}
          </div>
        )}
      </div>
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
