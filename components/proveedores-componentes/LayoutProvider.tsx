"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { CommandPalette } from "@/components/CommandPalette"

interface LayoutContextType {
    isVisualMode: boolean
    toggleVisualMode: () => void
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined)

export function LayoutProvider({ children }: { children: ReactNode }) {
    const [isVisualMode, setIsVisualMode] = useState(false)

    useEffect(() => {
        // Load preference from localStorage
        const saved = localStorage.getItem("jhims-visual-mode")
        if (saved) {
            setIsVisualMode(saved === "true")
        }
    }, [])

    const toggleVisualMode = () => {
        const newValue = !isVisualMode
        setIsVisualMode(newValue)
        localStorage.setItem("jhims-visual-mode", String(newValue))
    }

    return (
        <LayoutContext.Provider value={{ isVisualMode, toggleVisualMode }}>
            <div data-visual-mode={isVisualMode}>
                {children}
                <CommandPalette />
            </div>
        </LayoutContext.Provider>
    )
}

export function useLayout() {
    const context = useContext(LayoutContext)
    if (context === undefined) {
        throw new Error("useLayout must be used within a LayoutProvider")
    }
    return context
}
