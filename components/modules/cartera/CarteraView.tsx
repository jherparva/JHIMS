"use client"

import { useState, useEffect } from "react"
import { Users, Banknote, Search, ChevronDown, HandCoins } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface CustomerDebt {
    customer: { _id: string, name: string, phone?: string, docId?: string }
    totalDebt: number
    sales: any[]
}

export default function CarteraView() {
    const [cartera, setCartera] = useState<CustomerDebt[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null)
    
    // Modal Abonos
    const [isAbonoOpen, setIsAbonoOpen] = useState(false)
    const [selectedSale, setSelectedSale] = useState<any>(null)
    const [abonoAmount, setAbonoAmount] = useState("")
    const [paymentMethod, setPaymentMethod] = useState("cash")

    const fetchCartera = async () => {
        try {
            const res = await fetch('/api/cartera')
            if (res.ok) {
                const data = await res.json()
                setCartera(data.cartera || [])
            }
        } catch (error) {
            toast.error("Error al cargar la cartera")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchCartera()
    }, [])

    const handleOpenAbono = (sale: any) => {
        setSelectedSale(sale)
        setAbonoAmount(sale.balance.toString()) 
        setIsAbonoOpen(true)
    }

    const handleAbonar = async () => {
        if (!abonoAmount || Number(abonoAmount) <= 0) {
            toast.error("Ingresa un monto válido")
            return
        }
        if (Number(abonoAmount) > selectedSale.balance) {
            toast.error("El abono no puede superar la deuda actual")
            return
        }

        try {
            const res = await fetch('/api/cartera', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    saleId: selectedSale._id,
                    amount: Number(abonoAmount),
                    paymentMethod
                })
            })
            
            if (res.ok) {
                toast.success("Abono registrado con éxito")
                setIsAbonoOpen(false)
                fetchCartera()
            } else {
                const data = await res.json()
                toast.error(data.error || "Error al registrar abono")
            }
        } catch (error) {
            toast.error("Error de conexión al abonar")
        }
    }

    const filteredCartera = cartera.filter(c => 
        c.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.customer.docId && c.customer.docId.includes(searchTerm))
    );

    const globalDebt = filteredCartera.reduce((sum, c) => sum + c.totalDebt, 0);

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex gap-4 items-center">
                    <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shadow-inner">
                        <Users size={28} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Cartera (Cuentas por Cobrar)</h1>
                        <p className="text-sm font-bold text-slate-400">Control de clientes y saldos pendientes</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
                {/* Resumen Global */}
                <Card className="h-fit rounded-2xl border-none shadow-md overflow-hidden">
                    <div className="bg-indigo-600 p-6 text-white text-center">
                        <HandCoins size={40} className="mx-auto mb-2 opacity-80" />
                        <h3 className="text-indigo-200 text-sm font-bold uppercase tracking-widest mb-1">Total por Cobrar</h3>
                        <p className="text-4xl font-black">${globalDebt.toLocaleString()}</p>
                    </div>
                    <CardContent className="p-6 bg-white space-y-4">
                        <p className="text-sm text-slate-500 font-medium">
                            Busca un cliente para ver el detalle de sus facturas pendientes y registrar abonos a su deuda.
                        </p>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                            <Input 
                                placeholder="Buscar cliente o cédula..." 
                                className="pl-10 h-12 rounded-xl bg-slate-50 border-slate-200"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Lista de Deudores */}
                <Card className="rounded-2xl border-none shadow-sm">
                    <CardHeader className="bg-slate-50 rounded-t-2xl border-b border-slate-100 p-5">
                        <CardTitle className="text-lg font-black text-slate-700 flex items-center gap-2">
                            <Banknote size={20} className="text-indigo-500" />
                            Directorio de Deudores
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {loading ? (
                            <div className="p-12 text-center text-slate-400 font-bold">Cargando cuentas por cobrar...</div>
                        ) : filteredCartera.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                <Users size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="font-bold text-lg">Cartera sana y limpia</p>
                                <p className="text-sm">No hay clientes con saldos pendientes.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {filteredCartera.map((item) => (
                                    <div key={item.customer._id} className="flex flex-col">
                                        {/* Fila del Cliente */}
                                        <div 
                                            className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer"
                                            onClick={() => setExpandedCustomer(expandedCustomer === item.customer._id ? null : item.customer._id)}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full border-2 border-indigo-100 bg-white flex items-center justify-center text-indigo-600 font-black text-xl shadow-sm">
                                                    {item.customer.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-800 text-lg leading-none mb-1">{item.customer.name}</p>
                                                    <div className="flex gap-2 items-center text-[10px] font-black uppercase text-slate-400">
                                                        {item.customer.docId && <span>NIT/CC: {item.customer.docId}</span>}
                                                        {item.customer.phone && <><span>•</span><span>Tel: {item.customer.phone}</span></>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-4">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-slate-400">Deuda Total</p>
                                                    <p className="text-xl font-black text-indigo-600">${item.totalDebt.toLocaleString()}</p>
                                                </div>
                                                <ChevronDown className={`transition-transform text-slate-400 ${expandedCustomer === item.customer._id ? 'rotate-180' : ''}`} />
                                            </div>
                                        </div>

                                        {/* Detalle de Facturas (Acordeón) */}
                                        {expandedCustomer === item.customer._id && (
                                            <div className="bg-slate-50 border-y border-slate-100 p-6 flex flex-col gap-3">
                                                <p className="text-xs font-black uppercase text-slate-500 mb-2">Facturas Pendientes</p>
                                                {item.sales.map((sale: any) => (
                                                    <div key={sale._id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                                                        <div>
                                                            <p className="font-bold text-slate-800">{sale.ticketNumber}</p>
                                                            <p className="text-xs text-slate-500">{new Date(sale.date).toLocaleDateString()}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs text-slate-400 uppercase font-bold">Total: ${sale.total.toLocaleString()}</p>
                                                            <p className="font-bold text-rose-600">Debe: ${sale.balance.toLocaleString()}</p>
                                                        </div>
                                                        <Button 
                                                            size="sm" 
                                                            className="bg-indigo-600 hover:bg-indigo-700 font-bold"
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleOpenAbono(sale)
                                                            }}
                                                        >
                                                            Abonar
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Modal de Abono */}
            <Dialog open={isAbonoOpen} onOpenChange={setIsAbonoOpen}>
                <DialogContent className="sm:max-w-[400px] rounded-3xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black tracking-tight text-slate-800 flex items-center gap-2">
                            <HandCoins className="text-indigo-500" /> Registrar Abono
                        </DialogTitle>
                    </DialogHeader>
                    {selectedSale && (
                        <div className="grid gap-5 py-4">
                            <div className="bg-slate-50 p-4 rounded-2xl border text-center">
                                <p className="text-xs font-bold uppercase text-slate-500">Deuda Restante de {selectedSale.ticketNumber}</p>
                                <p className="text-3xl font-black text-rose-600">${selectedSale.balance.toLocaleString()}</p>
                            </div>
                            
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-500">Valor a Abonar</Label>
                                <Input 
                                    type="number" 
                                    className="h-14 text-2xl font-black text-center rounded-xl bg-slate-50 focus-visible:ring-indigo-500"
                                    value={abonoAmount}
                                    onChange={(e) => setAbonoAmount(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black uppercase text-slate-500">Método de Pago</Label>
                                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                                    <SelectTrigger className="h-12 bg-slate-50 rounded-xl font-bold">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="cash">💵 Efectivo</SelectItem>
                                        <SelectItem value="transfer">🏦 Transferencia / QR</SelectItem>
                                        <SelectItem value="card">💳 Tarjeta / Datáfono</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" className="h-12 w-full rounded-xl" onClick={() => setIsAbonoOpen(false)}>Cancelar</Button>
                        <Button className="h-12 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold" onClick={handleAbonar}>Confirmar Abono</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
