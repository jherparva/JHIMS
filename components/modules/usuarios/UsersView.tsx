"use client"

import { useState, useEffect } from "react"
import styles from './users.module.css'
import { Plus, Edit, Trash2, User } from 'lucide-react'
import { toast } from 'sonner'

interface UserData {
    _id: string
    fullName: string
    username: string
    email: string
    role: string
    permissions?: string[]
    createdAt: string
}

// Permisos que se pueden asignar individualmente a un Vendedor
const SELLER_PERMISSIONS = [
    { id: 'products.view', label: 'Ver Inventario' },
    { id: 'sales.create', label: 'Realizar Ventas (Caja)' },
    { id: 'sales.view', label: 'Ver Historial de Ventas' },
    { id: 'customers.create', label: 'Registrar Clientes' },
    { id: 'customers.view', label: 'Ver Clientes' },
    { id: 'categories.view', label: 'Ver Categorías' },
]

// Resumen de lo que puede/no puede hacer cada rol
const ROLE_INFO = {
    admin: {
        label: 'Administrador',
        color: 'bg-emerald-100 text-emerald-800',
        can: ['Todo el sistema', 'Usuarios', 'Configuración', 'Reportes', 'Inventario', 'Proveedores', 'Entradas'],
        cannot: []
    },
    seller: {
        label: 'Vendedor',
        color: 'bg-blue-100 text-blue-700',
        can: ['Dashboard', 'Punto de Venta', 'Ver Historial de Ventas'],
        cannot: ['Inventario', 'Reportes', 'Proveedores', 'Entradas de Stock', 'Usuarios', 'Configuración']
    }
}

