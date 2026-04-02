"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Loader2, Image as ImageIcon, Globe, Upload, Trash2, Scan, Plus } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const PREDEFINED_IMAGES = [
    { name: "Alimentos", url: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=800&q=80" },
    { name: "Bebidas", url: "https://images.unsplash.com/photo-1527960669566-f882ba85a4c6?auto=format&fit=crop&w=400&q=70" },
    { name: "Aseo", url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=400&q=70" },
    { name: "Ferreteria", url: "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=400&q=70" },
    { name: "Restaurante", url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=70" },
    { name: "Snacks", url: "https://images.unsplash.com/photo-1599490659213-e2b9527bb087?auto=format&fit=crop&w=400&q=70" }
]

interface ProductDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
    product?: any // If provided, we are editing
}

export function ProductDialog({ open, onOpenChange, onSuccess, product }: ProductDialogProps) {
    const [loading, setLoading] = useState(false)
    const [categories, setCategories] = useState<any[]>([])
    const [suppliers, setSuppliers] = useState<any[]>([])
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const { register, handleSubmit, reset, setValue, watch } = useForm()

    const [variants, setVariants] = useState<any[]>([])
    const [hasVariants, setHasVariants] = useState(false)

    const currentImageUrl = watch("imageUrl")

    useEffect(() => {
        if (open) {
            fetchCategories()
            fetchSuppliers()
            if (product) {
                // Initialize form with product data
                setValue("name", product.name)
                setValue("sku", product.sku)
                setValue("categoryId", product.category?._id || product.categoryId)
                setValue("supplierId", product.supplier?._id || product.supplierId || "")
                setValue("salePrice", product.salePrice)
                setValue("costPrice", product.purchasePrice || product.costPrice || 0)
                setValue("stock", product.stock)
                setValue("minStock", product.minStock)
                setValue("description", product.description || "")
                const img = product.imageUrl || product.image || ""
                setValue("imageUrl", img)
                setImagePreview(img || null)
                
                // Cargar Variantes
                setHasVariants(product.hasVariants || false)
                setVariants(product.variants || [])
            } else {
                reset()
                setImagePreview(null)
                setHasVariants(false)
                setVariants([])
            }
        }
    }, [open, product, setValue, reset])

    const fetchCategories = async () => {
        try {
            const response = await fetch("/api/categorias")
            if (response.ok) {
                const data = await response.json()
                const list = Array.isArray(data) ? data : (data.categories || [])
                setCategories(list)
            }
        } catch (error) {
            console.error("Error fetching categories:", error)
        }
    }

    const fetchSuppliers = async () => {
        try {
            const response = await fetch("/api/proveedores")
            if (response.ok) {
                const data = await response.json()
                setSuppliers(Array.isArray(data) ? data : [])
            }
        } catch (error) {
            console.error("Error fetching suppliers:", error)
        }
    }

    const onAddVariant = () => {
        setVariants([...variants, { name: "", sku: "", stock: 0, salePrice: watch("salePrice") || 0 }])
    }

    const onRemoveVariant = (index: number) => {
        setVariants(variants.filter((_, i) => i !== index))
    }

    const onUpdateVariant = (index: number, field: string, value: any) => {
        const next = [...variants]
        next[index] = { ...next[index], [field]: value }
        setVariants(next)
    }

    const onSubmit = async (data: any) => {
        setLoading(true)
        try {
            const url = product ? `/api/productos/${product._id}` : "/api/productos"
            const method = product ? "PUT" : "POST"

            // Mapear "none" a null para el proveedor
            const submitData = {
                ...data,
                salePrice: parseFloat(data.salePrice),
                costPrice: parseFloat(data.costPrice || 0),
                stock: parseInt(data.stock || 0),
                minStock: parseInt(data.minStock || 0),
                supplierId: data.supplierId === "none" ? null : data.supplierId,
                hasVariants,
                variants: hasVariants ? variants : []
            }

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(submitData),
            })

            if (response.ok) {
                toast.success(product ? "Producto actualizado" : "Producto creado")
                onOpenChange(false)
                reset()
                onSuccess()
            } else {
                const error = await response.json()
                toast.error(error.error || "Error al guardar producto")
            }
        } catch (error) {
            toast.error("Error de conexión")
        } finally {
            setLoading(false)
        }
    }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onloadend = () => {
            const tempImg = new Image()
            tempImg.onload = () => {
                const MAX_WIDTH = 800
                const MAX_HEIGHT = 800
                let width = tempImg.width
                let height = tempImg.height

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width)
                        width = MAX_WIDTH
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width = Math.round((width * MAX_HEIGHT) / height)
                        height = MAX_HEIGHT
                    }
                }

                const canvas = document.createElement("canvas")
                canvas.width = width
                canvas.height = height
                
                const ctx = canvas.getContext("2d")
                if (ctx) {
                    ctx.drawImage(tempImg, 0, 0, width, height)
                    const compressedBase64 = canvas.toDataURL("image/webp", 0.7)
                    setValue("imageUrl", compressedBase64)
                    setImagePreview(compressedBase64)
                }
            }
            tempImg.src = reader.result as string
        }
        reader.readAsDataURL(file)
    }

    const selectPredefined = (url: string) => {
        setValue("imageUrl", url)
        setImagePreview(url)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[95vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{product ? "Editar Producto" : "Crear Nuevo Producto"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre del Producto *</Label>
                            <Input id="name" {...register("name", { required: true })} placeholder="Ej: Arroz Diana 1kg" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sku" className="flex items-center gap-2">
                                <Scan size={14} className="text-amber-500" /> SKU / Código de Barras *
                            </Label>
                            <Input 
                                id="sku" 
                                {...register("sku", { required: true })} 
                                placeholder="Escanea o escribe el código..." 
                                className="bg-amber-50/30 border-amber-200 focus-visible:ring-amber-500"
                            />
                            <p className="text-[10px] text-amber-600 font-medium italic">💡 Haz clic y escanea para capturar el código de barras</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Categoría *</Label>
                            <Select 
                                value={watch("categoryId") || undefined}
                                onValueChange={(value) => setValue("categoryId", value)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Selecciona categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat._id} value={cat._id}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <input type="hidden" {...register("categoryId", { required: true })} />
                        </div>
                        <div className="space-y-2">
                            <Label>Proveedor (Opcional)</Label>
                            <Select 
                                value={watch("supplierId") || "none"}
                                onValueChange={(value) => setValue("supplierId", value)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Selecciona proveedor" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Sin Proveedor (Local)</SelectItem>
                                    {suppliers.map((sup) => (
                                        <SelectItem key={sup._id} value={sup._id}>{sup.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <input type="hidden" {...register("supplierId")} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="salePrice">PVenta *</Label>
                            <Input id="salePrice" type="number" step="0.01" {...register("salePrice", { required: true })} placeholder="0.00" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="costPrice">PCosto</Label>
                            <Input id="costPrice" type="number" step="0.01" {...register("costPrice")} placeholder="0.00" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="stock">Stock</Label>
                            <Input id="stock" type="number" {...register("stock")} placeholder="0" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="minStock">Min</Label>
                            <Input id="minStock" type="number" {...register("minStock")} placeholder="5" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descripción</Label>
                        <Textarea id="description" {...register("description")} placeholder="Detalles adicionales del producto..." rows={2} />
                    </div>

                    <div className="space-y-2">
                        <Label>Imagen del Producto</Label>
                        <input type="hidden" {...register("imageUrl")} />
                        <div className="flex flex-col md:flex-row gap-4 p-3 border rounded-xl bg-slate-50/50">
                            <div className="w-24 h-24 rounded-lg border-2 border-dashed border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 group relative">
                                {imagePreview ? (
                                    <>
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-contain p-1" />
                                        <button 
                                            type="button"
                                            onClick={() => { setImagePreview(null); setValue("imageUrl", ""); }}
                                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <ImageIcon className="text-slate-300" size={24} />
                                )}
                            </div>

                            <div className="flex-1 space-y-2">
                                <Tabs defaultValue="library" className="w-full">
                                    <TabsList className="grid grid-cols-3 w-full h-8 p-1">
                                        <TabsTrigger value="library" className="text-[9px] uppercase font-bold">Biblioteca</TabsTrigger>
                                        <TabsTrigger value="url" className="text-[9px] uppercase font-bold">URL</TabsTrigger>
                                        <TabsTrigger value="upload" className="text-[9px] uppercase font-bold">Archivo</TabsTrigger>
                                    </TabsList>
                                    
                                    <TabsContent value="library" className="pt-2">
                                        <div className="grid grid-cols-6 gap-1">
                                            {PREDEFINED_IMAGES.map((img) => (
                                                <button
                                                    key={img.name}
                                                    type="button"
                                                    onClick={() => selectPredefined(img.url)}
                                                    className={`hover:scale-110 transition-transform rounded border ${imagePreview === img.url ? 'border-violet-500' : 'border-transparent'}`}
                                                >
                                                    <img src={img.url} alt={img.name} className="w-full h-6 object-cover rounded" />
                                                </button>
                                            ))}
                                        </div>
                                    </TabsContent>
                                    
                                    <TabsContent value="url" className="pt-2">
                                        <Input 
                                            placeholder="https://..." 
                                            className="h-8 text-xs" 
                                            value={currentImageUrl || ""}
                                            onChange={(e) => {
                                                setValue("imageUrl", e.target.value)
                                                setImagePreview(e.target.value)
                                            }}
                                        />
                                    </TabsContent>
                                    
                                    <TabsContent value="upload" className="pt-2">
                                        <label className="flex items-center justify-center gap-2 w-full h-8 px-4 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                                            <Upload size={12} className="text-slate-500" />
                                            <span className="text-[10px] font-medium text-slate-600">Subir Imagen</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                        </label>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN DE VARIANTES */}
                    <div className="space-y-4 pt-2 border-t mt-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-base font-bold">Manejar Variaciones</Label>
                                <p className="text-[10px] text-slate-500 font-medium">Activa si este producto tiene tallas, colores o versiones</p>
                            </div>
                            <div 
                                onClick={() => setHasVariants(!hasVariants)}
                                className={cn(
                                    "w-12 h-6 rounded-full p-1 cursor-pointer transition-colors",
                                    hasVariants ? "bg-violet-600" : "bg-slate-200"
                                )}
                            >
                                <div className={cn(
                                    "w-4 h-4 bg-white rounded-full transition-transform",
                                    hasVariants ? "translate-x-6" : "translate-x-0"
                                )} />
                            </div>
                        </div>

                        {hasVariants && (
                            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-black uppercase text-slate-500 tracking-tight">Lista de Variaciones</h4>
                                    <Button type="button" variant="outline" size="sm" onClick={onAddVariant} className="h-8 text-[10px] font-bold uppercase gap-1 border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100">
                                        <Plus size={12} /> Añadir Variación
                                    </Button>
                                </div>
                                
                                {variants.length === 0 ? (
                                    <p className="text-[10px] text-center py-4 italic text-slate-400">Pulsa "Añadir Variación" para comenzar</p>
                                ) : (
                                    <div className="space-y-2">
                                        {variants.map((v, i) => (
                                            <div key={i} className="grid grid-cols-12 gap-2 items-end bg-white p-2 rounded-xl border shadow-sm group">
                                                <div className="col-span-4 space-y-1">
                                                    <Label className="text-[9px] uppercase font-bold text-slate-400 ml-1">Talla/Color</Label>
                                                    <Input className="h-8 text-xs font-medium" value={v.name} onChange={(e) => onUpdateVariant(i, 'name', e.target.value)} placeholder="Ej: Rojo" />
                                                </div>
                                                <div className="col-span-3 space-y-1">
                                                    <Label className="text-[9px] uppercase font-bold text-slate-400 ml-1">SKU</Label>
                                                    <Input className="h-8 text-xs font-mono" value={v.sku} onChange={(e) => onUpdateVariant(i, 'sku', e.target.value)} placeholder="CB01" />
                                                </div>
                                                <div className="col-span-2 space-y-1">
                                                    <Label className="text-[9px] uppercase font-bold text-slate-400 ml-1">Precio</Label>
                                                    <Input type="number" className="h-8 text-xs font-black" value={v.salePrice} onChange={(e) => onUpdateVariant(i, 'salePrice', parseFloat(e.target.value))} />
                                                </div>
                                                <div className="col-span-2 space-y-1">
                                                    <Label className="text-[9px] uppercase font-bold text-slate-400 ml-1">Stock</Label>
                                                    <Input type="number" className="h-8 text-xs font-bold" value={v.stock} onChange={(e) => onUpdateVariant(i, 'stock', parseInt(e.target.value))} />
                                                </div>
                                                <div className="col-span-1">
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => onRemoveVariant(i)} className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                                                        <Trash2 size={14} />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading} className="bg-primary hover:bg-primary/90 min-w-[120px]">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {product ? "Guardar Cambios" : "Crear Producto"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
