"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Loader2, Image as ImageIcon, Globe, Upload, Trash2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const { register, handleSubmit, reset, setValue, watch } = useForm()

    const currentImageUrl = watch("imageUrl")

    useEffect(() => {
        if (open) {
            fetchCategories()
            if (product) {
                // Initialize form with product data
                setValue("name", product.name)
                setValue("sku", product.sku)
                setValue("categoryId", product.category?._id || product.categoryId)
                setValue("salePrice", product.salePrice)
                setValue("costPrice", product.purchasePrice || product.costPrice || 0)
                setValue("stock", product.stock)
                setValue("minStock", product.minStock)
                setValue("description", product.description || "")
                const img = product.imageUrl || product.image || ""
                setValue("imageUrl", img)
                setImagePreview(img || null)
            } else {
                reset()
                setImagePreview(null)
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

    const onSubmit = async (data: any) => {
        setLoading(true)
        try {
            const url = product ? `/api/productos/${product._id}` : "/api/productos"
            const method = product ? "PUT" : "POST"

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    salePrice: parseFloat(data.salePrice),
                    costPrice: parseFloat(data.costPrice || 0),
                    stock: parseInt(data.stock || 0),
                    minStock: parseInt(data.minStock || 0),
                }),
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
                // Configurar el Canvas para compresión (max 800px)
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
                    // Exportar compreso como WEBP limitando tamaño de Base64
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
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{product ? "Editar Producto" : "Crear Nuevo Producto"}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nombre *</Label>
                            <Input id="name" {...register("name", { required: true })} placeholder="Ej: Camiseta Talla M" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="sku">SKU (Código) *</Label>
                            <Input id="sku" {...register("sku", { required: true })} placeholder="Ej: CAM-M-001" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Categoría *</Label>
                        <Select 
                            value={product?.category?._id || undefined}
                            onValueChange={(value) => setValue("categoryId", value)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Selecciona una categoría" />
                            </SelectTrigger>
                            <SelectContent>
                                {categories.map((cat) => (
                                    <SelectItem key={cat._id} value={cat._id}>
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <input type="hidden" {...register("categoryId", { required: true })} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="salePrice">Precio Venta *</Label>
                            <Input id="salePrice" type="number" step="0.01" {...register("salePrice", { required: true })} placeholder="0.00" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="costPrice">Costo (Opcional)</Label>
                            <Input id="costPrice" type="number" step="0.01" {...register("costPrice")} placeholder="0.00" />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="stock">Stock Actual</Label>
                            <Input id="stock" type="number" {...register("stock")} placeholder="0" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="minStock">Stock Mínimo</Label>
                            <Input id="minStock" type="number" {...register("minStock")} placeholder="5" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Descripción</Label>
                        <Textarea id="description" {...register("description")} placeholder="Detalles del producto..." />
                    </div>

                    <div className="space-y-2">
                        <Label>Imagen del Producto</Label>
                        <input type="hidden" {...register("imageUrl")} />
                        <div className="flex flex-col md:flex-row gap-6 p-4 border rounded-xl bg-slate-50/50">
                            {/* Preview Section */}
                            <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0 group relative">
                                {imagePreview ? (
                                    <>
                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-contain p-2" />
                                        <button 
                                            type="button"
                                            onClick={() => { setImagePreview(null); setValue("imageUrl", ""); }}
                                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </>
                                ) : (
                                    <ImageIcon className="text-slate-300" size={32} />
                                )}
                            </div>

                            {/* Options Section */}
                            <div className="flex-1 space-y-3">
                                <Tabs defaultValue="library" className="w-full">
                                    <TabsList className="grid grid-cols-3 w-full h-9 p-1">
                                        <TabsTrigger value="library" className="text-[10px] uppercase font-bold">Biblioteca</TabsTrigger>
                                        <TabsTrigger value="url" className="text-[10px] uppercase font-bold">Web URL</TabsTrigger>
                                        <TabsTrigger value="upload" className="text-[10px] uppercase font-bold">Subir</TabsTrigger>
                                    </TabsList>
                                    
                                    <TabsContent value="library" className="pt-2">
                                        <div className="grid grid-cols-3 gap-2">
                                            {PREDEFINED_IMAGES.map((img) => (
                                                <button
                                                    key={img.name}
                                                    type="button"
                                                    onClick={() => selectPredefined(img.url)}
                                                    className={`hover:scale-105 transition-transform p-0.5 border-2 rounded-lg overflow-hidden ${imagePreview === img.url ? 'border-violet-500' : 'border-transparent'}`}
                                                >
                                                    <img src={img.url} alt={img.name} className="w-full h-10 object-cover rounded-md" />
                                                    <span className="text-[8px] block mt-0.5 truncate">{img.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </TabsContent>
                                    
                                    <TabsContent value="url" className="pt-2">
                                        <div className="flex gap-2">
                                            <Input 
                                                placeholder="https://ejemplo.com/imagen.jpg" 
                                                className="h-8 text-xs" 
                                                value={currentImageUrl || ""}
                                                onChange={(e) => {
                                                    setValue("imageUrl", e.target.value)
                                                    setImagePreview(e.target.value)
                                                }}
                                            />
                                        </div>
                                    </TabsContent>
                                    
                                    <TabsContent value="upload" className="pt-2">
                                        <label className="flex items-center justify-center gap-2 w-full h-8 px-4 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                                            <Upload size={14} className="text-slate-500" />
                                            <span className="text-xs font-medium text-slate-600">Elegir de PC</span>
                                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                                        </label>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {product ? "Actualizar" : "Crear"} Producto
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