export default function UsersView() {
    const [users, setUsers] = useState<UserData[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<UserData | null>(null)
    const [formData, setFormData] = useState({
        fullName: "",
        username: "",
        email: "",
        password: "",
        role: "seller",
        permissions: [] as string[],
    })

    useEffect(() => {
        fetchUsers()
    }, [])

    const fetchUsers = async () => {
        try {
            const response = await fetch("/api/usuarios")
            if (response.ok) {
                const data = await response.json()
                setUsers(Array.isArray(data) ? data : [])
            }
        } catch (error) {
            toast.error("Error al cargar usuarios")
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const payload: any = {
                fullName: formData.fullName,
                username: formData.username,
                email: formData.email,
                role: formData.role,
            }

            if (!editingUser || formData.password) {
                if (!formData.password) {
                    toast.error("La contraseña es requerida")
                    setLoading(false)
                    return
                }
                if (formData.password.length < 8) {
                    toast.error("La contraseña debe tener al menos 8 caracteres")
                    setLoading(false)
                    return
                }
                payload.password = formData.password
            }

            if (formData.role === "seller") {
                payload.permissions = formData.permissions || []
            }

            const url = editingUser ? `/api/usuarios/${editingUser._id}` : "/api/usuarios"
            const method = editingUser ? "PUT" : "POST"

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            })

            if (response.ok) {
                toast.success(editingUser ? "Usuario actualizado" : "Usuario creado")
                setIsDialogOpen(false)
                resetForm()
                fetchUsers()
            } else {
                const error = await response.json()
                if (error.code === 'LIMIT_REACHED') {
                    toast.error(error.error, {
                        action: {
                            label: "Ver Planes",
                            onClick: () => window.location.href = "/precios"
                        },
                        duration: 5000
                    })
                } else {
                    toast.error(error.error || "Error al guardar usuario")
                }
            }
        } catch (error) {
            toast.error("Error al guardar usuario")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este usuario?")) return

        try {
            const response = await fetch(`/api/usuarios/${id}`, { method: "DELETE" })
            if (response.ok) {
                toast.success("Usuario eliminado")
                fetchUsers()
            } else {
                toast.error("Error al eliminar usuario")
            }
        } catch (error) {
            toast.error("Error al eliminar usuario")
        }
    }

    const resetForm = () => {
        setFormData({
            fullName: "",
            username: "",
            email: "",
            password: "",
            role: "seller",
            permissions: [],
        })
        setEditingUser(null)
    }

    const openEditDialog = (user: UserData) => {
        setEditingUser(user)
        setFormData({
            fullName: user.fullName,
            username: user.username,
            email: user.email,
            password: "",
            role: user.role,
            permissions: user.permissions || [],
        })
        setIsDialogOpen(true)
    }

    const handleImpersonate = async (userId: string) => {
        if (!confirm("¿Deseas simular la sesión de este usuario?")) return
        
        try {
            const res = await fetch(`/api/usuarios/${userId}/impersonate`, { method: "POST" })
            if (res.ok) {
                const data = await res.json()
                toast.success(data.message)
                window.location.href = data.redirect || "/dashboard"
            } else {
                toast.error("Error al iniciar simulación")
            }
        } catch (error) {
            toast.error("Error de conexión")
        }
    }

    const togglePermission = (permissionId: string) => {
        setFormData(prev => ({
            ...prev,
            permissions: prev.permissions.includes(permissionId)
                ? prev.permissions.filter(p => p !== permissionId)
                : [...prev.permissions, permissionId]
        }))
    }

    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Gestión de Usuarios</h1>
                <button
                    onClick={() => { resetForm(); setIsDialogOpen(true) }}
                    className="bg-primary text-white px-4 py-2 rounded-md flex items-center gap-2 hover:bg-primary/90"
                >
                    <Plus size={20} />
                    Nuevo Usuario
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-gray-500">Cargando usuarios...</div>
            ) : users.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <User size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No hay usuarios registrados</p>
                </div>
            ) : (
                <div className={styles.userGrid}>
                    {users.map((user) => (
                        <div key={user._id} className={styles.userCard}>
                            <div className={styles.userHeader}>
                                <div className={styles.userAvatar}>
                                    {getInitials(user.fullName)}
                                </div>
                                <div className={styles.userInfo}>
                                    <div className={styles.userName}>{user.fullName}</div>
                                    <div className={styles.userEmail}>{user.email}</div>
                                </div>
                            </div>

                            <div className={`${styles.userRole} ${user.role === 'admin' ? styles.roleAdmin : styles.roleSeller}`}>
                                {user.role === 'admin' ? '👑 Administrador' : '🛒 Vendedor'}
                            </div>
                            {user.role === 'seller' && user.permissions && user.permissions.length > 0 && (
                                <div className="text-xs text-muted-foreground px-4 pb-2">
                                    {user.permissions.length} permisos personalizados
                                </div>
                            )}

                            <div className={styles.userActions}>
                                <button
                                    onClick={() => openEditDialog(user)}
                                    className="px-3 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 flex items-center justify-center gap-2"
                                >
                                    <Edit size={16} />
                                    Editar
                                </button>
                                {user.role === 'seller' && (
                                    <button
                                        onClick={() => handleImpersonate(user._id)}
                                        className="flex-1 px-3 py-2 bg-amber-50 text-amber-600 rounded-md hover:bg-amber-100 flex items-center justify-center gap-2"
                                    >
                                        <User size={16} />
                                        Ver Como
                                    </button>
                                )}
                                <button
                                    onClick={() => handleDelete(user._id)}
                                    className="px-3 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Dialog Modal (simplified - would use shadcn Dialog in production) */}
            {isDialogOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold">
                                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                            <div className={styles.formGrid}>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Nombre Completo</label>
                                    <input
                                        type="text"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-md"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Usuario</label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-md"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-md"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">Contraseña</label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-md"
                                        placeholder={editingUser ? "Dejar vacío para no cambiar" : ""}
                                    />
                                </div>

                                <div className="col-span-full">
                                    <label className="block text-sm font-medium mb-2">Rol</label>
                                    <select
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value, permissions: [] })}
                                        className="w-full px-3 py-2 border rounded-md"
                                    >
                                        <option value="seller">🛒 Vendedor — solo puede vender</option>
                                        <option value="admin">👑 Administrador — acceso total</option>
                                    </select>
                                </div>

                                {/* Tarjeta informativa del rol seleccionado */}
                                {formData.role in ROLE_INFO && (
                                    <div className="col-span-full bg-slate-50 border rounded-lg p-4 text-sm">
                                        <p className="font-semibold mb-2">
                                            {formData.role === 'admin' ? '👑 Administrador' : '🛒 Vendedor'} — Acceso:
                                        </p>
                                        <div className="flex gap-6">
                                            <div>
                                                <p className="text-emerald-600 font-medium mb-1">✅ Puede:</p>
                                                {ROLE_INFO[formData.role as 'admin' | 'seller'].can.map(c => <p key={c} className="text-gray-600">• {c}</p>)}
                                            </div>
                                            {ROLE_INFO[formData.role as 'admin' | 'seller'].cannot.length > 0 && (
                                                <div>
                                                    <p className="text-red-500 font-medium mb-1">❌ No puede:</p>
                                                    {ROLE_INFO[formData.role as 'admin' | 'seller'].cannot.map(c => <p key={c} className="text-gray-600">• {c}</p>)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {formData.role === 'seller' && (
                                    <div className="col-span-full">
                                        <label className="block text-sm font-medium mb-2">
                                            Permisos adicionales del vendedor
                                            <span className="font-normal text-gray-500 ml-1">(dejar vacío para usar los predeterminados)</span>
                                        </label>
                                        <div className={styles.permissionsGrid}>
                                            {SELLER_PERMISSIONS.map((permission: { id: string, label: string }) => (
                                                <label key={permission.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.permissions.includes(permission.id)}
                                                        onChange={() => togglePermission(permission.id)}
                                                        className="w-4 h-4 accent-primary"
                                                    />
                                                    <span className="text-sm">{permission.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 mt-6 pt-6 border-t">
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
                                    {loading ? 'Guardando...' : (editingUser ? 'Actualizar' : 'Crear')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
