"use client"

import { useState, useEffect } from "react"
import styles from './suppliers.module.css'
import { Plus, Edit, Trash2, Truck, Mail, Phone, MapPin } from 'lucide-react'
import { toast } from 'sonner'

interface Supplier {
    _id: string
    name: string
    contactName?: string
    email?: string
    phone?: string
    address?: string
    taxId?: string
    createdAt: string
}

export default function SuppliersView() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
    const [formData, setFormData] = useState({
        name: "",
        contactName: "",
        email: "",
        phone: "",
        address: "",
        taxId: "",
    })

    useEffect(() => {
        fetchSuppliers()
    }, [])

    const fetchSuppliers = async () => {
        try {
            const response = await fetch("/api/proveedores")
            if (response.ok) {
                const data = await response.json()
                setSuppliers(Array.isArray(data) ? data : [])
            }
        } catch (error) {
            toast.error("Error al cargar proveedores")
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const url = editingSupplier ? `/api/proveedores/${editingSupplier._id}` : "/api/proveedores"
            const method = editingSupplier ? "PUT" : "POST"

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            })

            if (response.ok) {
                toast.success(editingSupplier ? "Proveedor actualizado" : "Proveedor creado")
                setIsDialogOpen(false)
                resetForm()
                fetchSuppliers()
            } else {
                const error = await response.json()
                toast.error(error.error || "Error al guardar proveedor")
            }
        } catch (error) {
            toast.error("Error al guardar proveedor")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este proveedor?")) return

        try {
            const response = await fetch(`/api/proveedores/${id}`, { method: "DELETE" })
            if (response.ok) {
                toast.success("Proveedor eliminado")
                fetchSuppliers()
            } else {
                toast.error("Error al eliminar proveedor")
            }
        } catch (error) {
            toast.error("Error al eliminar proveedor")
        }
    }

    const resetForm = () => {
        setFormData({
            name: "",
            contactName: "",
            email: "",
            phone: "",
            address: "",
            taxId: "",
        })
        setEditingSupplier(null)
    }

    const openEditDialog = (supplier: Supplier) => {
        setEditingSupplier(supplier)
        setFormData({
            name: supplier.name,
            contactName: supplier.contactName || "",
            email: supplier.email || "",
            phone: supplier.phone || "",
            address: supplier.address || "",
            taxId: supplier.taxId || "",
        })
        setIsDialogOpen(true)
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Proveedores</h1>
                <button
                    onClick={() => { resetForm(); setIsDialogOpen(true) }}
                    className="bg-primary text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90"
                >
                    <Plus size={20} />
                    Nuevo Proveedor
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Cargando proveedores...</div>
            ) : suppliers.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <Truck size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No hay proveedores registrados</p>
                </div>
            ) : (
                <div className={styles.supplierGrid}>
                    {suppliers.map((supplier) => (
                        <div key={supplier._id} className={styles.supplierCard}>
                            <div className={styles.supplierHeader}>
                                <div className={styles.supplierIcon}>
                                    <Truck size={24} />
                                </div>
                                <div className={styles.supplierInfo}>
                                    <div className={styles.supplierName}>{supplier.name}</div>
                                    {supplier.contactName && (
                                        <div className={styles.supplierContact}>{supplier.contactName}</div>
                                    )}
                                </div>
                            </div>

                            <div className={styles.supplierDetails}>
                                {supplier.email && (
                                    <div className={styles.detailRow}>
                                        <Mail size={16} />
                                        <span>{supplier.email}</span>
                                    </div>
                                )}
                                {supplier.phone && (
                                    <div className={styles.detailRow}>
                                        <Phone size={16} />
                                        <span>{supplier.phone}</span>
                                    </div>
                                )}
                                {supplier.address && (
                                    <div className={styles.detailRow}>
                                        <MapPin size={16} />
                                        <span>{supplier.address}</span>
                                    </div>
                                )}
                            </div>

                            <div className={styles.supplierActions}>
                                <button
                                    onClick={() => window.location.href = `/inventario?supplierId=${supplier._id}`}
                                    className="flex-1 px-3 py-2 bg-emerald-50 text-emerald-600 rounded-md hover:bg-emerald-100 flex items-center justify-center gap-2 text-sm font-bold"
                                    title="Ver catálogo de este proveedor"
                                >
                                    <Truck size={16} />
                                    Catálogo
                                </button>
                                <button
                                    onClick={() => openEditDialog(supplier)}
                                    className="px-3 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 flex items-center justify-center gap-2"
                                >
                                    <Edit size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(supplier._id)}
                                    className="px-3 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 text-red-500"
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
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold">
                                {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6">
                            <div className={styles.formGrid}>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Nombre de la Empresa *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-md"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Persona de Contacto</label>
                                    <input
                                        type="text"
                                        value={formData.contactName}
                                        onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-md"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-md"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Teléfono</label>
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-md"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">NIT/RUT</label>
                                    <input
                                        type="text"
                                        value={formData.taxId}
                                        onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-md"
                                    />
                                </div>

                                <div className="col-span-full">
                                    <label className="block text-sm font-medium mb-2">Dirección</label>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-md"
                                        rows={2}
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
                                    {loading ? 'Guardando...' : (editingSupplier ? 'Actualizar' : 'Crear')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
