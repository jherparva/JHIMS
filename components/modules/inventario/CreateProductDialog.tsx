"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Plus, Loader2 } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useEffect } from "react"

interface CreateProductDialogProps {
    onProductCreated: () => void
}

export function CreateProductDialog({ onProductCreated }: CreateProductDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [categories, setCategories] = useState<any[]>([])
    const { register, handleSubmit, reset, setValue } = useForm()

    useEffect(() => {
        if (open) {
            fetchCategories()
        }
    }, [open])

    const fetchCategories = async () => {
        try {
            console.log("Fetching categories...")
            const response = await fetch("/api/categorias")
            if (response.ok) {
                const data = await response.json()
                console.log("Categories received:", data)
                const list = Array.isArray(data) ? data : (data.categories || [])
                setCategories(list)
                if (list.length === 0) {
                    console.warn("No categories found in the database.")
                }
            } else {
                console.error("Failed to fetch categories:", response.status)
            }
        } catch (error) {
            console.error("Error fetching categories:", error)
        }
    }

    const onSubmit = async (data: any) => {
        console.log("Submitting form data:", data)
        setLoading(true)
        try {
            const response = await fetch("/api/productos", {
                method: "POST",
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
                toast.success("Producto creado exitosamente")
                setOpen(false)
                reset()
                onProductCreated()
            } else {
                const error = await response.json()
                toast.error(error.error || "Error al crear producto")
            }
        } catch (error) {
            toast.error("Error de conexión")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-primary text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90">
                    <Plus size={20} />
                    Nuevo Producto
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Crear Nuevo Producto</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit, (errors) => console.error("Form validation errors:", errors))} className="space-y-4 py-4">
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
                        <Select onValueChange={(value) => {
                            console.log("Category selected:", value)
                            setValue("categoryId", value)
                        }}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder={categories.length > 0 ? "Selecciona una categoría" : "Cargando categorías..."} />
                            </SelectTrigger>
                            <SelectContent position="popper" sideOffset={5}>
                                {categories.length === 0 && (
                                    <SelectItem value="none" disabled>No hay categorías disponibles</SelectItem>
                                )}
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
                            <Label htmlFor="stock">Stock Inicial</Label>
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

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar Producto
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
