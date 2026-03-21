"use client"

import { useState, useEffect } from "react"
import styles from './customers.module.css'
import { Plus, Edit, Trash2, Users, Mail, Phone, MapPin, History, FileText, Calendar, DollarSign, Search } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useDebounce } from "@/hooks/useDebounce"

interface Customer {
    _id: string
    name: string
    email?: string
    phone?: string
    address?: string
    taxId?: string
    createdAt: string
}

export default function CustomersView() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
    const [isAbonarOpen, setIsAbonarOpen] = useState(false)
    const [selectedSale, setSelectedSale] = useState<any>(null)
    const [paymentAmount, setPaymentAmount] = useState("")
    const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const debouncedSearch = useDebounce(searchTerm, 400)
    
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        address: "",
        taxId: "",
    })

    // History states
    const [historyCustomer, setHistoryCustomer] = useState<Customer | null>(null)
    const [salesHistory, setSalesHistory] = useState<any[]>([])
    const [isHistoryOpen, setIsHistoryOpen] = useState(false)
    const [loadingHistory, setLoadingHistory] = useState(false)

    const [currentUser, setCurrentUser] = useState<any>(null)

    useEffect(() => {
        fetchCustomers()
        fetch("/api/autenticacion/me").then(res => res.json()).then(data => setCurrentUser(data.user))
    }, [])

    const fetchCustomers = async () => {
        try {
            const response = await fetch("/api/clientes")
            if (response.ok) {
                const data = await response.json()
                setCustomers(Array.isArray(data) ? data : [])
            }
        } catch (error) {
            toast.error("Error al cargar clientes")
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const url = editingCustomer ? `/api/clientes/${editingCustomer._id}` : "/api/clientes"
            const method = editingCustomer ? "PUT" : "POST"

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            if (response.ok) {
                toast.success(editingCustomer ? "Cliente actualizado" : "Cliente creado")
                setIsDialogOpen(false)
                resetForm()
                fetchCustomers()
            } else {
                const error = await response.json()
                toast.error(error.error || "Error al guardar cliente")
            }
        } catch (error) {
            toast.error("Error al guardar cliente")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este cliente?")) return

        try {
            const response = await fetch(`/api/clientes/${id}`, { method: "DELETE" })
            if (response.ok) {
                toast.success("Cliente eliminado")
                fetchCustomers()
            } else {
                toast.error("Error al eliminar cliente")
            }
        } catch (error) {
            toast.error("Error al eliminar cliente")
        }
    }

    const resetForm = () => {
        setFormData({ name: "", email: "", phone: "", address: "", taxId: "" })
        setEditingCustomer(null)
    }

    const openEditDialog = (customer: Customer) => {
        setEditingCustomer(customer)
        setFormData({
            name: customer.name,
            email: customer.email || "",
            phone: customer.phone || "",
            address: customer.address || "",
            taxId: customer.taxId || "",
        })
        setIsDialogOpen(true)
    }

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    const fetchHistory = async (customer: Customer) => {
        setHistoryCustomer(customer)
        setIsHistoryOpen(true)
        setLoadingHistory(true)
        try {
            const response = await fetch(`/api/ventas?clientId=${customer._id}`)
            if (response.ok) {
                const data = await response.json()
                setSalesHistory(data.sales || [])
            }
        } catch (error) {
            toast.error("Error al cargar historial")
        } finally {
            setLoadingHistory(false)
        }
    }

    const handleAbonar = async () => {
        if (!paymentAmount || isNaN(Number(paymentAmount)) || Number(paymentAmount) <= 0) return
        setIsSubmittingPayment(true)
        try {
            const targetId = selectedSale?._id;
            const url = targetId ? `/api/ventas/${targetId}` : `/api/clientes/${historyCustomer?._id}/abono-general`;
            
            // Si es abono general (targetId null), enviamos al endpoint de abono masivo si existe, 
            // o procesamos secuencialmente aquí. 
            // Para simplicidad en este paso, usaremos la lógica secuencial previa.
            
            if (!targetId) {
                let remainingAmount = Number(paymentAmount)
                const unpaidSales = [...salesHistory]
                    .filter(s => (s.total - (s.amountPaid || 0)) > 0)
                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                
                for (const sale of unpaidSales) {
                    if (remainingAmount <= 0) break
                    const currentBalance = sale.total - (sale.amountPaid || 0)
                    const amountToApply = Math.min(remainingAmount, currentBalance)
                    
                    await fetch(`/api/ventas/${sale._id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ amount: amountToApply })
                    })
                    remainingAmount -= amountToApply
                }
                toast.success("Abono general procesado")
            } else {
                const response = await fetch(url, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ amount: Number(paymentAmount) })
                })
                if (response.ok) toast.success("Pago registrado")
                else throw new Error("Error en pago")
            }
            
            setIsAbonarOpen(false)
            setPaymentAmount("")
            if (historyCustomer) fetchHistory(historyCustomer)
        } catch (error) {
            toast.error("Error al procesar pago")
        } finally {
            setIsSubmittingPayment(false)
        }
    }

    const filteredCustomers = customers.filter(c => 
        c.name.toLowerCase().includes(debouncedSearch.toLowerCase()) || 
        (c.taxId && c.taxId.includes(debouncedSearch)) ||
        (c.email && c.email.toLowerCase().includes(debouncedSearch.toLowerCase()))
    )

    return (
        <div className={styles.container}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight flex items-center gap-3">
                        <Users className="text-primary" size={32} /> Clientes
                    </h1>
                    <p className="text-slate-500 font-medium">Gestiona tu base de datos de clientes y deudas</p>
                </div>
                <Button onClick={() => { resetForm(); setIsDialogOpen(true) }} className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 h-12 px-6 rounded-xl font-bold">
                    <Plus className="mr-2" size={20} /> Nuevo Cliente
                </Button>
            </div>

            <div className="bg-white p-4 rounded-2xl border shadow-sm mb-8 flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre, NIT o correo..." 
                        className="w-full pl-12 pr-4 h-12 border-2 border-slate-100 rounded-xl text-sm outline-none focus:border-primary transition-all font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    <Badge variant="outline" className="px-3 py-1.5 rounded-lg border-slate-200 text-slate-600 font-bold">{customers.length} Registrados</Badge>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20 text-slate-400 animate-pulse">Cargando base de datos...</div>
            ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <Users size={64} className="mx-auto mb-4 text-slate-300" />
                    <h3 className="text-xl font-bold text-slate-800">No se encontraron clientes</h3>
                    <p className="text-slate-500">Intenta con otro término de búsqueda o crea uno nuevo.</p>
                </div>
            ) : (
                <div className={styles.customerGrid}>
                    {filteredCustomers.map((customer) => (
                        <div key={customer._id} className={styles.customerCard}>
                            <div className={styles.customerHeader}>
                                <div className={styles.customerAvatar}>
                                    {getInitials(customer.name)}
                                </div>
                                <div className={styles.customerInfo}>
                                    <div className={styles.customerName}>{customer.name}</div>
                                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{customer.taxId || "Sin NIT"}</div>
                                </div>
                            </div>

                            <div className={styles.customerDetails}>
                                {customer.email && <div className={styles.detailRow}><Mail size={14} className="text-slate-400" /><span>{customer.email}</span></div>}
                                {customer.phone && <div className={styles.detailRow}><Phone size={14} className="text-slate-400" /><span>{customer.phone}</span></div>}
                                {customer.address && <div className={styles.detailRow}><MapPin size={14} className="text-slate-400" /><span>{customer.address}</span></div>}
                            </div>

                            <div className={styles.customerActions}>
                                <Button
                                    variant="outline"
                                    onClick={() => fetchHistory(customer)}
                                    className="flex-1 min-w-[120px] h-10 border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[10px] sm:text-xs rounded-lg px-2 overflow-hidden truncate"
                                    title="Ver Historial y Abonar"
                                >
                                    <DollarSign size={14} className="mr-1 shrink-0" /> Historial / Abono
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEditDialog(customer)}
                                    className="h-10 w-10 shrink-0 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg"
                                    title="Editar Cliente"
                                >
                                    <Edit size={16} />
                                </Button>
                                {currentUser?.role === 'admin' && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(customer._id)}
                                        className="h-10 w-10 shrink-0 text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg"
                                        title="Eliminar Cliente"
                                    >
                                        <Trash2 size={16} />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md bg-white rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black text-slate-800 tracking-tight">
                            {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-400">Nombre Completo *</label>
                            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full h-12 px-4 border-2 rounded-xl focus:border-primary outline-none transition-all font-medium" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-400">Teléfono</label>
                                <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full h-12 px-4 border-2 rounded-xl focus:border-primary outline-none transition-all font-medium" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase text-slate-400">NIT/CC</label>
                                <input type="text" value={formData.taxId} onChange={(e) => setFormData({ ...formData, taxId: e.target.value })} className="w-full h-12 px-4 border-2 rounded-xl focus:border-primary outline-none transition-all font-medium" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-400">Email</label>
                            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full h-12 px-4 border-2 rounded-xl focus:border-primary outline-none transition-all font-medium" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase text-slate-400">Dirección</label>
                            <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full p-4 border-2 rounded-xl focus:border-primary outline-none transition-all font-medium" rows={2} />
                        </div>
                        <div className="flex gap-3 pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 h-12 rounded-xl font-bold">Cancelar</Button>
                            <Button type="submit" disabled={loading} className="flex-1 h-12 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20">
                                {loading ? 'Guardando...' : (editingCustomer ? 'Actualizar' : 'Crear Cliente')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col bg-white rounded-3xl">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
                                <History size={24} />
                            </div>
                            <span>Historial: {historyCustomer?.name}</span>
                        </DialogTitle>
                    </DialogHeader>

                    {salesHistory.length > 0 && (
                        <div className="px-6 py-2">
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-slate-50 border rounded-2xl p-4">
                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">Total Comprado</span>
                                    <span className="text-xl font-black text-slate-800">${salesHistory.reduce((acc, sale) => acc + (sale.total || 0), 0).toLocaleString()}</span>
                                </div>
                                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                                    <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest block mb-1">Total Abonado</span>
                                    <span className="text-xl font-black text-emerald-700">${salesHistory.reduce((acc, sale) => acc + (sale.amountPaid || 0), 0).toLocaleString()}</span>
                                </div>
                                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
                                    <span className="text-[10px] text-rose-500 font-black uppercase tracking-widest block mb-1">Saldo Deuda</span>
                                    <span className="text-xl font-black text-rose-700">${salesHistory.reduce((acc, sale) => acc + (sale.total - (sale.amountPaid || 0)), 0).toLocaleString()}</span>
                                </div>
                            </div>
                            
                            {salesHistory.reduce((acc, sale) => acc + (sale.total - (sale.amountPaid || 0)), 0) > 0 && (
                                <Button 
                                    className="w-full mt-4 h-14 text-lg font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-xl shadow-emerald-200 gap-3"
                                    onClick={() => { setSelectedSale(null); setPaymentAmount(""); setIsAbonarOpen(true); }}
                                >
                                    <DollarSign /> REGISTRAR ABONO GENERAL
                                </Button>
                            )}
                        </div>
                    )}

                    <div className={`flex-1 overflow-y-auto px-6 pb-6 mt-4 ${styles.historyContainer}`}>
                        <div className="sticky top-0 bg-white pb-2 z-10">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">
                                <span>Detalle de Factura</span>
                                <span>Monto / Saldo</span>
                            </div>
                        </div>
                        {loadingHistory ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="animate-spin text-primary" size={32} />
                                <p className="text-slate-400 font-bold">Analizando facturas...</p>
                            </div>
                        ) : salesHistory.length === 0 ? (
                            <div className="text-center py-20 bg-slate-50 rounded-2xl border-2 border-dashed">
                                <FileText className="h-16 w-16 mx-auto mb-4 text-slate-200" />
                                <p className="text-slate-500 font-medium">Este cliente no registra compras aún.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {salesHistory.map((sale) => (
                                    <div key={sale._id} className="border-2 rounded-2xl p-5 hover:border-slate-300 transition-colors bg-white shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <div className="flex gap-4">
                                                <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-black">#{sale._id.slice(-4).toUpperCase()}</div>
                                                <div>
                                                    <div className="font-black text-slate-800">{new Date(sale.createdAt).toLocaleDateString('es-ES', { month: 'long', day: 'numeric', year: 'numeric' })}</div>
                                                    <div className="text-xs text-slate-400">{new Date(sale.createdAt).toLocaleTimeString()} • {sale.items?.length || 0} productos</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-2xl font-black text-slate-900">${sale.total.toLocaleString()}</div>
                                                <Badge variant={sale.total > (sale.amountPaid || 0) ? 'destructive' : 'default'} className="mt-1 font-black">
                                                    {sale.total > (sale.amountPaid || 0) ? `PENDIENTE: $${(sale.total - (sale.amountPaid || 0)).toLocaleString()}` : "PAGADO"}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isAbonarOpen} onOpenChange={setIsAbonarOpen}>
                <DialogContent className="sm:max-w-[400px] bg-white rounded-3xl p-0 overflow-hidden">
                    <div className="bg-emerald-600 p-6 text-white text-center">
                        <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4"><DollarSign size={32} /></div>
                        <h2 className="text-2xl font-black italic uppercase">Registrar Abono</h2>
                        <p className="text-emerald-100 text-sm font-medium">Ingresa el monto que entrega el cliente</p>
                    </div>
                    <div className="p-8 space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-slate-400">Monto del Pago</label>
                            <input
                                type="number"
                                autoFocus
                                className="w-full text-center h-20 text-5xl font-black bg-slate-50 border-4 border-emerald-100 rounded-3xl outline-none focus:border-emerald-500 transition-all text-emerald-700"
                                placeholder="$0"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-3">
                            <Button variant="outline" className="flex-1 h-14 rounded-2xl font-black border-slate-200" onClick={() => setIsAbonarOpen(false)}>CANCELAR</Button>
                            <Button className="flex-1 h-14 rounded-2xl font-black bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-200" onClick={handleAbonar} disabled={isSubmittingPayment || !paymentAmount}>
                                {isSubmittingPayment ? <Loader2 className="animate-spin" /> : "GUARDAR PAGO"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

const Loader2 = ({ className, size = 24 }: { className?: string, size?: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={cn("animate-spin", className)}><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
)
