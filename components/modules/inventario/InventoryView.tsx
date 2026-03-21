"use client"

import { useState, useEffect } from "react"
import styles from './inventory.module.css'
import { Plus, Search, Package } from 'lucide-react'

import { Edit, Trash2 } from "lucide-react"
import { ProductDialog } from "./ProductDialog"
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
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

    useEffect(() => {
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

    const filteredProducts = products.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchTerm.toLowerCase())
    )

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

    return (
        <div className={styles.container}>


            <div className={styles.header}>
                <h1 className={styles.title}>Inventario</h1>
                <button 
                    onClick={openCreateDialog}
                    className="bg-primary text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90"
                >
                    <Plus size={20} />
                    Nuevo Producto
                </button>
            </div>

            <ProductDialog 
                open={isDialogOpen} 
                onOpenChange={setIsDialogOpen} 
                product={selectedProduct} 
                onSuccess={fetchProducts} 
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
                                <div className={product.stock <= product.minStock ? styles.lowStock : styles.productStock}>
                                    Stock: {product.stock} {product.stock <= product.minStock && '⚠️'}
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
