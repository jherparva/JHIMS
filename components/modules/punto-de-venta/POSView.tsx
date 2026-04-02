"use client"

import { useState, useEffect } from "react"
import styles from './pos.module.css'
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, CheckCircle2, FileText, Wallet, LogOut, Banknote, Landmark, Pencil, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useDebounce } from "@/hooks/useDebounce"
import { cn } from "@/lib/utils"

interface Product {
    _id: string
    name: string
    salePrice: number
    stock: number
    sku: string
}

interface CartItem {
    product: Product
    quantity: number
}

export default function POSView() {
    const [products, setProducts] = useState<Product[]>([])
    const [cart, setCart] = useState<CartItem[]>([])
    const [searchTerm, setSearchTerm] = useState("")
    const [loading, setLoading] = useState(true)
    const [paymentMethod, setPaymentMethod] = useState("cash")
    const [isReceiptOpen, setIsReceiptOpen] = useState(false)
    const [isThermalPrint, setIsThermalPrint] = useState(false)
    const [isArqueoOpen, setIsArqueoOpen] = useState(false)
    const [physicalCash, setPhysicalCash] = useState<string>("")
    const [lastSale, setLastSale] = useState<{_id?: string, ticketNumber?: string, items: CartItem[], total: number, date: string, paymentMethod: string} | null>(null)
    const [companyInfo, setCompanyInfo] = useState<any>(null)
    const [stats, setStats] = useState<any>(null)
    const debouncedSearch = useDebounce(searchTerm, 350)
    
    const [customers, setCustomers] = useState<{_id: string, name: string}[]>([])
    const [selectedCustomer, setSelectedCustomer] = useState("")
    const [amountPaid, setAmountPaid] = useState<string>("")
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [isQuickEditOpen, setIsQuickEditOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [quickFormData, setQuickFormData] = useState({ name: "", salePrice: 0 })

    const fetchUser = async () => {
        try {
            const response = await fetch("/api/autenticacion/me")
            if (response.ok) {
                const data = await response.json()
                setCurrentUser(data.user)
            }
        } catch (e) {}
    }

    useEffect(() => {
        fetchProducts()
        fetchCustomers()
        fetchCompanyInfo()
        fetchStats()
        fetchUser()
    }, [])

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/dashboard')
            if (res.ok) setStats(await res.json())
        } catch (e) {}
    }

    const fetchCompanyInfo = async () => {
        try {
            const res = await fetch('/api/empresa/profile')
            if (res.ok) {
                const data = await res.json()
                setCompanyInfo(data)
            }
        } catch (error) {
            console.error("Error al cargar info de empresa", error)
        }
    }

    const fetchCustomers = async () => {
        try {
            const res = await fetch("/api/clientes")
            if (res.ok) {
                const data = await res.json()
                setCustomers(data)
            }
        } catch (error) {
            console.error("Error al cargar clientes")
        }
    }

    const fetchProducts = async () => {
        try {
            const response = await fetch("/api/productos")
            if (response.ok) {
                const data = await response.json()
                setProducts(Array.isArray(data.products) ? data.products : [])
            }
        } catch (error) {
            toast.error("Error al cargar productos")
        } finally {
            setLoading(false)
        }
    }

    const addToCart = (product: Product) => {
        const existingItem = cart.find(item => item.product._id === product._id)

        if (existingItem) {
            if (existingItem.quantity >= product.stock) {
                toast.error("Stock insuficiente")
                return
            }
            setCart(cart.map(item =>
                item.product._id === product._id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ))
        } else {
            setCart([...cart, { product, quantity: 1 }])
        }
    }

    const updateQuantity = (productId: string, delta: number) => {
        setCart(cart.map(item => {
            if (item.product._id === productId) {
                const newQuantity = item.quantity + delta
                if (newQuantity > item.product.stock) {
                    toast.error("Stock insuficiente")
                    return item
                }
                return { ...item, quantity: Math.max(0, newQuantity) }
            }
            return item
        }).filter(item => item.quantity > 0))
    }

    const removeFromCart = (productId: string) => {
        setCart(cart.filter(item => item.product._id !== productId))
    }

    const getTotal = () => {
        return cart.reduce((sum, item) => sum + (item.product.salePrice * item.quantity), 0)
    }

    const handleCheckout = async () => {
        if (cart.length === 0) {
            toast.error("El carrito está vacío")
            return
        }

        try {
            const response = await fetch('/api/ventas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart,
                    total: getTotal(),
                    paymentMethod: paymentMethod,
                    customer: selectedCustomer || null,
                    amountPaid: amountPaid ? Number(amountPaid) : getTotal()
                })
            })

            if (response.ok) {
                const newSale = await response.json()
                const saleData = {
                    _id: newSale._id,
                    ticketNumber: newSale.ticketNumber,
                    items: [...cart],
                    total: getTotal(),
                    date: new Date().toLocaleString(),
                    paymentMethod: paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'card' ? 'Tarjeta' : 'Transferencia'
                }
                setLastSale(saleData)
                setIsReceiptOpen(true)
                
                toast.success("Venta procesada exitosamente")
                setCart([])
                setSelectedCustomer("")
                setAmountPaid("")
                fetchProducts()
                fetchStats()
            } else {
                toast.error("Error al procesar venta")
            }
        } catch (error) {
            toast.error("Error de conexión")
        }
    }

    const handleQuickEdit = (e: React.MouseEvent, product: Product) => {
        e.stopPropagation() // Evitar agregar al carrito
        setEditingProduct(product)
        setQuickFormData({ name: product.name, salePrice: product.salePrice })
        setIsQuickEditOpen(true)
    }

    const handleQuickSave = async () => {
        if (!editingProduct) return
        try {
            // Enviamos el producto completo para no perder datos (SKU, Stock, etc)
            // que el endpoint PUT espera o podría sobreescribir como null
            const res = await fetch(`/api/productos/${editingProduct._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...editingProduct, // Mantener campos existentes (sku, stock, etc)
                    name: quickFormData.name,
                    salePrice: Number(quickFormData.salePrice),
                    // Mapeo específico para lo que espera el backend de JHIMS_V2
                    categoryId: (editingProduct as any).category?._id || (editingProduct as any).category,
                    supplierId: (editingProduct as any).supplier?._id || (editingProduct as any).supplier,
                    costPrice: (editingProduct as any).purchasePrice,
                })
            })
            if (res.ok) {
                toast.success("Producto actualizado")
                setIsQuickEditOpen(false)
                fetchProducts()
            } else {
                const err = await res.json()
                toast.error(err.error || "Error al guardar")
            }
        } catch (error) {
            toast.error("Error al guardar")
        }
    }

    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        product.sku.toLowerCase().includes(debouncedSearch.toLowerCase())
    )

    const handlePrint = (thermal: boolean) => {
        setIsThermalPrint(thermal);
        setTimeout(() => {
            window.print();
        }, 100);
    }

    const openDrawer = () => {
        toast.info("Comando enviado a la impresora para abrir el cajón");
    }

    return (
        <div className={styles.container}>
            <div className={styles.productsSection}>
                <div className={styles.searchBar}>
                    <Search size={20} className="text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar productos o escanear código..."
                        className="flex-1 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && searchTerm.trim() !== '') {
                                // Buscar coincidencia exacta por SKU (Código de barras)
                                const exactMatch = products.find(p => 
                                    p.sku.toLowerCase() === searchTerm.trim().toLowerCase()
                                );
                                
                                if (exactMatch) {
                                    if (exactMatch.stock <= 0) {
                                        toast.error(`Sin stock para: ${exactMatch.name}`);
                                    } else {
                                        addToCart(exactMatch);
                                        toast.success(`Añadido: ${exactMatch.name}`);
                                        setSearchTerm(""); // Limpiar para siguiente escaneo
                                    }
                                }
                            }
                        }}
                    />
                </div>

                <div className={styles.productsGrid}>
                    {loading ? (
                        <div className="col-span-full text-center py-12 text-gray-500">Cargando productos...</div>
                    ) : filteredProducts.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-gray-500">No se encontraron productos</div>
                    ) : (
                        filteredProducts.map((product) => (
                            <div key={product._id} className={cn(styles.productCard, "relative group")} onClick={() => addToCart(product)}>
                                {currentUser?.role === 'admin' && (
                                    <button 
                                        onClick={(e) => handleQuickEdit(e, product)}
                                        className="mb-2 w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity absolute top-2 right-2 border border-blue-100 hover:bg-blue-100 shadow-sm z-10"
                                        title="Editar nombre/precio"
                                    >
                                        <Pencil size={14} />
                                    </button>
                                )}
                                <div className={styles.productName}>{product.name}</div>
                                <div className={styles.productPrice}>${product.salePrice.toLocaleString()}</div>
                                <div className={styles.productStock}>Stock: {product.stock}</div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className={styles.cartSection}>
                <div className={styles.cartHeader}>
                    <div className={styles.cartTitle}>
                        <ShoppingCart size={24} className="inline mr-2" />
                        Carrito ({cart.length})
                    </div>
                    <div className="flex gap-1">
                        <Button variant="outline" size="icon" className="h-9 w-9 border-amber-200 bg-amber-50 text-amber-700" onClick={openDrawer}>
                            <Wallet size={18} />
                        </Button>
                        <Button variant="outline" size="icon" className="h-9 w-9 border-emerald-200 bg-emerald-50 text-emerald-700" onClick={() => setIsArqueoOpen(true)}>
                            <Banknote size={18} />
                        </Button>
                    </div>
                </div>

                <div className={styles.cartItems}>
                    {cart.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">El carrito está vacío</div>
                    ) : (
                        cart.map((item) => (
                            <div key={item.product._id} className={styles.cartItem}>
                                <div className={styles.itemInfo}>
                                    <div className={styles.itemName}>{item.product.name}</div>
                                    <div className={styles.itemPrice}>${item.product.salePrice.toLocaleString()} x {item.quantity}</div>
                                </div>
                                <div className={styles.itemControls}>
                                    <button className={styles.quantityBtn} onClick={() => updateQuantity(item.product._id, -1)}><Minus size={16} /></button>
                                    <span className={styles.quantity}>{item.quantity}</span>
                                    <button className={styles.quantityBtn} onClick={() => updateQuantity(item.product._id, 1)}><Plus size={16} /></button>
                                    <button className={styles.quantityBtn} onClick={() => removeFromCart(item.product._id)}><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className={styles.cartFooter}>
                    <div className="space-y-4 mb-4 p-3 bg-muted/30 rounded-lg border">
                        <select className="w-full border rounded-md p-2 text-sm" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                            <option value="">Consumidor Final</option>
                            {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                        <select className="w-full border rounded-md p-2 text-sm" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                            <option value="cash">Efectivo</option>
                            <option value="card">Tarjeta</option>
                            <option value="transfer">Transferencia</option>
                        </select>
                        <input type="number" className="w-full border rounded-md p-2 text-sm" placeholder="Monto Abona" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
                        
                        {/* Nueva sección de Pago QR/Transferencia */}
                        {paymentMethod === 'transfer' && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-2 animate-in fade-in zoom-in duration-300">
                                <p className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-1">
                                    <Banknote size={12} /> Pagar por Transferencia
                                </p>
                                {companyInfo?.paymentQR ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <img 
                                            src={companyInfo.paymentQR} 
                                            alt="QR de Pago" 
                                            className="w-32 h-32 object-contain bg-white p-1 rounded-lg border shadow-sm"
                                        />
                                        <p className="text-[10px] text-center font-bold text-slate-600 leading-tight">
                                            {companyInfo.paymentInfo || 'Escanea para pagar'}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="text-[10px] text-blue-700 italic text-center p-2">
                                        {companyInfo?.paymentInfo || "No hay información de pago configurada en 'Configuración > Empresa'"}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className={styles.totalRow}>
                        <span className={styles.totalLabel}>Total:</span>
                        <span className={styles.totalValue}>${getTotal().toLocaleString()}</span>
                    </div>
                    <button className={styles.checkoutBtn} onClick={handleCheckout} disabled={cart.length === 0}>Procesar Venta</button>
                </div>
            </div>

            <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
                <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden border-none shadow-2xl print:shadow-none print:max-w-none print:w-full print:static print:transform-none">
                    <DialogHeader className="p-6 bg-slate-900 text-white print:bg-white print:text-black print:pb-2 print:pt-4">
                        <DialogTitle className="flex justify-between items-start">
                            <div className="flex flex-col text-left">
                                <span className="text-emerald-400 font-bold flex items-center gap-2 print:hidden text-sm mb-2">
                                    <CheckCircle2 className="h-5 w-5" /> ¡Venta Exitosa!
                                </span>
                                <h2 className="text-2xl font-black tracking-tighter uppercase leading-none print:text-3xl">
                                    {companyInfo?.name || 'MI NEGOCIO'}
                                </h2>
                                <div className="mt-1 text-slate-400 print:text-black text-[10px] font-bold space-y-0.5">
                                    <p>NIT: {companyInfo?.taxId || '---'}</p>
                                    <p>{companyInfo?.address || 'Dirección no registrada'}</p>
                                    <p>TEL: {companyInfo?.phone || '---'}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase print:bg-black print:text-white">
                                    {isThermalPrint ? 'Ticket de Venta' : 'Factura de Venta'}
                                </span>
                                <p className="mt-2 font-mono text-sm font-bold">{lastSale?.ticketNumber}</p>
                            </div>
                        </DialogTitle>
                    </DialogHeader>

                    {lastSale && (
                        <div className="p-6 pt-2 flex flex-col h-full print:p-4">
                            <div className="grid grid-cols-2 gap-4 mb-6 text-sm print:mb-4">
                                <div className="bg-slate-50 p-4 rounded-2xl border print:p-2 print:rounded-none print:border-x-0 print:border-t-0">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Detalles</p>
                                    <p><strong>Fecha:</strong> {lastSale.date}</p>
                                    <p><strong>Método:</strong> {lastSale.paymentMethod}</p>
                                </div>
                                <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-right print:p-2 print:rounded-none print:bg-white print:border-x-0 print:border-t-0">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Total a Pagar</p>
                                    <p className="text-3xl font-black text-emerald-700 print:text-black">${lastSale.total.toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="border rounded-2xl overflow-hidden print:border-x-0 print:rounded-none">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 border-b print:bg-white">
                                        <tr>
                                            <th className="p-3 text-left font-black uppercase text-[10px]">Descripción</th>
                                            <th className="p-3 text-center font-black uppercase text-[10px]">Cant</th>
                                            <th className="p-3 text-right font-black uppercase text-[10px]">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {lastSale.items.map((item, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50">
                                                <td className="p-3 font-medium">{item.product.name}</td>
                                                <td className="p-3 text-center">{item.quantity}</td>
                                                <td className="p-3 text-right font-bold">${(item.product.salePrice * item.quantity).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-8 flex gap-3 print:hidden">
                                <Button 
                                    variant="outline" 
                                    className="flex-1 h-14 rounded-2xl font-bold border-2" 
                                    onClick={() => setIsReceiptOpen(false)}
                                >
                                    Cerrar
                                </Button>
                                <Button 
                                    className="flex-1 h-14 rounded-2xl font-black bg-slate-900 text-white hover:bg-slate-800 shadow-xl gap-2" 
                                    onClick={() => handlePrint(true)}
                                >
                                    <Printer size={20} />
                                    Ticket (80mm)
                                </Button>
                                <Button 
                                    className="flex-1 h-14 rounded-2xl font-black bg-blue-600 text-white hover:bg-blue-500 shadow-xl gap-2" 
                                    onClick={() => handlePrint(false)}
                                >
                                    <FileText size={20} />
                                    Factura (A4)
                                </Button>
                            </div>

                            {/* Footer para Impresión */}
                            <div className="hidden print:block mt-8 text-center pt-6 border-t border-dashed">
                                <p className="text-sm font-black uppercase tracking-widest">¡Gracias por su compra!</p>
                                <p className="text-[9px] text-slate-500 mt-1">JHIMS - Sistema de Gestión Inteligente</p>
                                <div className="mt-4 flex justify-center opacity-20">
                                    <div className="h-0.5 w-16 bg-black" />
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={isArqueoOpen} onOpenChange={setIsArqueoOpen}>
                <DialogContent className="max-w-md bg-white">
                    <DialogHeader><DialogTitle className="flex items-center gap-2 font-black italic uppercase">Arqueo de Caja</DialogTitle></DialogHeader>
                    <div className="space-y-6 pt-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border space-y-3 font-bold">
                            <div className="flex justify-between"><span>Ventas Sistema:</span><span>${(stats?.todaySales || 0).toLocaleString()}</span></div>
                            <div className="flex justify-between text-emerald-700"><span>Esperado:</span><span>${(stats?.todaySales || 0).toLocaleString()}</span></div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-slate-500">Efectivo Físico</label>
                            <input type="number" className="w-full h-16 border-2 rounded-2xl px-4 text-3xl font-black" value={physicalCash} onChange={(e) => setPhysicalCash(e.target.value)} />
                        </div>
                        {physicalCash && (
                            <div className={cn("p-4 rounded-2xl border text-center font-bold", Number(physicalCash) - (stats?.todaySales || 0) < 0 ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700")}>
                                <p className="text-xs uppercase">Diferencia</p>
                                <p className="text-3xl">${(Number(physicalCash) - (stats?.todaySales || 0)).toLocaleString()}</p>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="outline" className="h-12" onClick={() => setIsArqueoOpen(false)}>Cancelar</Button>
                            <Button className="h-12 bg-slate-900 text-white" onClick={() => { toast.success("Cierre procesado"); setIsArqueoOpen(false); }}>Cerrar Turno</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={isQuickEditOpen} onOpenChange={setIsQuickEditOpen}>
                <DialogContent className="max-w-xs bg-white rounded-3xl p-6">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                             <Pencil size={18} className="text-blue-500" /> Edición Rápida
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 px-1">Nombre</label>
                            <input 
                                type="text" 
                                className="w-full h-11 px-4 bg-slate-50 border-2 rounded-xl focus:border-blue-500 outline-none transition-all font-bold text-sm"
                                value={quickFormData.name}
                                onChange={(e) => setQuickFormData({ ...quickFormData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 px-1">Precio de Venta</label>
                            <input 
                                type="number" 
                                className="w-full h-11 px-4 bg-slate-50 border-2 rounded-xl focus:border-emerald-500 outline-none transition-all font-black text-lg text-emerald-700"
                                value={quickFormData.salePrice}
                                onChange={(e) => setQuickFormData({ ...quickFormData, salePrice: Number(e.target.value) })}
                            />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button variant="outline" className="flex-1 h-11 rounded-2xl font-bold" onClick={() => setIsQuickEditOpen(false)}>Cancelar</Button>
                            <Button className="flex-1 h-11 rounded-2xl font-black bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200" onClick={handleQuickSave}>
                                Guardar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <style jsx global>{`
                @media print {
                    @page { 
                        margin: ${isThermalPrint ? '0' : '10mm'}; 
                        size: ${isThermalPrint ? '80mm auto' : 'auto'}; 
                    }
                    
                    /* Limpieza profunda de UI para impresión */
                    header, footer, nav, aside, 
                    .print\\:hidden, 
                    [class*="DialogOverlay"],
                    button[aria-label="Close"],
                    .lucide,
                    main > div:not([data-radix-portal]),
                    section:not([data-radix-portal]) { 
                        display: none !important; 
                    }

                    [data-radix-portal] { 
                        display: block !important; 
                        position: static !important; 
                    }

                    [role="dialog"] { 
                        display: flex !important; 
                        flex-direction: column !important; 
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        width: ${isThermalPrint ? '80mm' : '100%'} !important; 
                        border: none !important; 
                        box-shadow: none !important;
                        padding: ${isThermalPrint ? '2mm' : '0'} !important; 
                        background: white !important;
                        visibility: visible !important;
                    }

                    ${isThermalPrint ? `
                        * { font-family: 'Courier New', monospace !important; font-size: 11px !important; color: black !important; }
                        h2 { font-size: 16px !important; text-align: center !important; }
                        .text-3xl { font-size: 18px !important; }
                        table { width: 100% !important; border-top: 1px dashed black !important; margin-top: 5px !important; }
                        th { border-bottom: 1px dashed black !important; }
                        .bg-slate-900, .bg-slate-50, .bg-emerald-50 { background: white !important; color: black !important; border: none !important; }
                    ` : `
                        * { color: black !important; }
                    `}
                }
            `}</style>
        </div>
    )
}
