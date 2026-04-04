"use client"

import { useState, useEffect } from "react"
import { Plus, Wallet, Search, Coins, ArrowDownCircle } from "lucide-react"
import { toast } from "sonner"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface Expense {
    _id: string
    description: string
    amount: number
    category: string
    reference?: string
    notes?: string
    date: string
    createdBy: { _id: string, name: string }
}

export default function GastosView() {
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [loading, setLoading] = useState(true)
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    
    const [formData, setFormData] = useState({
        description: "",
        amount: "",
        category: "Otros",
        reference: "",
        notes: ""
    })

    const fetchExpenses = async () => {
        try {
            const res = await fetch('/api/gastos')
            if (res.ok) {
                const data = await res.json()
                setExpenses(data.expenses || [])
            }
        } catch (error) {
            console.error(error)
            toast.error("Error al cargar los gastos")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchExpenses()
    }, [])

    const handleSubmit = async () => {
        if (!formData.description || !formData.amount) {
            toast.error("Descripción y monto son obligatorios")
            return
        }

        try {
            const res = await fetch('/api/gastos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    amount: Number(formData.amount)
                })
            })
            
            if (res.ok) {
                toast.success("Gasto registrado exitosamente")
                fetchExpenses()
                setIsAddOpen(false)
                setFormData({
                    description: "",
                    amount: "",
                    category: "Otros",
                    reference: "",
                    notes: ""
                })
            } else {
                const errorData = await res.json()
                toast.error(errorData.error || "Error al registrar el gasto")
            }
        } catch (error) {
            toast.error("Error de conexión al guardar el gasto")
        }
    }

    const filteredExpenses = expenses.filter(e => 
        e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.category.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const totalGastos = filteredExpenses.reduce((sum, e) => sum + e.amount, 0)

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex gap-4 items-center">
                    <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shadow-inner">
                        <Wallet size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Gastos Operativos</h1>
                        <p className="text-sm font-bold text-slate-400">Control de egresos diarios y caja menor</p>
                    </div>
                </div>
                <Button 
                    className="h-12 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold"
                    onClick={() => setIsAddOpen(true)}
                >
                    <Plus className="mr-2 h-5 w-5" /> Registrar Gasto
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
                <Card className="h-fit rounded-2xl border-none shadow-md overflow-hidden">
                    <div className="bg-rose-500 p-6 text-white text-center">
                        <ArrowDownCircle size={40} className="mx-auto mb-2 opacity-80" />
                        <h3 className="text-rose-100 text-sm font-bold uppercase tracking-widest mb-1">Total Egresos</h3>
                        <p className="text-4xl font-black">${totalGastos.toLocaleString()}</p>
                    </div>
                    <CardContent className="p-6 bg-white">
                        <p className="text-sm text-slate-500 font-medium mb-4">
                            Los gastos registrados aquí se descontarán automáticamente del dinero en efectivo que la caja espera tener durante el arqueo y cierre de turno.
                        </p>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                            <Input 
                                placeholder="Buscar gasto..." 
                                className="pl-10 h-12 rounded-xl bg-slate-50 border-slate-200"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-none shadow-sm">
                    <CardHeader className="bg-slate-50 rounded-t-2xl border-b border-slate-100 p-5">
                        <CardTitle className="text-lg font-black text-slate-700 flex items-center gap-2">
                            <Coins size={20} className="text-amber-500" />
                            Historial de Movimientos
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-12 text-center text-slate-400 font-bold">Cargando historial...</div>
                        ) : filteredExpenses.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                <Wallet size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="font-bold text-lg">No hay gastos registrados</p>
                                <p className="text-sm">Registra tu primer gasto para verlo aquí.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredExpenses.map((expense) => (
                                    <div key={expense._id} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                <ArrowDownCircle size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-lg leading-none mb-1">{expense.description}</p>
                                                <div className="flex gap-2 items-center text-[10px] font-black uppercase text-slate-400">
                                                    <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{expense.category}</span>
                                                    <span>•</span>
                                                    <span>{new Date(expense.date).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xl font-black text-rose-600">-${expense.amount.toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-[425px] rounded-3xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black tracking-tight text-slate-800">Registrar Salida de Dinero</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-5 py-4">
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-slate-500">Descripción / Concepto</Label>
                            <Input 
                                placeholder="Ej: Pago de recibo de luz" 
                                className="h-12 bg-slate-50 rounded-xl font-medium"
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-slate-500">Monto del Gasto</Label>
                            <Input 
                                type="number" 
                                placeholder="$0" 
                                className="h-14 bg-slate-50 rounded-xl font-black text-2xl"
                                value={formData.amount}
                                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[10px] font-black uppercase text-slate-500">Categoría</Label>
                            <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                                <SelectTrigger className="h-12 bg-slate-50 rounded-xl">
                                    <SelectValue placeholder="Seleccione categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Servicios">Servicios (Luz, Agua, Internet)</SelectItem>
                                    <SelectItem value="Nómina">Pago de Nómina / Día</SelectItem>
                                    <SelectItem value="Insumos">Insumos (Bolsas, Papelería)</SelectItem>
                                    <SelectItem value="Transporte">Transporte / Domicilios</SelectItem>
                                    <SelectItem value="Mantenimiento">Mantenimiento local/equipos</SelectItem>
                                    <SelectItem value="Otros">Otros</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" className="h-12 rounded-xl" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
                        <Button className="h-12 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold" onClick={handleSubmit}>
                            Registrar Gasto
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
