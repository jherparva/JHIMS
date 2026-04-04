"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import styles from './inventory.module.css'
import { Plus, Search, Package } from 'lucide-react'

import { Edit, Trash2, History as HistoryIcon } from "lucide-react"
import { ProductDialog } from "./ProductDialog"
import { KardexDialog } from "./KardexDialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Product {
    _id: string
    sku: string
    name: string
    category: { _id: string; name: string }
    stock: number
    purchasePrice: number
    salePrice: number
    minStock: number
    description?: string
    imageUrl?: string
}

export default function InventoryView() {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [supplierFilter, setSupplierFilter] = useState<string | null>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isKardexOpen, setIsKardexOpen] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
    const [isQuickReceiptMode, setIsQuickReceiptMode] = useState(false)

    // Global Scanner Ref
    const bufferRef = React.useRef("")
    const lastKeyTimeRef = React.useRef(Date.now())

    useEffect(() => {
        // Leer filtro de proveedor de la URL si existe
        const params = new URLSearchParams(window.location.search)
        const sId = params.get("supplierId")
        if (sId) setSupplierFilter(sId)
        
        fetchProducts()
    }, [])

    const fetchProducts = async () => {
        try {
            const response = await fetch("/api/productos")
            if (response.ok) {
                const data = await response.json()
                setProducts(Array.isArray(data.products) ? data.products : [])
            }
        } catch (error) {
            console.error("Error al cargar productos:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleQuickReceipt = async (sku: string) => {
        const product = products.find(p => p.sku.toLowerCase() === sku.toLowerCase());
        if (!product) {
            toast.error(`Producto no encontrado (${sku})`);
            return;
        }

        try {
            // Se envía actualización directa al stock sumando 1
            const res = await fetch(`/api/productos/${product._id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    ...product,
                    categoryId: (product.category as any)?._id || product.category,
                    stock: product.stock + 1 
                })
            });

            if (res.ok) {
                toast.success(`+1 Entrada a: ${product.name}`);
                fetchProducts(); // Refrescar lista local
            } else {
                toast.error("Error al guardar entrada");
            }
        } catch (error) {
            toast.error("Error de conexión");
        }
    }

    // Global Barcode Scanner Effect for Quick Receipt
    useEffect(() => {
        if (!isQuickReceiptMode) return;

        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            const activeTag = document.activeElement?.tagName.toLowerCase()
            const isInput = activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select'
            
            // Allow manual typing in search bar
            if (isInput) return

            const currentTime = Date.now()
            if (currentTime - lastKeyTimeRef.current > 50) {
                bufferRef.current = ""
            }

            if (e.key === 'Enter') {
                if (bufferRef.current.length > 3) {
                    const sku = bufferRef.current.toLowerCase()
                    handleQuickReceipt(sku)
                    bufferRef.current = ""
                }
            } else if (e.key.length === 1) {
                bufferRef.current += e.key
            }
            
            lastKeyTimeRef.current = currentTime
        }

        window.addEventListener('keydown', handleGlobalKeyDown)
        return () => window.removeEventListener('keydown', handleGlobalKeyDown)
    }, [isQuickReceiptMode, products])

    const filteredProducts = products.filter((product) => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             product.sku.toLowerCase().includes(searchTerm.toLowerCase())
        
        const matchesSupplier = !supplierFilter || 
                               (product as any).supplier?._id === supplierFilter || 
                               (product as any).supplier === supplierFilter
        
        return matchesSearch && matchesSupplier
    })

    const totalProducts = products.length
    const lowStockProducts = products.filter(p => p.stock <= p.minStock).length
    const totalValue = products.reduce((sum, p) => sum + (p.stock * p.salePrice), 0)

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de eliminar "${name}"?`)) return
        try {
            const res = await fetch(`/api/productos/${id}`, { method: "DELETE" })
            if (res.ok) {
                toast.success("Producto eliminado")
                fetchProducts()
            } else {
                toast.error("Error al eliminar")
            }
        } catch {
            toast.error("Error de conexión")
        }
    }

    const openCreateDialog = () => {
        setSelectedProduct(null)
        setIsDialogOpen(true)
    }

    const openEditDialog = (product: Product) => {
        setSelectedProduct(product)
        setIsDialogOpen(true)
    }

    const openKardex = (product: Product) => {
        setSelectedProduct(product)
        setIsKardexOpen(true)
    }

    return (
        <div className={styles.container}>


            <div className={styles.header}>
                <div className="flex flex-col gap-1">
                    <h1 className={styles.title}>Inventario</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest hidden md:inline-block">Ingreso Rápido</span>
                        <div 
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsQuickReceiptMode(!isQuickReceiptMode)
                            }}
                            className={cn(
                                "flex items-center w-12 h-6 rounded-full p-1 cursor-pointer transition-all border shadow-inner",
                                isQuickReceiptMode ? "bg-emerald-500 border-emerald-600 shadow-emerald-200" : "bg-slate-200 border-slate-300"
                            )}
                            title="Modo Ingreso Rápido: Escanea códigos para sumar +1 al stock sin hacer clics"
                        >
                            <div className={cn(
                                "w-4 h-4 bg-white rounded-full transition-transform shadow-sm flex items-center justify-center",
                                isQuickReceiptMode ? "translate-x-6" : "translate-x-0"
                            )} />
                        </div>
                    </div>
                </div>
                
                <button 
                    onClick={openCreateDialog}
                    className="bg-primary text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90"
                >
                    <Plus size={20} />
                    Nuevo Producto
                </button>
            </div>

            {isQuickReceiptMode && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 mb-4 animate-in fade-in slide-in-from-top-2 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-100 text-emerald-600 rounded-full w-8 h-8 flex items-center justify-center animate-pulse">
                            <Search size={16} />
                        </div>
                        <div>
                            <h3 className="font-bold text-emerald-800 text-sm">Modo de Ingreso Rápido Activo</h3>
                            <p className="text-[10px] text-emerald-600 uppercase font-black tracking-widest">Escanea en cualquier lugar de la pantalla para sumar +1</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsQuickReceiptMode(false)}
                        className="text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                        Desactivar
                    </button>
                </div>
            )}

            <ProductDialog 
                open={isDialogOpen} 
                onOpenChange={setIsDialogOpen} 
                product={selectedProduct} 
                onSuccess={fetchProducts} 
            />

            <KardexDialog 
                open={isKardexOpen} 
                onOpenChange={setIsKardexOpen} 
                product={selectedProduct} 
            />

            {/* Stats Grid */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Total Productos</div>
                    <div className={styles.statValue}>{totalProducts}</div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Stock Bajo</div>
                    <div className={styles.statValue} style={{ color: lowStockProducts > 0 ? '#dc2626' : '#059669' }}>
                        {lowStockProducts}
                    </div>
                </div>

                <div className={styles.statCard}>
                    <div className={styles.statLabel}>Valor Total</div>
                    <div className={styles.statValue}>${totalValue.toLocaleString()}</div>
                </div>
            </div>

            {/* Search Bar */}
            <div className={styles.searchBar}>
                <Search size={20} className="text-gray-400" />
                <input
                    type="text"
                    placeholder="Buscar productos por nombre o SKU..."
                    className="flex-1 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Products Grid */}
            {loading ? (
                <div className="text-center py-12 text-gray-500">Cargando productos...</div>
            ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <Package size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No se encontraron productos</p>
                </div>
            ) : (
                <div className={styles.productGrid}>
                    {filteredProducts.map((product) => (
                        <div key={product._id} className={styles.productCard}>
                            {product.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name} className={styles.productImage} />
                            ) : (
                                <div className={styles.productImagePlaceholder}>
                                    <div className={styles.placeholderIconContainer}>
                                        <Package size={32} className={styles.placeholderIcon} />
                                    </div>
                                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter">Sin Imagen</span>
                                </div>
                            )}

                            <div className={styles.productInfo}>
                                <div className={styles.productName}>{product.name}</div>
                                <div className="text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full w-fit mb-2">
                                    {product.category?.name || "Sin Categoría"}
                                </div>
                                <div className={styles.productSku}>SKU: {product.sku}</div>
                                <div className="text-xs text-gray-500 line-clamp-2 mt-1 min-h-[2.5rem]">
                                    {product.description || "Sin descripción"}
                                </div>
                                <div className={styles.productPrice}>${product.salePrice.toLocaleString()}</div>
                                <div className={product.stock <= (product.minStock || 0) ? styles.lowStock : styles.productStock}>
                                    Stock: {product.stock} <span className="text-[10px] opacity-60 ml-1">(Min: {product.minStock || 0})</span> {product.stock <= (product.minStock || 0) && '⚠️'}
                                </div>

                                <div className="mt-4 flex gap-2 pt-2 border-t">
                                    <button 
                                        onClick={() => openEditDialog(product)}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors text-sm"
                                    >
                                        <Edit size={14} />
                                        Editar
                                    </button>
                                    <button 
                                        onClick={() => openKardex(product)}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-600 rounded-md hover:bg-violet-100 transition-colors text-sm"
                                        title="Ver historial de movimientos (Kardex)"
                                    >
                                        <HistoryIcon size={14} />
                                        Kardex
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(product._id, product.name)}
                                        className="px-3 py-1.5 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
