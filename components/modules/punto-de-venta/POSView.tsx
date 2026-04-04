"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import styles from './pos.module.css'
import { Search, Plus, Minus, Trash2, ShoppingCart, Printer, CheckCircle2, FileText, Wallet, LogOut, Banknote, Landmark, Pencil, Loader2, Wifi, WifiOff, RefreshCw, Monitor, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useDebounce } from "@/hooks/useDebounce"
import { cn } from "@/lib/utils"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { jhimsOffline } from "@/lib/offline-db"
import { CustomerQuickDialog } from "../clientes/CustomerQuickDialog"

interface Product {
    _id: string
    name: string
    salePrice: number
    stock: number
    minStock: number
    sku: string
    hasVariants: boolean
    variants?: any[]
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
    const [isQuote, setIsQuote] = useState(false)
    const debouncedSearch = useDebounce(searchTerm, 350)
    
    const [customers, setCustomers] = useState<{_id: string, name: string}[]>([])
    const [selectedCustomer, setSelectedCustomer] = useState("")
    const [amountPaid, setAmountPaid] = useState<string>("")
    const [isQuickCustomerOpen, setIsQuickCustomerOpen] = useState(false)
    const router = useRouter()
    const searchParams = useSearchParams()
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [isQuickEditOpen, setIsQuickEditOpen] = useState(false)
    const [editingProduct, setEditingProduct] = useState<Product | null>(null)
    const [quickFormData, setQuickFormData] = useState({ name: "", salePrice: 0 })
    const [activeSession, setActiveSession] = useState<any>(null)
    const [isVariantSelectorOpen, setIsVariantSelectorOpen] = useState(false)
    const [selectingProduct, setSelectingProduct] = useState<Product | null>(null)
    const [isOpeningBoxOpen, setIsOpeningBoxOpen] = useState(false)
    const [openingAmount, setOpeningAmount] = useState("0")
    const [autoPrintEnabled, setAutoPrintEnabled] = useState(false)

    // Global Scanner Ref
    const bufferRef = React.useRef("")
    const lastKeyTimeRef = React.useRef(Date.now())

    // Warn before closing tab if box is open
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (activeSession && activeSession._id) {
                e.preventDefault()
                e.returnValue = "Tienes una caja abierta. ¿Seguro que deseas salir sin cerrarla?"
                return e.returnValue
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [activeSession])

    // Load auto-print config from localStorage only on client
    useEffect(() => {
        const savedAutoPrint = localStorage.getItem('jhims_autoprint')
        if (savedAutoPrint === 'true') {
            setAutoPrintEnabled(true)
        }
    }, [])

    // Global Barcode Scanner Effect
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            const activeTag = document.activeElement?.tagName.toLowerCase()
            const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select'
            
            // Allow typing in inputs. Only capture if clicking outside UI elements.
            // If they are explicitly in the search bar, the search bar's onKeyDown handles it.
            if (isInput) return

            const currentTime = Date.now()
            // Barcode scanners type very fast (<30ms per stroke). Reset buffer if typing is slow (human).
            if (currentTime - lastKeyTimeRef.current > 50) {
                bufferRef.current = ""
            }

            if (e.key === 'Enter') {
                if (bufferRef.current.length > 3) {
                    const sku = bufferRef.current.toLowerCase()
                    const exactMatch = products.find(p => p.sku.toLowerCase() === sku)
                    
                    if (exactMatch) {
                        e.preventDefault()
                        if (exactMatch.stock <= 0) {
                            toast.error(`Sin stock para: ${exactMatch.name}`)
                        } else {
                            // Using State via dispatcher function to avoid stale cart in closure
                            setCart(prevCart => {
                                const existingItem = prevCart.find(item => item.product._id === exactMatch._id)
                                if (existingItem) {
                                    if (existingItem.quantity >= exactMatch.stock) {
                                        toast.error("Stock insuficiente")
                                        return prevCart
                                    }
                                    toast.success(`Añadido: ${exactMatch.name}`)
                                    return prevCart.map(item => 
                                        item.product._id === exactMatch._id 
                                            ? { ...item, quantity: item.quantity + 1 } 
                                            : item
                                    )
                                } else {
                                    toast.success(`Añadido: ${exactMatch.name}`)
                                    return [...prevCart, { product: exactMatch, quantity: 1 }]
                                }
                            })
                        }
                    } else if (bufferRef.current.length >= 6) {
                        toast.error(`Producto no encontrado (${bufferRef.current})`)
                    }
                    bufferRef.current = ""
                }
            } else if (e.key.length === 1) {
                bufferRef.current += e.key
            }
            
