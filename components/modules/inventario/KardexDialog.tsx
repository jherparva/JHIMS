"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowUpCircle, ArrowDownCircle, RefreshCw, AlertCircle, Package } from "lucide-react"
import { cn } from "@/lib/utils"

interface KardexEntry {
    _id: string
    type: "in" | "out" | "adjustment"
    quantity: number
    balanceAfter: number
    reason: string
    referenceTicket?: string
    date: string
}

interface KardexDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    product: { _id: string; name: string, stock: number } | null
}

export function KardexDialog({ open, onOpenChange, product }: KardexDialogProps) {
    const [entries, setEntries] = useState<KardexEntry[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (open && product) {
            fetchKardex()
        } else {
            setEntries([])
        }
    }, [open, product])

    const fetchKardex = async () => {
        if (!product) return
        setLoading(true)
        try {
            const res = await fetch(`/api/productos/${product._id}/kardex`)
            if (res.ok) {
                const data = await res.json()
                setEntries(data.kardexEntries)
            }
        } catch (error) {
            console.error("Error fetching kardex:", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden border-none shadow-2xl">
                <DialogHeader className="bg-slate-900 p-6 text-white text-left">
                    <div className="flex items-center gap-3">
                        <div className="bg-violet-600 p-2 rounded-xl">
                            <Package size={24} />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-black italic uppercase tracking-tighter">Historial de Vida (Kardex)</DialogTitle>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{product?.name || "Sin Nombre"}</p>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6">
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-50 border rounded-2xl p-4 flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Stock Actual</span>
                            <span className="text-2xl font-black text-slate-800">{product?.stock || 0}</span>
                        </div>
                        <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 flex justify-between items-center">
                            <span className="text-[10px] font-black text-violet-600 uppercase tracking-widest">Último Movimiento</span>
                            <span className="text-xs font-bold text-slate-600">{entries[0] ? new Date(entries[0].date).toLocaleDateString() : 'N/A'}</span>
                        </div>
                    </div>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {loading ? (
                            <div className="py-20 text-center text-slate-400 font-bold animate-pulse">
                                <RefreshCw className="mx-auto mb-2 animate-spin" />
                                CARGANDO HISTORIAL...
                            </div>
                        ) : entries.length === 0 ? (
                            <div className="py-20 text-center text-slate-400 bg-slate-50 rounded-3xl border border-dashed">
                                <AlertCircle className="mx-auto mb-2 opacity-50" size={40} />
                                <p className="font-bold">AUN NO HAY MOVIMIENTOS REGISTRADOS</p>
                                <p className="text-[10px] uppercase font-medium">Las ventas y entradas generadas desde ahora aparecerán aquí automáticamente</p>
                            </div>
                        ) : (
                            <div className="relative border rounded-2xl overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-500 tracking-tighter border-b">
                                        <tr>
                                            <th className="px-4 py-3">Fecha</th>
                                            <th className="px-4 py-3">Concepto / Ref</th>
                                            <th className="px-4 py-3 text-center">Mov.</th>
                                            <th className="px-4 py-3 text-right">Saldo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 italic">
                                        {entries.map((entry) => (
                                            <tr key={entry._id} className="hover:bg-slate-50 transition-colors group">
                                                <td className="px-4 py-3 text-[10px] font-bold text-slate-400">
                                                    {new Date(entry.date).toLocaleString([], {
                                                        day: '2-digit',
                                                        month: 'short',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-xs font-black text-slate-700 block uppercase tracking-tight">{entry.reason}</span>
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase">{entry.referenceTicket || 'Sin ref.'}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className={cn(
                                                        "inline-flex items-center gap-1 font-black text-xs px-2 py-0.5 rounded-full",
                                                        entry.type === 'in' ? "text-emerald-600 bg-emerald-50" : 
                                                        entry.type === 'out' ? "text-rose-600 bg-rose-50" : 
                                                        "text-blue-600 bg-blue-50"
                                                    )}>
                                                        {entry.type === 'in' ? <ArrowUpCircle size={12} /> : 
                                                         entry.type === 'out' ? <ArrowDownCircle size={12} /> : 
                                                         <RefreshCw size={12} />}
                                                        {entry.quantity > 0 ? `+${entry.quantity}` : entry.quantity}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-black text-slate-900 border-l border-slate-50/50">
                                                    {entry.balanceAfter}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
