"use client"

import { useState, useEffect } from "react"
import styles from './categories.module.css'
import { Plus, Edit, Trash2, FolderOpen, Tag } from 'lucide-react'
import { toast } from 'sonner'

interface Category {
    _id: string
    name: string
    description?: string
    createdAt: string
}

export default function CategoriesView() {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const [formData, setFormData] = useState({
        name: "",
        description: "",
    })

    useEffect(() => {
        fetchCategories()
    }, [])

    const fetchCategories = async () => {
        try {
            const response = await fetch("/api/categorias")
            if (response.ok) {
                const data = await response.json()
                setCategories(Array.isArray(data) ? data : (data.categories || []))
            }
        } catch (error) {
            toast.error("Error al cargar categorías")
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const url = editingCategory ? `/api/categorias/${editingCategory._id}` : "/api/categorias"
            const method = editingCategory ? "PUT" : "POST"

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            if (response.ok) {
                toast.success(editingCategory ? "Categoría actualizada" : "Categoría creada")
                setIsDialogOpen(false)
                resetForm()
                fetchCategories()
            } else {
                const error = await response.json()
                toast.error(error.error || "Error al guardar categoría")
            }
        } catch (error) {
            toast.error("Error al guardar categoría")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar esta categoría?")) return

        try {
            const response = await fetch(`/api/categorias/${id}`, { method: "DELETE" })
            if (response.ok) {
                toast.success("Categoría eliminada")
                fetchCategories()
            } else {
                toast.error("Error al eliminar categoría")
            }
        } catch (error) {
            toast.error("Error al eliminar categoría")
        }
    }

    const resetForm = () => {
        setFormData({ name: "", description: "" })
        setEditingCategory(null)
    }

    const openEditDialog = (category: Category) => {
        setEditingCategory(category)
        setFormData({
            name: category.name,
            description: category.description || "",
        })
        setIsDialogOpen(true)
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Categorías de Productos</h1>
                <button
                    onClick={() => { resetForm(); setIsDialogOpen(true) }}
                    className="bg-primary text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90"
                >
                    <Plus size={20} />
                    Nueva Categoría
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Cargando categorías...</div>
            ) : categories.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <FolderOpen size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No hay categorías registradas</p>
                </div>
            ) : (
                <div className={styles.categoryGrid}>
                    {categories.map((category) => (
                        <div key={category._id} className={styles.categoryCard}>
                            <div className={styles.categoryIcon}>
                                <Tag size={24} />
                            </div>

                            <div className={styles.categoryName}>{category.name}</div>
                            <div className={styles.categoryDescription}>
                                {category.description || "Sin descripción"}
                            </div>

                            <div className={styles.categoryActions}>
                                <button
                                    onClick={() => openEditDialog(category)}
                                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 flex items-center justify-center gap-2"
                                >
                                    <Edit size={16} />
                                    Editar
                                </button>
                                <button
                                    onClick={() => handleDelete(category._id)}
                                    className="px-3 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Dialog Modal */}
            {isDialogOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-md w-full">
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold">
                                {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6">
                            <div className={styles.formGrid}>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Nombre *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-md"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Descripción</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-md"
                                        rows={3}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 mt-6">
                                <button
                                    type="button"
                                    onClick={() => { setIsDialogOpen(false); resetForm() }}
                                    className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {loading ? 'Guardando...' : (editingCategory ? 'Actualizar' : 'Crear')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