            lastKeyTimeRef.current = currentTime
        }

        window.addEventListener('keydown', handleGlobalKeyDown)
        return () => window.removeEventListener('keydown', handleGlobalKeyDown)
    }, [products])

    const toggleAutoPrint = () => {
        const newValue = !autoPrintEnabled
        setAutoPrintEnabled(newValue)
        localStorage.setItem('jhims_autoprint', newValue ? 'true' : 'false')
        toast.info(newValue ? "Impresión automática ACTIVADA" : "Impresión automática DESACTIVADA")
    }

    // OFFLINE & SYNC STATES
    const [isOnline, setIsOnline] = useState(true)
    const [isSyncing, setIsSyncing] = useState(false)
    const [pendingSalesCount, setPendingSalesCount] = useState(0)

    const syncOfflineSales = useCallback(async () => {
        if (isSyncing || !navigator.onLine) return
        
        const pendingSales = await jhimsOffline.getPendingSales()
        const pendingCustomers = await jhimsOffline.getPendingCustomers()

        if (pendingSales.length === 0 && pendingCustomers.length === 0) {
            setPendingSalesCount(0)
            return
        }

        setIsSyncing(true)
        setPendingSalesCount(pendingSales.length)
        
        let successCount = 0
        let customerMap = new Map() // Mapear tempId a realId

        // 1. SINCRONIZAR CLIENTES PENDIENTES
        for (const customer of pendingCustomers) {
            try {
                const res = await fetch('/api/clientes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: (customer.name || "").replace(" (Local)", ""),
                        taxId: customer.taxId,
                        phone: customer.phone
                    })
                })
                if (res.ok) {
                    const newCust = await res.json()
                    customerMap.set(customer._id, newCust._id)
                    await jhimsOffline.removeSyncedCustomer(customer.localId)
                }
            } catch (err) {
                console.error("Error syncing customer:", err)
            }
        }

        // 2. SINCRONIZAR VENTAS
        for (const sale of pendingSales) {
            try {
                const { localId, offline, synced, ...saleData } = sale
                
                // Si el cliente era temporal, usar el nuevo ID real
                if (saleData.customer && customerMap.has(saleData.customer)) {
                    saleData.customer = customerMap.get(saleData.customer)
                }

                const res = await fetch("/api/ventas", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(saleData)
                })
                
                if (res.ok) {
                    await jhimsOffline.removeSyncedSale(localId)
                    successCount++
                }
            } catch (err) {
                console.error("Error syncing offline sale:", err)
            }
        }
        
        if (successCount > 0) {
            toast.success(`${successCount} ventas sincronizadas con éxito`)
            fetchStats()
            fetchCustomers()
        }
        
        const remaining = await jhimsOffline.getPendingSales()
        setPendingSalesCount(remaining.length)
        setIsSyncing(false)
    }, [isSyncing])

    const fetchUser = async () => {
        try {
            const response = await fetch("/api/autenticacion/me")
            if (response.ok) {
                const data = await response.json()
                setCurrentUser(data.user)
                // GUARDAR SESIÓN PARA USO OFFLINE
                await jhimsOffline.setSession(data.user)
            } else {
                // Si falla API, intentar cargar de sesión local
                const cached = await jhimsOffline.getSession()
                if (cached) setCurrentUser(cached)
            }
        } catch (e) {
            const cached = await jhimsOffline.getSession()
            if (cached) setCurrentUser(cached)
        }
    }

    const fetchActiveSession = async () => {
        try {
            const res = await fetch("/api/caja/session")
            if (res.ok) {
                const data = await res.json()
                setActiveSession(data.activeSession)
                if (!data.activeSession) {
                    setIsOpeningBoxOpen(true)
                }
            }
        } catch (e) {
            console.error("Error al verificar sesión de caja")
        }
    }

    useEffect(() => {
        fetchProducts()
        fetchCustomers()
        fetchCompanyInfo()
        fetchStats()
        fetchUser()
        fetchActiveSession()

        // Monitoreo de conexión
        setIsOnline(navigator.onLine)
        const handleOnline = () => { setIsOnline(true); syncOfflineSales(); }
        const handleOffline = () => setIsOnline(false)
        
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        
        // Cargar conteo inicial de pendientes
        jhimsOffline.getPendingSales().then(p => setPendingSalesCount(p.length))
        
        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    // Manejar Query Params para acciones dinámicas como '?action=arqueo'
    useEffect(() => {
        if (searchParams?.get('action') === 'arqueo') {
            setIsArqueoOpen(true);
            router.replace('/punto-de-venta');
        }
    }, [searchParams, router])


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
                // CACHEAR LOCALMENTE
                await jhimsOffline.cacheCustomers(data)
            } else {
                const cached = await jhimsOffline.getCachedCustomers()
                const pending = await jhimsOffline.getPendingCustomers()
                setCustomers([...cached, ...pending])
            }
        } catch (error) {
            const cached = await jhimsOffline.getCachedCustomers()
            const pending = await jhimsOffline.getPendingCustomers()
            setCustomers([...cached, ...pending])
        }
    }

    const fetchProducts = async () => {
        setLoading(true)
        try {
            const response = await fetch("/api/productos")
            if (response.ok) {
                const data = await response.json()
                const list = Array.isArray(data.products) ? data.products : []
                setProducts(list)
                // CACHEAR LOCALMENTE
                await jhimsOffline.cacheProducts(list)
            } else {
                // Si falla API (ej: offline), cargar de cache
                const cached = await jhimsOffline.getCachedProducts()
                if (cached.length > 0) {
                    setProducts(cached)
                    toast.info("Cargado desde caché local (Sin conexión)")
                }
            }
        } catch (error) {
            const cached = await jhimsOffline.getCachedProducts()
            if (cached.length > 0) {
                setProducts(cached)
                toast.info("Modo Offline: Usando inventario local")
            }
        } finally {
            setLoading(false)
        }
    }

    const addToCart = (product: Product, variant?: any) => {
        if (product.hasVariants && !variant && (product as any).variants?.length > 0) {
            setSelectingProduct(product)
            setIsVariantSelectorOpen(true)
            return
        }

        const cartItemId = variant ? `${product._id}-${variant._id}` : product._id
        const existingItem = cart.find(item => 
            variant ? (item as any).variantId === variant._id : item.product._id === product._id
        )

        const maxStock = variant ? variant.stock : product.stock
        const currentInCart = existingItem ? existingItem.quantity : 0
        const minStock = product.minStock || 0

        // Alerta de stock bajo al añadir
        if (maxStock - (currentInCart + 1) <= minStock) {
            toast.warning(`⚠️ Stock bajo: ${product.name} (${variant?.name || 'General'}) tiene solo ${maxStock - currentInCart} unidades`, {
                description: `El stock está por debajo del mínimo configurado (${minStock}).`,
                duration: 3000
            })
        }

        if (existingItem) {
            if (existingItem.quantity >= maxStock) {
                toast.error("Stock insuficiente")
                return
            }
            setCart(cart.map(item => {
                const isMatch = variant 
                    ? (item as any).variantId === variant._id 
                    : item.product._id === product._id
                
                return isMatch ? { ...item, quantity: item.quantity + 1 } : item
            }))
        } else {
            const newItem: any = { 
                product, 
                quantity: 1,
                variantId: variant?._id,
                variantName: variant?.name,
                variantPrice: variant?.salePrice || product.salePrice
            }
            setCart([...cart, newItem])
            setIsVariantSelectorOpen(false)
        }
    }

    const updateQuantity = (cartItemKey: string, delta: number) => {
        setCart(cart.map(item => {
            const key = (item as any).variantId ? `${item.product._id}-${(item as any).variantId}` : item.product._id
            
            if (key === cartItemKey) {
                const maxStock = (item as any).variantId 
                    ? (item.product as any).variants.find((v:any) => v._id === (item as any).variantId)?.stock || item.product.stock
                    : item.product.stock

                const newQuantity = item.quantity + delta
                if (newQuantity > maxStock) {
                    toast.error("Stock insuficiente (Máx: " + maxStock + ")")
                    return item
                }
                return { ...item, quantity: Math.max(0, newQuantity) }
            }
            return item
        }).filter(item => item.quantity > 0))
    }

    const setManualQuantity = (cartItemKey: string, value: string) => {
        const newQty = parseInt(value)
        if (isNaN(newQty)) {
            // Manejar borrar para permitir escribir
            if (value === "") {
                setCart(cart.map(item => {
                    const key = (item as any).variantId ? `${item.product._id}-${(item as any).variantId}` : item.product._id
                    return key === cartItemKey ? { ...item, quantity: 0 } : item
                }))
            }
            return
        }

        setCart(cart.map(item => {
            const key = (item as any).variantId ? `${item.product._id}-${(item as any).variantId}` : item.product._id
            
            if (key === cartItemKey) {
                const maxStock = (item as any).variantId 
                    ? (item.product as any).variants.find((v:any) => v._id === (item as any).variantId)?.stock || item.product.stock
                    : item.product.stock

                if (newQty > maxStock) {
                    toast.error(`Stock insuficiente (Máx: ${maxStock})`)
                    return { ...item, quantity: maxStock }
                }
                return { ...item, quantity: Math.max(0, newQty) }
            }
            return item
        }).filter(item => item.quantity > 0))
    }

    const removeFromCart = (cartItemKey: string) => {
        setCart(cart.filter(item => {
            const key = (item as any).variantId ? `${item.product._id}-${(item as any).variantId}` : item.product._id
            return key !== cartItemKey
        }))
    }

    const getTotal = () => {
        return cart.reduce((sum, item) => {
            const price = (item as any).variantPrice || item.product.salePrice
            return sum + (price * item.quantity)
        }, 0)
    }

    const handleQuote = () => {
        if (cart.length === 0) {
            toast.error("El carrito está vacío")
            return
        }
        const quoteData = {
            _id: "COT-" + Math.floor(Math.random() * 1000000).toString(),
            ticketNumber: "COT-" + Math.floor(Math.random() * 1000000).toString(),
            items: [...cart],
            total: getTotal(),
            date: new Date().toLocaleString(),
            paymentMethod: "Cotización Informativa"
        }
        setLastSale(quoteData)
        setIsQuote(true)
        setIsReceiptOpen(true)
    }

    const handleCheckout = async () => {
        setIsQuote(false)
        if (!activeSession) {
            toast.error("Debes abrir caja antes de vender")
            setIsOpeningBoxOpen(true)
            return
        }
        if (cart.length === 0) {
            toast.error("El carrito está vacío")
            return
        }

        if (paymentMethod === 'credit' && !selectedCustomer) {
            toast.error("Debes seleccionar un cliente registrado para vender a crédito")
            return
        }

        try {
            const saleData = {
                items: cart,
                total: getTotal(),
                paymentMethod: paymentMethod,
                customer: selectedCustomer || null,
                amountPaid: amountPaid ? Number(amountPaid) : (paymentMethod === 'credit' ? 0 : getTotal()),
            }

            // --- LÓGICA OFFLINE ---
            if (!navigator.onLine) {
                await jhimsOffline.savePendingSale(saleData)
                const pending = await jhimsOffline.getPendingSales()
                setPendingSalesCount(pending.length)
                
                toast.info("Sin internet. Venta guardada localmente para sincronizar después.", {
                    duration: 5000,
                    icon: <WifiOff className="text-amber-500" />
                })
                
                setCart([])
                setSelectedCustomer("")
                setAmountPaid("")
                // No hay ID de venta real ni recibo oficial en offline puro, opcionalmente podrías imprimir uno genérico.
                return
            }

            const response = await fetch('/api/ventas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(saleData)
            })

            if (response.ok) {
                const newSale = await response.json()
                const saleData = {
                    _id: newSale._id,
                    ticketNumber: newSale.ticketNumber,
                    items: [...cart],
                    total: getTotal(),
                    date: new Date().toLocaleString(),
                    paymentMethod: paymentMethod === 'cash' ? 'Efectivo' : paymentMethod === 'transfer' ? 'Transferencia' : 'A Crédito'
                }
                setLastSale(saleData)
                setIsReceiptOpen(true)
                
                toast.success("Venta procesada exitosamente")
                setCart([])
                setSelectedCustomer("")
                setAmountPaid("")
                fetchProducts()
                fetchStats()
                
                if (autoPrintEnabled) {
                    // Esperar a que renderice el modal antes de imprimir
                    setTimeout(() => {
                        handlePrint(true)
                    }, 300)
                }
            } else {
                const error = await response.json()
                // Extraer mensaje específico de Zod si existe
                let errorMsg = error.error || "Error al procesar venta"
                if (error.details) {
                    const firstField = Object.keys(error.details)[0]
                    const details = error.details[firstField]
                    if (details && details._errors && details._errors.length > 0) {
                        errorMsg = `${firstField}: ${details._errors[0]}`
                    }
                }
                toast.error(errorMsg)
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

    const handleOpenBox = async () => {
        try {
            const res = await fetch("/api/caja/session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ openingAmount: Number(openingAmount) })
            })
            if (res.ok) {
                const session = await res.json()
                setActiveSession(session)
                setIsOpeningBoxOpen(false)
                toast.success("Caja abierta con éxito")
                fetchStats()
            } else {
                toast.error("Error al abrir caja")
            }
        } catch (e) {
            toast.error("Error de conexión")
        }
    }

    const handleCloseBox = async () => {
        try {
            const res = await fetch("/api/caja/session", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ closingAmount: Number(physicalCash), notes: "Cierre de turno" })
            })
            if (res.ok) {
                toast.success("Caja cerrada exitosamente")
                setActiveSession(null)
                setIsArqueoOpen(false)
                setIsOpeningBoxOpen(true)
                setPhysicalCash("") // Reset
                
                // Verificar si se solicitó cerrar la sesión luego de cerrar la caja (viene desde el Sidebar)
                if (localStorage.getItem('jhims_logout_after_close') === 'true') {
                    localStorage.removeItem('jhims_logout_after_close');
                    try {
                        const logoutRes = await fetch('/api/autenticacion/logout', { method: 'POST' });
                        if (logoutRes.ok) {
                            window.location.href = '/inicio-sesion';
                        }
                    } catch (err) {
                        toast.error("Error desconectando tu usuario. Sal manualmente.");
                    }
                }
            } else {
                toast.error("Error al cerrar caja")
            }
        } catch (e) {
            toast.error("Error de conexión")
        }
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <div className="flex flex-col">
                        <h1 className="text-xl font-black tracking-tighter text-slate-800 flex items-center gap-2">
                            JHIMS <span className="text-violet-600">Caja</span>
                            <div className={cn(
                                "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold",
                                isOnline ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                            )}>
                                {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                                {isOnline ? "Online" : "Offline"}
                            </div>
                        </h1>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{companyInfo?.name || "Cargando..."}</p>
                    </div>

                    {pendingSalesCount > 0 && (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl animate-pulse">
                            <RefreshCw className={cn("text-amber-500", isSyncing && "animate-spin")} size={14} />
                            <span className="text-[10px] font-black text-amber-700 uppercase">
                                {isSyncing ? "Sincronizando..." : `${pendingSalesCount} por subir`}
                            </span>
                        </div>
                    )}
                </div>
                
                <div className="flex items-center gap-3">

                    {/* Checkbox Impresión Automática */}
                    <div className="flex items-center gap-2 mr-2">
                        <input 
                            type="checkbox" 
                            id="autoprint-toggle"
                            checked={autoPrintEnabled}
                            onChange={toggleAutoPrint}
                            className="w-4 h-4 text-violet-600 rounded border-slate-300 focus:ring-violet-500"
                        />
                        <label htmlFor="autoprint-toggle" className="text-xs font-bold text-slate-600 uppercase tracking-widest cursor-pointer select-none">
                            Auto-Imprimir
                        </label>
                    </div>

                    <div className="h-4 w-px bg-slate-200 mx-1" />

                    {/* Botón de cierre de caja rápido */}
                    <Button 
                        variant="default" 
                        size="sm" 
                        onClick={() => setIsArqueoOpen(true)}
                        className="bg-rose-600 hover:bg-rose-700 text-white gap-2 font-black text-[10px] uppercase shadow-lg shadow-rose-200 rounded-xl"
                        title="Hacer Cierre de Caja y Finalizar Turno: Haz clic aquí al terminar tu jornada para cuadrar el dinero."
                    >
                        <LogOut size={14} /> Cerrar Caja
                    </Button>
                </div>
            </header>

            {/* Modal de Apertura de Caja - Bloqueado hasta abrir sesión */}
            <Dialog 
                open={isOpeningBoxOpen} 
                onOpenChange={(open) => {
                    // Solo permite cerrar el modal si ya existe una sesión activa
                    if (activeSession) setIsOpeningBoxOpen(open)
                }}
            >
                <DialogContent 
                    className="max-w-sm bg-white rounded-3xl p-8 shadow-2xl border-none [&>button]:hidden"
                    onInteractOutside={(e) => e.preventDefault()}
                    onEscapeKeyDown={(e) => e.preventDefault()}
                >
                    <div className="text-center space-y-6">
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                            <Banknote size={40} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter italic">Apertura de Caja</h2>
                            <p className="text-slate-500 text-sm font-medium">Inicia tu turno con el saldo base</p>
                        </div>
                        <div className="space-y-2 text-left">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Saldo Inicial</label>
                            <input 
                                type="number" 
                                className="w-full h-16 border-2 border-slate-100 bg-slate-50 rounded-2xl px-6 text-3xl font-black text-slate-800 focus:border-emerald-500 transition-all outline-none"
                                value={openingAmount}
                                onChange={(e) => setOpeningAmount(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <Button 
                            className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-200"
                            onClick={handleOpenBox}
                        >
                            INICIAR TURNO
                        </Button>
                        <Button variant="ghost" className="text-slate-400 text-xs font-bold" onClick={() => router.push('/dashboard')}>
                            <LogOut size={14} className="mr-2" /> Salir al Dashboard
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
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
                        <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-9 w-9 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100" 
                            onClick={() => setIsArqueoOpen(true)}
                            title="Arqueo de Caja: Ver totales y cerrar turno"
                        >
                            <LogOut size={18} />
                        </Button>
                    </div>
                </div>

                <div className={styles.cartItems}>
                    {cart.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">El carrito está vacío</div>
                    ) : (
                        cart.map((item) => {
                            const key = (item as any).variantId ? `${item.product._id}-${(item as any).variantId}` : item.product._id
                            const price = (item as any).variantPrice || item.product.salePrice
                            
                            return (
                                <div key={key} className={styles.cartItem}>
                                    <div className={styles.itemInfo}>
                                        <div className={styles.itemName}>
                                            {item.product.name}
                                            {(item as any).variantName && (
                                                <span className="ml-2 text-[10px] bg-slate-100 px-1.5 py-0.5 rounded uppercase font-black text-slate-500">
                                                    {(item as any).variantName}
                                                </span>
                                            )}
                                        </div>
                                        <div className={styles.itemPrice}>${price.toLocaleString()} x {item.quantity}</div>
                                    </div>
                                    <div className={styles.itemControls}>
                                        <button className={styles.quantityBtn} onClick={() => updateQuantity(key, -1)}><Minus size={16} /></button>
                                        <input 
                                            type="number" 
                                            className={styles.quantityInput} 
                                            value={item.quantity || ""} 
                                            onChange={(e) => setManualQuantity(key, e.target.value)}
                                            min="1"
                                        />
                                        <button className={styles.quantityBtn} onClick={() => updateQuantity(key, 1)}><Plus size={16} /></button>
                                        <button className={styles.quantityBtn} onClick={() => removeFromCart(key)}><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                <div className={styles.cartFooter}>
                    <div className="space-y-4 mb-4 p-3 bg-muted/30 rounded-lg border">
                        <div className="flex gap-2">
                            <select className="flex-1 border rounded-md p-2 text-sm" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                                <option value="">Consumidor Final</option>
                                {customers.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                            </select>
                            <Button 
                                variant="outline" 
                                size="icon" 
                                className="h-10 w-10 border-indigo-200 bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                                onClick={() => setIsQuickCustomerOpen(true)}
                                title="Nuevo Cliente Rápido"
                            >
                                <UserPlus size={18} />
                            </Button>
                        </div>
                        <select className="w-full border rounded-md p-2 text-sm font-bold bg-slate-50" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                            <option value="cash">💵 Efectivo</option>
                            <option value="transfer">🏦 Transferencia / QR</option>
                            <option value="credit">📒 A Crédito (Fiado)</option>
                        </select>
                        <input type="number" className="w-full border rounded-md p-2 text-sm" placeholder={paymentMethod === 'credit' ? "Abono Inicial (Dejar en 0 si no hay)" : "Monto Paga"} value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
                        
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
                    <div className="flex gap-3">
                        <Button 
                            variant="outline"
                            className="flex-1 h-[4.5rem] rounded-2xl font-black uppercase text-blue-600 border-2 border-blue-200 hover:bg-blue-50 transition-all flex flex-col items-center justify-center gap-1 group" 
                            onClick={handleQuote} 
                            disabled={cart.length === 0}
                        >
                            <FileText size={20} className="group-hover:scale-110 transition-transform" />
                            <span className="text-[10px]">Generar Cotización</span>
                        </Button>
                        <Button 
                            className="flex-[2] h-[4.5rem] rounded-2xl font-black uppercase text-white bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-200 transition-all flex flex-col items-center justify-center gap-1" 
                            onClick={handleCheckout} 
                            disabled={cart.length === 0}
                        >
                            <Banknote size={24} />
                            <span>Cobrar Venta</span>
                        </Button>
                    </div>
                </div>
            </div>

            <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
                <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden border-none shadow-2xl print:shadow-none print:max-w-none print:w-full print:static print:transform-none">
                    <DialogHeader className={cn("p-6 text-white print:bg-white print:text-black print:pb-2 print:pt-4", isQuote ? "bg-blue-900" : "bg-slate-900")}>
                        <DialogTitle className="flex justify-between items-start">
                            <div className="flex flex-col text-left">
                                <span className={cn("font-bold flex items-center gap-2 print:hidden text-sm mb-2", isQuote ? "text-blue-300" : "text-emerald-400")}>
                                    <CheckCircle2 className="h-5 w-5" /> {isQuote ? 'Cotización Generada' : '¡Venta Exitosa!'}
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
                                    {isQuote ? 'Cotización Validez 8 Días' : isThermalPrint ? 'Ticket de Venta' : 'Factura de Venta'}
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
                                <div className={cn("p-4 rounded-2xl border text-right print:p-2 print:rounded-none print:bg-white print:border-x-0 print:border-t-0", isQuote ? "bg-blue-50 border-blue-100" : "bg-emerald-50 border-emerald-100")}>
                                    <p className={cn("text-[10px] font-black uppercase mb-1", isQuote ? "text-blue-600" : "text-emerald-600")}>Total a Pagar</p>
                                    <p className={cn("text-3xl font-black print:text-black", isQuote ? "text-blue-700" : "text-emerald-700")}>${lastSale.total.toLocaleString()}</p>
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
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 font-black italic uppercase text-slate-800">
                             JHIMS <span className="text-violet-600">Caja</span> - Cierre de Turno
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6 pt-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-3 bg-slate-50 rounded-2xl border font-bold">
                                <p className="text-[10px] text-slate-400 uppercase">Base Inicial</p>
                                <p className="text-lg text-slate-800">${(activeSession?.openingAmount || 0).toLocaleString()}</p>
                            </div>
                            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 font-bold">
                                <p className="text-[10px] text-emerald-600 uppercase">Ventas Efec.</p>
                                <p className="text-lg text-emerald-700">${(activeSession?.totalCashSales || 0).toLocaleString()}</p>
                            </div>
                            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100 font-bold">
                                <p className="text-[10px] text-rose-600 uppercase">Salidas/Gastos</p>
                                <p className="text-lg text-rose-700">-${(activeSession?.totalExpenses || 0).toLocaleString()}</p>
                            </div>
                        </div>

                        <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100 text-center font-bold">
                            <p className="text-xs text-blue-600 uppercase mb-1">Monto Físico Esperado en Caja</p>
                            <p className="text-4xl text-blue-800">${((activeSession?.openingAmount || 0) + (activeSession?.totalCashSales || 0) - (activeSession?.totalExpenses || 0)).toLocaleString()}</p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase text-slate-500 ml-1">Efectivo Físico Detectado</label>
                            <input 
                                type="number" 
                                className="w-full h-16 border-2 border-slate-200 rounded-2xl px-4 text-3xl font-black focus:border-slate-800 outline-none" 
                                value={physicalCash} 
                                onChange={(e) => setPhysicalCash(e.target.value)} 
                            />
                        </div>

                        {physicalCash && (
                            <div className={cn(
                                "p-4 rounded-2xl border text-center font-bold", 
                                Number(physicalCash) - ((activeSession?.openingAmount || 0) + (activeSession?.totalCashSales || 0) - (activeSession?.totalExpenses || 0)) === 0 
                                    ? "bg-emerald-100 border-emerald-200 text-emerald-700" 
                                    : "bg-rose-50 border-rose-100 text-rose-700"
                            )}>
                                <p className="text-xs uppercase">Diferencia</p>
                                <p className="text-3xl">${(Number(physicalCash) - ((activeSession?.openingAmount || 0) + (activeSession?.totalCashSales || 0) - (activeSession?.totalExpenses || 0))).toLocaleString()}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 pt-2">
                            <Button variant="outline" className="h-12 border-2 rounded-xl" onClick={() => setIsArqueoOpen(false)}>Cancelar</Button>
                            <Button className="h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black" onClick={handleCloseBox}>FINALIZAR TURNO</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <CustomerQuickDialog 
                open={isQuickCustomerOpen} 
                onOpenChange={setIsQuickCustomerOpen} 
                onSuccess={(newId) => {
                    fetchCustomers()
                    setSelectedCustomer(newId)
                }}
            />

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

            <Dialog open={isVariantSelectorOpen} onOpenChange={setIsVariantSelectorOpen}>
                <DialogContent className="max-w-sm bg-white rounded-3xl p-6 border-none">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black text-slate-800 tracking-tight uppercase italic underline decoration-violet-500 underline-offset-4">Seleccionar Opción</DialogTitle>
                    </DialogHeader>
                    <div className="pt-4 space-y-3">
                        <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide px-1">Opciones disponibles para: <span className="text-slate-900">{selectingProduct?.name}</span></p>
                        <div className="grid grid-cols-1 gap-2">
                            {(selectingProduct as any)?.variants?.map((variant: any) => (
                                <button 
                                    key={variant._id}
                                    onClick={() => selectingProduct && addToCart(selectingProduct, variant)}
                                    className="flex justify-between items-center p-4 bg-slate-50 hover:bg-violet-50 hover:border-violet-200 border-2 border-transparent rounded-2xl transition-all group"
                                >
                                    <div className="text-left">
                                        <p className="font-black text-slate-800 uppercase group-hover:text-violet-700">{variant.name}</p>
                                        <p className="text-[10px] text-slate-500">Stock: {variant.stock} | SKU: {variant.sku}</p>
                                    </div>
                                    <p className="text-lg font-black text-emerald-600">${variant.salePrice.toLocaleString()}</p>
                                </button>
                            ))}
                        </div>
                        <Button variant="ghost" className="w-full mt-4 text-slate-400 font-bold" onClick={() => setIsVariantSelectorOpen(false)}>Cancelar</Button>
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
