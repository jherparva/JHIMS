"use client"

import { useState, useEffect } from "react"
import { Download, Monitor, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion, AnimatePresence } from "framer-motion"

export function PWAInstall() {
    const [installPrompt, setInstallPrompt] = useState<any>(null)
    const [showPrompt, setShowPrompt] = useState(false)

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault()
            setInstallPrompt(e)
            // Mostrar después de un pequeño retraso para no ser intrusivo
            setTimeout(() => setShowPrompt(true), 3000)
        }

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

        if (window.matchMedia("(display-mode: standalone)").matches) {
            setShowPrompt(false)
        }

        return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }, [])

    const handleInstall = async () => {
        if (!installPrompt) return
        installPrompt.prompt()
        const { outcome } = await installPrompt.userChoice
        if (outcome === "accepted") {
            setInstallPrompt(null)
            setShowPrompt(false)
        }
    }

    if (!showPrompt) return null

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md"
            >
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-2xl flex items-center gap-4">
                    <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center shrink-0">
                        <Monitor className="text-white" size={24} />
                    </div>
                    <div className="flex-1">
                        <h4 className="text-white font-bold text-sm tracking-tight italic">JHIMS INVENTORY</h4>
                        <p className="text-slate-400 text-[10px] uppercase font-black">Sistema de Gestión Profesional</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            onClick={handleInstall}
                            className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-10 px-4 font-bold text-xs"
                        >
                            INSTALAR
                        </Button>
                        <button 
                            onClick={() => setShowPrompt(false)}
                            className="text-slate-500 hover:text-white p-1"
                        >
                            <X size={18} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
