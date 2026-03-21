"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, Package, Users, Home, ShoppingCart, Settings, ArrowRight, Loader2 } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { MENU_ITEMS } from "@/lib/menu-config"
import { cn } from "@/lib/utils"

export function CommandPalette() {
    const [open, setOpen] = useState(false)
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(0)
    const router = useRouter()

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    const searchEverything = useCallback(async (q: string) => {
        if (!q) {
            setResults(MENU_ITEMS.slice(0, 5))
            return
        }
        
        setLoading(true)
        try {
            // 1. Filtrar Menú localmente
            const menuMatches = MENU_ITEMS.filter(item => 
                item.title.toLowerCase().includes(q.toLowerCase())
            ).map(item => ({ ...item, type: 'nav' }))

            // 2. Buscar Productos (Simulado o API rápida si tienes una específica)
            const prodRes = await fetch(`/api/productos`)
            let prodMatches: any[] = []
            if (prodRes.ok) {
                const data = await prodRes.json()
                const prods = Array.isArray(data.products) ? data.products : []
                prodMatches = prods.filter((p: any) => 
                    p.name.toLowerCase().includes(q.toLowerCase()) || 
                    p.sku.toLowerCase().includes(q.toLowerCase())
                ).slice(0, 3).map((p: any) => ({
                    title: p.name,
                    href: `/inventario`,
                    icon: Package,
                    type: 'product',
                    description: `Stock: ${p.stock}`
                }))
            }

            setResults([...menuMatches, ...prodMatches])
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
            setSelectedIndex(0)
        }
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => {
            searchEverything(query)
        }, 300)
        return () => clearTimeout(timer)
    }, [query, searchEverything])

    const onSelect = (item: any) => {
        router.push(item.href)
        setOpen(false)
        setQuery("")
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowDown") {
            setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
        } else if (e.key === "ArrowUp") {
            setSelectedIndex(prev => Math.max(prev - 1, 0))
        } else if (e.key === "Enter") {
            if (results[selectedIndex]) onSelect(results[selectedIndex])
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="p-0 overflow-hidden max-w-2xl bg-white/90 backdrop-blur-xl border-slate-200/50 shadow-2xl rounded-2xl">
                <div className="flex items-center border-b px-4 h-14 bg-white/50">
                    <Search className="mr-3 h-5 w-5 text-slate-400 shrink-0" />
                    <input
                        autoFocus
                        placeholder="Buscar módulos, productos o clientes... (ESC para cerrar)"
                        className="flex-1 bg-transparent outline-none text-slate-800 placeholder:text-slate-400 text-sm font-medium"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    {loading && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                    <div className="ml-2 px-1.5 py-0.5 rounded border bg-slate-50 text-[10px] font-bold text-slate-400 uppercase">CMD + K</div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-2 space-y-1">
                    {results.length === 0 && query && !loading && (
                        <div className="py-12 text-center text-slate-500">
                            No hay resultados para "<span className="font-bold text-slate-800">{query}</span>"
                        </div>
                    )}
                    
                    {results.map((item, index) => {
                        const Icon = item.icon || Package
                        const isSelected = index === selectedIndex

                        return (
                            <div
                                key={item.href + index}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 group",
                                    isSelected 
                                        ? "bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]" 
                                        : "hover:bg-slate-100 text-slate-600"
                                )}
                                onClick={() => onSelect(item)}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm",
                                    isSelected ? "bg-white/20" : "bg-slate-100 group-hover:bg-white"
                                )}>
                                    <Icon size={20} className={isSelected ? "text-white" : "text-slate-600"} />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold truncate text-sm">{item.title}</p>
                                        {item.type === 'product' && (
                                            <span className={cn(
                                                "text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded bg-amber-100 text-amber-700",
                                                isSelected && "bg-white/20 text-white"
                                            )}>Producto</span>
                                        )}
                                    </div>
                                    <p className={cn(
                                        "text-xs truncate font-medium",
                                        isSelected ? "text-white/80" : "text-slate-400"
                                    )}>{item.description}</p>
                                </div>

                                <ArrowRight 
                                    size={16} 
                                    className={cn(
                                        "transition-transform",
                                        isSelected ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0"
                                    )} 
                                />
                            </div>
                        )
                    })}
                </div>

                <div className="border-t px-4 py-3 bg-slate-50/50 flex items-center justify-between">
                    <div className="flex gap-4">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase">
                            <span className="p-1 rounded bg-white border shadow-sm text-slate-600">Enter</span> Seleccionar
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase">
                            <span className="p-1 rounded bg-white border shadow-sm text-slate-600">↑↓</span> Navegar
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
