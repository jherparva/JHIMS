"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Truck, Package, Save, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

interface ISupplier {
    _id: string
    name: string
}

interface IProduct {
    _id: string
    name: string
    purchasePrice: number
    supplier?: { _id: string; name: string } | string
}

interface IStockInItem {
    product: IProduct
    quantity: number
    unitCost: number
}

interface IStockInLog {
    _id: string
    supplier: { _id: string, name: string }
    total: number
    referenceNumber?: string
    items: { product: IProduct, quantity: number, unitCost: number }[]
    createdAt: string
}

export default function StockInView() {
    const [suppliers, setSuppliers] = useState<ISupplier[]>([])
    const [products, setProducts] = useState<IProduct[]>([])
    const [filteredProducts, setFilteredProducts] = useState<IProduct[]>([])
    const [logs, setLogs] = useState<IStockInLog[]>([])

    // Form State
    const [selectedSupplier, setSelectedSupplier] = useState<string>("")
    const [referenceNumber, setReferenceNumber] = useState<string>("")
    const [items, setItems] = useState<IStockInItem[]>([])

    // Filtrar productos por proveedor
    useEffect(() => {
        if (!selectedSupplier || selectedSupplier === "none") {
            setFilteredProducts([])
            return
        }
        
        const filtered = products.filter(p => {
            const supId = typeof p.supplier === 'object' ? (p.supplier as any)?._id : p.supplier
            return supId === selectedSupplier
        })
        setFilteredProducts(filtered)
        setCurrentItemId("")
    }, [selectedSupplier, products])

    // Current Item Input state
    const [currentItemId, setCurrentItemId] = useState<string>("")
    const [currentQty, setCurrentQty] = useState<number>(0)
    const [currentCost, setCurrentCost] = useState<number>(0)

    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const [supRes, prodRes, logRes] = await Promise.all([
                fetch('/api/proveedores'),
                fetch('/api/productos'),
                fetch('/api/entrada-inventario')
            ])

            if (supRes.ok) {
                const data = await supRes.json()
                setSuppliers(Array.isArray(data) ? data : [])
            }
            if (prodRes.ok) {
                const data = await prodRes.json()
                setProducts(data.products || [])
            }
            if (logRes.ok) {
                const data = await logRes.json()
                setLogs(data.stockIns || [])
            }
        } catch (error) {
            console.error("Error fetching data:", error)
            toast.error("Error al cargar datos necesarios")
        }
    }

    const handleProductSelect = (productId: string) => {
        setCurrentItemId(productId)
        const prod = products.find(p => p._id === productId)
        if (prod) {
            setCurrentCost(prod.purchasePrice || 0)
        }
    }

    const handleAddItem = () => {
        if (!currentItemId || currentQty <= 0 || currentCost < 0) {
            toast.error("Datos del producto inválidos")
            return
        }

        const prod = products.find(p => p._id === currentItemId)
        if (!prod) return

        // Check if already in list, if so add qty
        const existingIndex = items.findIndex(i => i.product._id === currentItemId)

        if (existingIndex > -1) {
            const newItems = [...items]
            newItems[existingIndex].quantity += currentQty
            newItems[existingIndex].unitCost = currentCost
            setItems(newItems)
        } else {
            setItems([...items, { product: prod, quantity: currentQty, unitCost: currentCost }])
        }

        // Reset inputs
        setCurrentItemId("")
        setCurrentQty(0)
        setCurrentCost(0)
    }

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index))
    }

    const handleSubmit = async () => {
        if (!selectedSupplier) {
            toast.error("Seleccione un proveedor")
            return
        }
        if (items.length === 0) {
            toast.error("Agregue al menos un producto")
            return
        }

        setLoading(true)
        try {
            const payloadItems = items.map(item => ({
                product: item.product._id,
                quantity: item.quantity,
                unitCost: item.unitCost
            }))

            const response = await fetch('/api/entrada-inventario', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    supplier: selectedSupplier,
                    referenceNumber,
                    items: payloadItems
                })
            })

            if (response.ok) {
                toast.success("Entrada registrada exitosamente")
                // Reset form
                setSelectedSupplier("")
                setReferenceNumber("")
                setItems([])
                // Refresh list
                fetchData()
            } else {
                const data = await response.json()
                toast.error(data.error || "Error al registrar")
            }
        } catch (error) {
            console.error(error)
            toast.error("Error de conexión al registrar")
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount)
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Entradas de Mercancía</h1>
                <p className="text-muted-foreground">Registrar nuevo stock y consultar historial</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5 text-primary" />
                            Registrar Entrada
                        </CardTitle>
                        <CardDescription>Añadir stock a productos existentes</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Proveedor</Label>
                                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {suppliers.length === 0 ? (
                                            <SelectItem value="none" disabled>No hay proveedores</SelectItem>
                                        ) : (
                                            suppliers.map(sup => (
                                                <SelectItem key={sup._id} value={sup._id}>{sup.name}</SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>No. Factura / Remisión</Label>
                                <Input
                                    placeholder="FAC-0001 (Opcional)"
                                    value={referenceNumber}
                                    onChange={(e) => setReferenceNumber(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Agregar producto */}
                        <div className="p-4 bg-slate-50 border rounded-lg space-y-4">
                            <div className="space-y-2">
                                <Label>Producto</Label>
                                <Select 
                                    value={currentItemId} 
                                    onValueChange={handleProductSelect}
                                    disabled={!selectedSupplier || selectedSupplier === "none"}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={!selectedSupplier ? "Seleccione proveedor primero" : "Buscar producto..."} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredProducts.length === 0 ? (
                                            <SelectItem value="none" disabled>
                                                {!selectedSupplier ? "Debe seleccionar un proveedor" : "No hay productos de este proveedor"}
                                            </SelectItem>
                                        ) : (
                                            filteredProducts.map(p => (
                                                <SelectItem key={p._id} value={p._id}>{p.name}</SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Cantidad</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        placeholder="0"
                                        value={currentQty || ''}
                                        onChange={(e) => setCurrentQty(Number(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Costo Unitario (Compra)</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        placeholder="$0"
                                        value={currentCost || ''}
                                        onChange={(e) => setCurrentCost(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={handleAddItem}
                                disabled={!currentItemId || currentQty <= 0}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Agregar a la lista
                            </Button>
                        </div>

                        {/* Lista de productos a ingresar */}
                        {items.length > 0 && (
                            <div className="space-y-2">
                                <Label>Productos a Ingresar</Label>
                                <div className="border rounded-md divide-y overflow-hidden max-h-[250px] overflow-y-auto">
                                    {items.map((item, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-white text-sm">
                                            <div>
                                                <p className="font-medium">{item.product.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {item.quantity} und. x {formatCurrency(item.unitCost)}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <p className="font-semibold">{formatCurrency(item.quantity * item.unitCost)}</p>
                                                <button onClick={() => handleRemoveItem(index)} className="text-red-500 hover:text-red-700 p-1">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="flex justify-between font-bold px-2 pt-2">
                                    <span>Total a Pagar:</span>
                                    <span className="text-primary">
                                        {formatCurrency(items.reduce((sum, i) => sum + (i.quantity * i.unitCost), 0))}
                                    </span>
                                </div>
                            </div>
                        )}

                        <Button
                            className="w-full"
                            onClick={handleSubmit}
                            disabled={loading || items.length === 0 || !selectedSupplier}
                        >
                            <Save className="mr-2 h-4 w-4" />
                            {loading ? "Registrando..." : "Registrar Entrada Oficial"}
                        </Button>
                    </CardContent>
                </Card>

                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-primary" />
                            Historial de Entradas
                        </CardTitle>
                        <CardDescription>Últimos movimientos de ingreso de inventario</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                            <Table>
                                <TableHeader className="bg-slate-50 sticky top-0 shadow-sm">
                                    <TableRow>
                                        <TableHead className="whitespace-nowrap">Fecha</TableHead>
                                        <TableHead>Proveedor</TableHead>
                                        <TableHead>Referencia</TableHead>
                                        <TableHead>Artículos</TableHead>
                                        <TableHead className="text-right whitespace-nowrap">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                                No hay registros de entradas
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        logs.map(log => {
                                            const totalItems = Array.isArray(log.items) 
                                                ? log.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) 
                                                : 0;
                                            return (
                                                <TableRow key={log._id}>
                                                    <TableCell className="text-xs whitespace-nowrap">
                                                        {new Date(log.createdAt || (log as any).date).toLocaleDateString('es-CO')}
                                                    </TableCell>
                                                    <TableCell className="font-medium text-sm">
                                                        {typeof log.supplier === 'object' && log.supplier && 'name' in log.supplier 
                                                            ? log.supplier.name 
                                                            : "Sin nombre de proveedor"}
                                                    </TableCell>
                                                    <TableCell className="text-[10px] font-mono font-bold uppercase text-slate-500">
                                                        {log.referenceNumber || "S/N"}
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        <span className="bg-slate-100 px-2 py-0.5 rounded-full font-bold">{totalItems} und.</span>
                                                    </TableCell>
                                                    <TableCell className="text-right font-black text-sm text-emerald-700">
                                                        {formatCurrency(log.total)}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
