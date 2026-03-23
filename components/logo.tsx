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
  layout?: "horizontal" | "vertical" | "stacked"
  dark?: boolean // Nueva prop para fondos claros
  showTagline?: boolean // Nueva prop para ocultar el eslogan
}

export function Logo({ 
  size = "medium", 
  className, 
  animated = false, 
  iconOnly = false,
  variant = "full",
  layout = "horizontal",
  dark = false,
  showTagline = true
}: LogoProps) {
  const [isReady, setIsReady] = useState(!animated)
  const [isColored, setIsColored] = useState(!animated)
  
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
    xs: { iconH: "h-10", textH: "h-8", textW: "w-28", gap: "gap-0", slogan: "text-[5px]", textMt: "-8px", taglineMt: "-6px" },
    small: { iconH: "h-20", textH: "h-14", textW: "w-44", gap: "gap-0", slogan: "text-[7px]", textMt: "-20px", taglineMt: "-10px" },
    medium: { iconH: "h-28", textH: "h-20", textW: "w-64", gap: "gap-0", slogan: "text-[8px]", textMt: "-32px", taglineMt: "-14px" },
    large: { iconH: "h-44", textH: "h-32", textW: "w-96", gap: "gap-0", slogan: "text-[10px]", textMt: "-50px", taglineMt: "-20px" },
    xl: { iconH: "h-64", textH: "h-48", textW: "w-[560px]", gap: "gap-0", slogan: "text-xs", textMt: "-90px", taglineMt: "-32px" },
  }

  const m = metrics[size]

  return (
    <div className={cn("flex flex-col items-center justify-center select-none bg-transparent", className)}>
      <div className={cn(
        "flex transition-all duration-1000",
        // Lógica de Layout
        layout === "vertical" ? "flex-col items-center" : "flex-row items-center",
        isReady ? "opacity-100 scale-100" : "opacity-0 scale-95",
        m.gap
      )}>
        
        {/* ICONO CON EFECTO DE HOVER DINMICO */}
        {showIcon && (
          <motion.div 
            className="relative flex-shrink-0 group/icon cursor-pointer h-fit"
            whileHover="hover"
            initial="initial"
          >
            {/* Brillo de fondo (Glow) */}
            <div className="absolute inset-0 bg-cyan-500/10 blur-[40px] rounded-full -z-10 animate-pulse group-hover/icon:bg-cyan-500/30 transition-colors" />
            
            {/* EL ICONO: Escala y Rotacin sutil al pasar el mouse */}
            <motion.img 
              src="/icon1.png" 
              alt="JHIMS 3D" 
              className={cn("object-contain drop-shadow-2xl relative z-10", m.iconH)}
              initial={animated ? { rotateY: 90, opacity: 0 } : {}}
              animate={isReady ? { rotateY: 0, opacity: 1 } : {}}
              variants={{
                hover: { 
                  scale: 1.15, 
                  rotateY: 15,
                  filter: "brightness(1.2) drop-shadow(0 0 20px rgba(34,211,238,0.4))" 
                }
              }}
              transition={{ duration: 0.4, type: "spring", stiffness: 300 }}
            />

            {/* EFECTO DE BRILLO (Rayon de luz que cruza) */}
            <div className="absolute inset-0 z-20 overflow-hidden rounded-xl opacity-0 group-hover/icon:opacity-100 transition-opacity">
              <motion.div 
                className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12"
                variants={{
                  hover: { 
                    x: ["-100%", "200%"],
                    transition: { duration: 1.2, repeat: Infinity, repeatDelay: 0.5 }
                  }
                }}
              />
            </div>
          </motion.div>
        )}

        {/* CONTENEDOR DE TEXTOS (Nombre + Slogan) */}
        <div 
          className={cn(
            "flex flex-col",
            layout === "vertical" ? "items-center" : "items-start"
          )}
          style={layout === "horizontal" && showText ? { marginLeft: m.textMt } : {}}
        >
          {/* BLOQUE DE TEXTOS (Wordmark + Tagline Centrados entre s) */}
          {showText && (
            <div className="flex flex-col items-center">
              <div className={cn("relative group/text", m.textH, m.textW)}>
                {/* 1. Capas del nombre JHIMS */}
                <div 
                  className={cn(
                    "absolute inset-0 transition-all duration-500",
                    dark ? "bg-slate-900/10" : "bg-white/20"
                  )}
                  style={{
                    maskImage: 'url(/image_1b0560c5.png)',
                    WebkitMaskImage: 'url(/image_1b0560c5.png)',
                    maskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    maskPosition: 'center'
                  }}
                />
                <motion.div
                  className="absolute inset-0 overflow-hidden"
                  initial={animated ? { clipPath: "inset(0 100% 0 0)" } : { clipPath: "inset(0 0 0 0)" }}
                  animate={isColored ? { clipPath: "inset(0 0 0 0)" } : {}}
                  transition={{ duration: 1.5, ease: "easeInOut", delay: 0.5 }}
                >
                  <div 
                    className={cn(
                      "absolute inset-0",
                      dark ? "bg-slate-900" : "bg-white shadow-[0_0_40px_rgba(34,211,238,0.6)]"
                    )}
                    style={{
                      maskImage: 'url(/image_1b0560c5.png)',
                      WebkitMaskImage: 'url(/image_1b0560c5.png)',
                      maskSize: 'contain',
                      maskRepeat: 'no-repeat',
                      maskPosition: 'center'
                    }}
                  />
                </motion.div>
              </div>

              {/* ESLOGAN: DINAMICAMENTE PEGADO BAJO "JHIMS." */}
              {showTagline && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={isColored ? { opacity: 1 } : {}}
                  transition={{ delay: 1.5 }}
                  className={cn(
                    "font-bold uppercase tracking-[0.15em] whitespace-nowrap text-center",
                    dark ? "text-slate-600" : "text-cyan-400/70",
                    m.slogan
                  )}
                  style={{ marginTop: m.taglineMt }}
                >
                  Inventory Management System
                </motion.p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
