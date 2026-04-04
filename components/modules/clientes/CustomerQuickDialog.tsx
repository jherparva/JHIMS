"use client"

import * as React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UserPlus, Loader2, WifiOff } from "lucide-react"
import { toast } from "sonner"
import { jhimsOffline } from "@/lib/offline-db"

interface CustomerQuickDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: (customerId: string) => void
}

export function CustomerQuickDialog({ open, onOpenChange, onSuccess }: CustomerQuickDialogProps) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        taxId: "",
        phone: ""
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name.trim()) {
            toast.error("El nombre es requerido")
            return
        }

        setLoading(true)
        try {
            // --- MODO OFFLINE ---
            if (!navigator.onLine) {
                const tempId = `temp_${Date.now()}`
                const localCustomer = { ...formData, _id: tempId, name: formData.name + " (Local)" }
                await jhimsOffline.savePendingCustomer(localCustomer)
                
                toast.info("Sin conexión. Cliente guardado localmente.", {
                    description: "Se sincronizará cuando vuelvas a tener internet.",
                    icon: <WifiOff className="text-amber-500" />
                })
                
                onSuccess(tempId)
                onOpenChange(false)
                setFormData({ name: "", taxId: "", phone: "" })
                return
            }

            const response = await fetch("/api/clientes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            })

            if (response.ok) {
                const newCustomer = await response.json()
                toast.success(`Cliente ${newCustomer.name} creado`)
                onSuccess(newCustomer._id)
                onOpenChange(false)
                setFormData({ name: "", taxId: "", phone: "" })
            } else {
                const data = await response.json()
                toast.error(data.error || "Error al crear cliente")
            }
        } catch (error) {
            toast.error("Error de conexión")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px] border-none shadow-2xl rounded-3xl">
                <DialogHeader className="bg-indigo-600 -mx-6 -mt-6 p-6 rounded-t-3xl text-white">
                    <UserPlus className="w-10 h-10 mb-2 opacity-80" />
                    <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">Registro Rápido de Cliente</DialogTitle>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-slate-500">Nombre Completo / Razón Social *</Label>
                        <Input 
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Ej: Juan Pérez"
                            className="rounded-xl border-slate-200 h-12 font-bold"
                            autoFocus
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500">Cédula / NIT</Label>
                            <Input 
                                value={formData.taxId}
                                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                                placeholder="102030..."
                                className="rounded-xl border-slate-200 h-12 font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-500">Teléfono</Label>
                            <Input 
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="300..."
                                className="rounded-xl border-slate-200 h-12 font-medium"
                            />
                        </div>
                    </div>
                    
                    <DialogFooter className="pt-4 border-t">
                        <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => onOpenChange(false)}
                            className="rounded-xl h-12 flex-1"
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                        <Button 
                            type="submit" 
                            className="bg-indigo-600 hover:bg-indigo-700 rounded-xl h-12 flex-1 font-black"
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : "REGISTRAR"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
