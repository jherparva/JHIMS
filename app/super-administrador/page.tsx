"use client"

import { useState, useEffect } from "react"
import {
    Building2, Users, CheckCircle2, XCircle, Clock,
    Globe, Crown, RefreshCw, Ban, Power, Trash2, ShieldCheck,
    TrendingUp, ChevronDown, X, UserPlus, Mail, Lock, User, Eye, EyeOff
} from "lucide-react"
import { toast } from "sonner"
import TicketsManager from "./TicketsManager"
import { MessageSquare } from "lucide-react"

interface CompanyData {
    _id: string
    name: string
    email: string
    phone?: string
    plan: "free" | "basic" | "pro"
    status: "pending" | "active" | "suspended" | "cancelled" | "trial"
    businessType?: "tienda" | "ferreteria" | "restaurante" | "otro"
    salesCount: number
    totalRevenue: number
    createdAt: string
    adminUser?: { _id: string; fullName: string; email: string; username: string }
    usage: { currentUsers: number; currentProducts: number; currentSalesThisMonth: number }
    hasAdmin?: boolean
}

interface Stats {
    totalCompanies: number
    activeCompanies: number
    suspendedCompanies: number
    pendingCompanies: number
    totalUsers: number
}

const STATUS_CONFIG = {
    active: { label: "Activa", bg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" },
    pending: { label: "Pendiente", bg: "bg-amber-500/15 text-amber-400 border-amber-500/30", dot: "bg-amber-400" },
    suspended: { label: "Suspendida", bg: "bg-red-500/15 text-red-400 border-red-500/30", dot: "bg-red-400" },
    cancelled: { label: "Cancelada", bg: "bg-slate-500/15 text-slate-400 border-slate-500/30", dot: "bg-slate-400" },
    trial: { label: "Prueba", bg: "bg-blue-500/15 text-blue-400 border-blue-500/30", dot: "bg-blue-400" },
}

const PLAN_CONFIG = {
    free: { label: "Gratis", badge: "bg-slate-700 text-slate-300", icon: "⬜" },
    basic: { label: "Básico", badge: "bg-blue-900/60 text-blue-300", icon: "🔵" },
    pro: { label: "Profesional", badge: "bg-violet-900/60 text-violet-300", icon: "💎" },
}

function formatCOP(amount: number) {
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0 }).format(amount)
}

// ─── Modal de acciones ─────────────────────────────────────────────
function ActionModal({
    company, onClose, onChangeStatus, onChangePlan, onDelete, onUpdateBusiness
}: {
    company: CompanyData
    onClose: () => void
    onChangeStatus: (id: string, status: string) => void
    onChangePlan: (id: string, plan: string) => void
    onDelete: (id: string, name: string) => void
    onUpdateBusiness: (id: string, type: string, initCategories?: boolean) => void
}) {
    const statusCfg = STATUS_CONFIG[company.status] || STATUS_CONFIG.pending
    const planCfg = PLAN_CONFIG[company.plan] || PLAN_CONFIG.free
    const [selectedType, setSelectedType] = useState(company.businessType || "tienda")
    const [isInitializing, setIsInitializing] = useState(false)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div
                className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md"
                onClick={e => e.stopPropagation()}
            >
                {/* Cabecera */}
                <div className="flex items-start justify-between p-6 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-700 flex items-center justify-center text-xl font-bold text-white">
                            {company.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">{company.name}</h3>
                            <p className="text-slate-400 text-sm">{company.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                {/* Estado actual */}
                <div className="p-6 space-y-5">
                    <div className="flex items-center justify-between bg-slate-800/60 rounded-xl px-4 py-3">
                        <div>
                            <p className="text-xs text-slate-500 mb-1">Estado actual</p>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${statusCfg.bg}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                                {statusCfg.label}
                            </span>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-500 mb-1">Plan actual</p>
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${planCfg.badge}`}>
                                {planCfg.icon} {planCfg.label}
                            </span>
                        </div>
                    </div>

                    {/* ── SECCIÓN: Cambiar estado ── */}
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Cambiar Estado</p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                disabled={company.status === "active"}
                                onClick={() => { onChangeStatus(company._id, "active"); onClose() }}
                                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all
                                    bg-emerald-500/10 text-emerald-400 border border-emerald-500/30
                                    hover:bg-emerald-500/25 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                Activar
                            </button>
                            <button
                                disabled={company.status === "suspended"}
                                onClick={() => { onChangeStatus(company._id, "suspended"); onClose() }}
                                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all
                                    bg-amber-500/10 text-amber-400 border border-amber-500/30
                                    hover:bg-amber-500/25 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <Ban className="h-4 w-4" />
                                Suspender
                            </button>
                        </div>
                    </div>

                    {/* ── SECCIÓN: Cambiar plan ── */}
                    <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Cambiar Plan</p>
                        <div className="grid grid-cols-3 gap-2">
                            {(["free", "basic", "pro"] as const).map(plan => (
                                <button
                                    key={plan}
                                    disabled={company.plan === plan}
                                    onClick={() => { onChangePlan(company._id, plan); onClose() }}
                                    className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl text-sm font-medium transition-all border
                                        ${company.plan === plan
                                            ? "opacity-30 cursor-not-allowed border-slate-700 text-slate-500"
                                            : "hover:scale-105 cursor-pointer border-slate-600 hover:border-violet-500/50"
                                        } ${PLAN_CONFIG[plan].badge}`}
                                >
                                    <span className="text-lg">{PLAN_CONFIG[plan].icon}</span>
                                    <span>{PLAN_CONFIG[plan].label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── SECCIÓN: Tipo de Negocio y Categorías ── */}
                    <div className="border border-slate-700 rounded-xl p-4 bg-slate-800/30">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Tipo de Negocio</p>
                        <div className="space-y-3">
                            <select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value as any)}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-violet-500 outline-none"
                            >
                                <option value="tienda">🏪 Tienda / Minimercado</option>
                                <option value="ferreteria">🛠️ Ferretería</option>
                                <option value="restaurante">🍽️ Restaurante / Cafetería</option>
                                <option value="otro">📦 Otro / General</option>
                            </select>
                            
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onUpdateBusiness(company._id, selectedType)}
                                    className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-medium transition-colors"
                                >
                                    Guardar Tipo
                                </button>
                                <button
                                    onClick={async () => {
                                        if (confirm("¿Seguro que quieres generar categorías iniciales? Esto añadirá las categorías base del negocio (Aseo, Alimentos, etc.).")) {
                                            setIsInitializing(true)
                                            await onUpdateBusiness(company._id, selectedType, true)
                                            setIsInitializing(false)
                                            onClose()
                                        }
                                    }}
                                    disabled={isInitializing}
                                    className="flex-1 px-3 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/40 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-all"
                                >
                                    {isInitializing ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Building2 className="h-3 w-3" />}
                                    Auto-Categorías
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── SECCIÓN: Zona de peligro ── */}
                    <div className="border border-red-900/50 rounded-xl p-4 bg-red-950/20">
                        <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <Trash2 className="h-3.5 w-3.5" /> Zona de peligro
                        </p>
                        <button
                            onClick={() => { onDelete(company._id, company.name); onClose() }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium
                                bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-colors"
                        >
                            <Trash2 className="h-4 w-4" />
                            Eliminar empresa permanentemente
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Modal para crear administrador ─────────────────────────────────────
function CreateAdminModal({
    companies, onClose, onCreateAdmin
}: {
    companies: CompanyData[]
    onClose: () => void
    onCreateAdmin: (data: any) => void
}) {
    const [formData, setFormData] = useState({
        fullName: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
        companyId: "",
        createNewCompany: false,
        newCompanyName: "",
        newCompanyEmail: "",
        businessType: "tienda"
    })
    const [isLoading, setIsLoading] = useState(false)
    const [isCreatingCompany, setIsCreatingCompany] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        // Validaciones
        if (!formData.fullName || !formData.username || !formData.email || !formData.password) {
            toast.error("Todos los campos son requeridos")
            return
        }
        
        if (formData.password !== formData.confirmPassword) {
            toast.error("Las contraseñas no coinciden")
            return
        }
        
        if (formData.password.length < 6) {
            toast.error("La contraseña debe tener al menos 6 caracteres")
            return
        }
        
        // Validaciones específicas según el modo
        if (formData.createNewCompany) {
            if (!formData.newCompanyName || !formData.newCompanyEmail) {
                toast.error("Nombre y email de la empresa son requeridos")
                return
            }
        } else {
            if (!formData.companyId) {
                toast.error("Debe seleccionar una empresa")
                return
            }
        }
        
        setIsLoading(true)
        
        if (formData.createNewCompany) {
            // Primero crear la empresa
            await createCompanyAndAdmin()
        } else {
            // Solo crear admin para empresa existente
            await onCreateAdmin({
                fullName: formData.fullName,
                username: formData.username,
                email: formData.email,
                password: formData.password,
                companyId: formData.companyId
            })
        }
        
        setIsLoading(false)
    }

    const createCompanyAndAdmin = async () => {
        try {
            setIsCreatingCompany(true)
            
            // 1. Crear la empresa
            const companyRes = await fetch("/api/super-administrador/empresas", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formData.newCompanyName,
                    email: formData.newCompanyEmail,
                    businessType: formData.businessType,
                    plan: "free",
                    status: "active"
                })
            })
            
            if (!companyRes.ok) {
                const error = await companyRes.json()
                toast.error(error.error || "Error al crear empresa")
                return
            }
            
            const newCompany = await companyRes.json()
            
            // 2. Crear el administrador para la nueva empresa
            await onCreateAdmin({
                fullName: formData.fullName,
                username: formData.username,
                email: formData.email,
                password: formData.password,
                companyId: newCompany._id
            })
            
        } catch (error) {
            toast.error("Error de conexión")
        } finally {
            setIsCreatingCompany(false)
        }
    }

    const companiesWithoutAdmin = companies.filter(c => !c.adminUser)
    const companiesWithAdmin = companies.filter(c => c.adminUser)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div
                className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Cabecera */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-700 flex items-center justify-center">
                            <UserPlus className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">Crear Administrador</h3>
                            <p className="text-slate-400 text-sm">Asignar admin a una empresa</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    {/* Empresa */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Empresa *
                        </label>
                        
                        {/* Toggle entre empresa existente y nueva */}
                        <div className="flex gap-2 mb-3">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, createNewCompany: false })}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    !formData.createNewCompany
                                        ? "bg-violet-600 text-white"
                                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                }`}
                            >
                                Empresa Existente
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, createNewCompany: true })}
                                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                    formData.createNewCompany
                                        ? "bg-violet-600 text-white"
                                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                                }`}
                            >
                                + Crear Nueva Empresa
                            </button>
                        </div>

                        {!formData.createNewCompany ? (
                            // Selector de empresa existente
                            <>
                                <select
                                    value={formData.companyId}
                                    onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                    required
                                >
                                    <option value="">Seleccionar empresa...</option>
                                    {companiesWithoutAdmin.length > 0 && (
                                        <optgroup label="Empresas sin administrador">
                                            {companiesWithoutAdmin.map(company => (
                                                <option key={company._id} value={company._id}>
                                                    {company.name} ({company.email}) - SIN ADMIN
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}
                                    {companiesWithAdmin.length > 0 && (
                                        <optgroup label="Empresas con administrador (reemplazará al actual)">
                                            {companiesWithAdmin.map(company => (
                                                <option key={company._id} value={company._id}>
                                                    {company.name} ({company.email}) - Admin: {company.adminUser?.fullName}
                                                </option>
                                            ))}
                                        </optgroup>
                                    )}
                                </select>
                                {companies.length === 0 && (
                                    <p className="text-xs text-amber-400 mt-1">No hay empresas registradas</p>
                                )}
                                {companiesWithoutAdmin.length === 0 && companiesWithAdmin.length > 0 && (
                                    <p className="text-xs text-blue-400 mt-1">Todas las empresas tienen admin. Seleccionar una para reemplazar al administrador actual.</p>
                                )}
                            </>
                        ) : (
                            // Formulario para nueva empresa
                            <div className="space-y-3">
                                <div>
                                    <input
                                        type="text"
                                        value={formData.newCompanyName}
                                        onChange={(e) => setFormData({ ...formData, newCompanyName: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                        placeholder="Nombre de la nueva empresa*"
                                        required={formData.createNewCompany}
                                    />
                                </div>
                                <div>
                                    <input
                                        type="email"
                                        value={formData.newCompanyEmail}
                                        onChange={(e) => setFormData({ ...formData, newCompanyEmail: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                        placeholder="Email de la empresa*"
                                        required={formData.createNewCompany}
                                    />
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    <label className="text-xs font-semibold text-slate-500 uppercase px-1">Tipo de Negocio</label>
                                    <select
                                        value={formData.businessType}
                                        onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                        required={formData.createNewCompany}
                                    >
                                        <option value="tienda">🏪 Tienda / Minimercado</option>
                                        <option value="ferreteria">🛠️ Ferretería</option>
                                        <option value="restaurante">🍽️ Restaurante / Cafetería</option>
                                        <option value="otro">📦 Otro / General</option>
                                    </select>
                                </div>
                                <p className="text-xs text-slate-400">
                                    📋 Se crearán categorías automáticas según el tipo de negocio. La empresa inicia con plan "Gratis".
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Nombre completo */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Nombre completo *
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                value={formData.fullName}
                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                placeholder="Juan Pérez"
                                required
                            />
                        </div>
                    </div>

                    {/* Usuario */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Nombre de usuario *
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                placeholder="juanperez"
                                required
                            />
                        </div>
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Correo electrónico *
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                placeholder="admin@empresa.com"
                                required
                            />
                        </div>
                    </div>

                    {/* Contraseña */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Contraseña *
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                placeholder="Mínimo 6 caracteres"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    {/* Confirmar contraseña */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Confirmar contraseña *
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <input
                                type="password"
                                value={formData.confirmPassword}
                                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-slate-800 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                placeholder="Repetir contraseña"
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    {/* Botones */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-medium transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading || (!formData.createNewCompany && companiesWithoutAdmin.length === 0 && companiesWithAdmin.length === 0)}
                            className="flex-1 px-4 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            {isLoading || isCreatingCompany ? (
                                <>
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    {isCreatingCompany ? "Creando empresa..." : "Creando admin..."}
                                </>
                            ) : (
                                <>
                                    <UserPlus className="h-4 w-4" />
                                    {formData.createNewCompany ? "Crear Empresa y Admin" : "Crear Administrador"}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

// ─── Modal para editar usuarios de empresa ─────────────────────────────────────
function EditUsersModal({
    company, onClose
}: {
    company: CompanyData
    onClose: () => void
}) {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreateSeller, setShowCreateSeller] = useState(false)
    const [changingPassword, setChangingPassword] = useState<string | null>(null)
    const [newPasswords, setNewPasswords] = useState<{[key: string]: string}>({})
    const [deletingUser, setDeletingUser] = useState<string | null>(null)
    const [changingRole, setChangingRole] = useState<string | null>(null)

    useEffect(() => {
        loadUsers()
    }, [company._id])

    const loadUsers = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/super-administrador/usuarios?companyId=${company._id}`)
            if (res.ok) {
                const data = await res.json()
                setUsers(data.users)
            } else {
                toast.error("Error al cargar usuarios")
            }
        } catch {
            toast.error("Error de conexión")
        } finally {
            setLoading(false)
        }
    }

    const handlePasswordChange = async (userId: string) => {
        const newPassword = newPasswords[userId]
        if (!newPassword || newPassword.length < 6) {
            toast.error("La contraseña debe tener al menos 6 caracteres")
            return
        }

        setChangingPassword(userId)
        try {
            const res = await fetch("/api/super-administrador/usuarios", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, newPassword })
            })

            if (res.ok) {
                toast.success("Contraseña actualizada exitosamente")
                setNewPasswords({ ...newPasswords, [userId]: "" })
            } else {
                const error = await res.json()
                toast.error(error.error || "Error al actualizar contraseña")
            }
        } catch {
            toast.error("Error de conexión")
        } finally {
            setChangingPassword(null)
        }
    }

    const handleDeleteUser = async (userId: string, userName: string, userRole: string) => {
        const action = userRole === 'admin' ? 'eliminar administrador' : 'eliminar vendedor'
        if (!confirm(`¿Seguro que quieres ${action} "${userName}"?\n\nEsta acción es IRREVERSIBLE.`)) return
        
        setDeletingUser(userId)
        try {
            const res = await fetch(`/api/super-administrador/usuarios/${userId}`, { method: "DELETE" })
            
            if (res.ok) {
                toast.success(`${userRole === 'admin' ? 'Administrador' : 'Vendedor'} eliminado exitosamente`)
                loadUsers()
            } else {
                const error = await res.json()
                toast.error(error.error || "Error al eliminar usuario")
            }
        } catch {
            toast.error("Error de conexión")
        } finally {
            setDeletingUser(null)
        }
    }

    const handleRoleChange = async (userId: string, currentRole: string, userName: string) => {
        const newRole = currentRole === 'admin' ? 'seller' : 'admin'
        const action = newRole === 'admin' ? 'promover a administrador' : 'degradar a vendedor'
        
        if (!confirm(`¿Seguro que quieres ${action} "${userName}"?\n\n${newRole === 'admin' ? 'Obtendrá todos los privilegios de administrador' : 'Perderá privilegios de administrador'}.`)) return
        
        setChangingRole(userId)
        try {
            const res = await fetch(`/api/super-administrador/usuarios/${userId}/role`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: newRole })
            })
            
            if (res.ok) {
                const data = await res.json()
                toast.success(data.message)
                loadUsers()
            } else {
                const error = await res.json()
                toast.error(error.error || "Error al cambiar rol")
            }
        } catch {
            toast.error("Error de conexión")
        } finally {
            setChangingRole(null)
        }
    }

    const handleCreateSeller = async (sellerData: any) => {
        try {
            const res = await fetch("/api/super-administrador/usuarios", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...sellerData, companyId: company._id })
            })

            if (res.ok) {
                const data = await res.json()
                toast.success(data.message)
                setShowCreateSeller(false)
                loadUsers()
            } else {
                const error = await res.json()
                toast.error(error.error || "Error al crear vendedor")
            }
        } catch {
            toast.error("Error de conexión")
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <div
                className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Cabecera */}
                <div className="flex items-start justify-between p-6 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-700 flex items-center justify-center text-xl font-bold text-white">
                            {company.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-lg">Editar Usuarios - {company.name}</h3>
                            <p className="text-slate-400 text-sm">Gestionar administrador y vendedores</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                {/* Contenido */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    {loading ? (
                        <div className="flex items-center justify-center py-20 text-slate-500">
                            <RefreshCw className="animate-spin h-6 w-6 mr-3" />
                            Cargando usuarios...
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Lista de usuarios */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Usuarios Actuales</h4>
                                <div className="space-y-3">
                                    {users.map(user => (
                                        <div key={user._id} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
                                                        user.role === 'admin' 
                                                            ? 'bg-gradient-to-br from-violet-600 to-fuchsia-700' 
                                                            : 'bg-gradient-to-br from-blue-600 to-cyan-700'
                                                    }`}>
                                                        {user.fullName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-white">{user.fullName}</p>
                                                        <p className="text-xs text-slate-500">@{user.username} • {user.email}</p>
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                                            user.role === 'admin' 
                                                                ? 'bg-violet-600/20 text-violet-400 border border-violet-500/30' 
                                                                : 'bg-blue-600/20 text-blue-400 border border-blue-500/30'
                                                        }`}>
                                                            {user.role === 'admin' ? '👑 Administrador' : '👤 Vendedor'}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                {/* Botones de acción */}
                                                <div className="flex items-center gap-2">
                                                    {/* Cambiar rol */}
                                                    <button
                                                        onClick={() => handleRoleChange(user._id, user.role, user.fullName)}
                                                        disabled={changingRole === user._id}
                                                        className="p-2 rounded-lg bg-amber-600/20 text-amber-400 border border-amber-500/30 hover:bg-amber-600/40 transition-all disabled:opacity-50"
                                                        title={user.role === 'admin' ? 'Degradar a vendedor' : 'Promover a administrador'}
                                                    >
                                                        {changingRole === user._id ? (
                                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            user.role === 'admin' ? <Users className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                    
                                                    {/* Eliminar usuario */}
                                                    <button
                                                        onClick={() => handleDeleteUser(user._id, user.fullName, user.role)}
                                                        disabled={deletingUser === user._id}
                                                        className="p-2 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/40 transition-all disabled:opacity-50"
                                                        title="Eliminar usuario"
                                                    >
                                                        {deletingUser === user._id ? (
                                                            <RefreshCw className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {/* Cambiar contraseña */}
                                            <div className="mt-4 pt-4 border-t border-slate-700">
                                                <p className="text-xs font-semibold text-slate-400 mb-2">Cambiar Contraseña</p>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="password"
                                                        value={newPasswords[user._id] || ""}
                                                        onChange={(e) => setNewPasswords({ ...newPasswords, [user._id]: e.target.value })}
                                                        placeholder="Nueva contraseña"
                                                        className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                    />
                                                    <button
                                                        onClick={() => handlePasswordChange(user._id)}
                                                        disabled={changingPassword === user._id || !newPasswords[user._id]}
                                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                                    >
                                                        {changingPassword === user._id ? (
                                                            <><RefreshCw className="h-3 w-3 animate-spin" /> Actualizando...</>
                                                        ) : (
                                                            <><Lock className="h-3 w-3" /> Cambiar</>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Botón para crear vendedor */}
                            <div className="border-t border-slate-700 pt-6">
                                <button
                                    onClick={() => setShowCreateSeller(true)}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                                >
                                    <UserPlus className="h-4 w-4" />
                                    Crear Nuevo Vendedor
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal para crear vendedor */}
            {showCreateSeller && (
                <CreateSellerModal
                    companyId={company._id}
                    onClose={() => setShowCreateSeller(false)}
                            onSuccess={handleCreateSeller}
                        />
                    )}
                </div>
            )
        }

// ─── Modal para crear vendedor ─────────────────────────────────────
        function CreateSellerModal({
            companyId,
            onClose,
            onSuccess
        }: {
            companyId: string
            onClose: () => void
            onSuccess: (data: any) => void
        }) {
            const [formData, setFormData] = useState({
                fullName: "",
                username: "",
                email: "",
                password: "",
                confirmPassword: ""
            })
            const [isLoading, setIsLoading] = useState(false)

            const handleSubmit = async (e: React.FormEvent) => {
                e.preventDefault()
                
                if (!formData.fullName || !formData.username || !formData.email || !formData.password) {
                    toast.error("Todos los campos son requeridos")
                    return
                }
                
                if (formData.password !== formData.confirmPassword) {
                    toast.error("Las contraseñas no coinciden")
                    return
                }
                
                if (formData.password.length < 6) {
                    toast.error("La contraseña debe tener al menos 6 caracteres")
                    return
                }

                setIsLoading(true)
                onSuccess(formData)
            }

            return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <div
                        className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6">
                            <h3 className="font-bold text-white text-lg mb-4">Crear Nuevo Vendedor</h3>
                            
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Nombre completo</label>
                                    <input
                                        type="text"
                                        value={formData.fullName}
                                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Juan Pérez"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Usuario</label>
                                    <input
                                        type="text"
                                        value={formData.username}
                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="juanperez"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="vendedor@empresa.com"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Contraseña</label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Mínimo 6 caracteres"
                                        required
                                        minLength={6}
                                    />
                                </div>
                                
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Confirmar contraseña</label>
                                    <input
                                        type="password"
                                        value={formData.confirmPassword}
                                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Repetir contraseña"
                                        required
                                        minLength={6}
                                    />
                                </div>
                                
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? (
                                            <><RefreshCw className="h-4 w-4 animate-spin" /> Creando...</>
                                        ) : (
                                            <><UserPlus className="h-4 w-4" /> Crear Vendedor</>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )
        }
export default function SuperAdminPanel() {
    const [activeTab, setActiveTab] = useState<"companies" | "tickets">("companies")
    const [stats, setStats] = useState<Stats | null>(null)
    const [companies, setCompanies] = useState<CompanyData[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedCompany, setSelectedCompany] = useState<CompanyData | null>(null)
    const [showCreateAdminModal, setShowCreateAdminModal] = useState(false)
    const [selectedCompanyForAdmin, setSelectedCompanyForAdmin] = useState<CompanyData | null>(null)
    const [showEditUsersModal, setShowEditUsersModal] = useState(false)
    const [selectedCompanyForUsers, setSelectedCompanyForUsers] = useState<CompanyData | null>(null)

    useEffect(() => { fetchData() }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/super-administrador/empresas")
            if (res.ok) {
                const data = await res.json()
                setStats(data.stats)
                setCompanies(data.companies)
            } else {
                toast.error("Error al cargar datos")
            }
        } catch {
            toast.error("Error de conexión")
        } finally {
            setLoading(false)
        }
    }

    const changeStatus = async (id: string, status: string) => {
        const res = await fetch(`/api/super-administrador/empresas/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status })
        })
        if (res.ok) {
            toast.success(`Estado actualizado: ${STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label}`)
            fetchData()
        } else {
            toast.error("Error al actualizar estado")
        }
    }

    const changePlan = async (id: string, plan: string) => {
        const res = await fetch(`/api/super-administrador/empresas/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan })
        })
        if (res.ok) {
            toast.success(`Plan actualizado a ${PLAN_CONFIG[plan as keyof typeof PLAN_CONFIG]?.label}`)
            fetchData()
        } else {
            toast.error("Error al cambiar plan")
        }
    }

    const updateBusiness = async (id: string, businessType: string, initCategories = false) => {
        try {
            const res = await fetch(`/api/super-administrador/empresas/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ businessType, initCategories })
            })

            if (res.ok) {
                toast.success(initCategories ? "¡Categorías generadas con éxito!" : "Tipo de negocio actualizado")
                fetchData()
            } else {
                toast.error("Error al actualizar empresa")
            }
        } catch (error) {
            toast.error("Error de conexión")
        }
    }

    const deleteCompany = async (id: string, name: string) => {
        if (!confirm(`¿Seguro que quieres ELIMINAR la empresa "${name}"?\n\nEsta acción es IRREVERSIBLE y borrará todos sus datos.`)) return
        const res = await fetch(`/api/super-administrador/empresas/${id}`, { method: "DELETE" })
        if (res.ok) {
            toast.success("Empresa eliminada")
            fetchData()
        } else {
            toast.error("Error al eliminar")
        }
    }

    const toggleAdminStatus = async (adminId: string, currentStatus: boolean, adminName: string) => {
        const action = currentStatus ? 'desactivar' : 'activar'
        if (!confirm(`¿Seguro que quieres ${action} al administrador "${adminName}"?`)) return
        
        try {
            const res = await fetch(`/api/super-administrador/administradores/${adminId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !currentStatus })
            })
            
            if (res.ok) {
                toast.success(`Administrador ${action}do exitosamente`)
                fetchData()
            } else {
                const error = await res.json()
                toast.error(error.error || "Error al cambiar estado")
            }
        } catch (error) {
            toast.error("Error de conexión")
        }
    }

    const deleteAdmin = async (adminId: string, adminName: string) => {
        if (!confirm(`¿Seguro que quieres ELIMINAR al administrador "${adminName}"?\n\nEsta acción es IRREVERSIBLE.`)) return
        
        try {
            const res = await fetch(`/api/super-administrador/administradores/${adminId}`, { method: "DELETE" })
            
            if (res.ok) {
                toast.success("Administrador eliminado exitosamente")
                fetchData()
            } else {
                const error = await res.json()
                toast.error(error.error || "Error al eliminar")
            }
        } catch (error) {
            toast.error("Error de conexión")
        }
    }

    const openEditUsersModal = (company: CompanyData) => {
        setSelectedCompanyForUsers(company)
        setShowEditUsersModal(true)
    }

    const createAdmin = async (adminData: any) => {
        try {
            const res = await fetch("/api/super-administrador/administradores", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(adminData)
            })
            
            const data = await res.json()
            
            if (res.ok) {
                // Mostrar mensaje específico si se reemplazó un admin
                if (data.replacedAdmin) {
                    toast.success(`✅ ${data.message}\n👤 Anterior: ${data.replacedAdmin.fullName}\n👤 Nuevo: ${data.fullName}`, {
                        duration: 6000
                    })
                } else {
                    // Mostrar credenciales del nuevo admin
                    toast.success(`✅ ${data.message}\n👤 ${data.fullName}\n📧 ${data.email}\n🔑 Usuario: ${data.username}\n📝 Contraseña: la que definiste`, {
                        duration: 8000
                    })
                }
                setShowCreateAdminModal(false)
                setSelectedCompanyForAdmin(null)
                fetchData()
            } else {
                toast.error(data.error || "Error al crear administrador")
            }
        } catch (error) {
            toast.error("Error de conexión")
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20">

            {/* ── Encabezado ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <ShieldCheck className="h-8 w-8 text-violet-400" />
                        Portal Administrativo
                    </h1>
                    <p className="text-slate-400 mt-1 ml-11">Gestión global de la plataforma JHIMS</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-sm transition-colors"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Sincronizar
                    </button>
                    <button
                        onClick={() => setShowCreateAdminModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 border border-violet-500 rounded-xl text-sm transition-colors shadow-lg shadow-violet-900/20"
                    >
                        <UserPlus className="h-4 w-4" />
                        Registrar Admin
                    </button>
                </div>
            </div>

            {/* ── Selector de Pestañas ── */}
            <div className="flex gap-2 p-1.5 bg-slate-900 border border-slate-700/50 rounded-2xl w-fit">
                <button
                    onClick={() => setActiveTab("companies")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        activeTab === "companies" 
                            ? "bg-violet-600 text-white shadow-lg shadow-violet-900/20" 
                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                >
                    <Building2 className="h-4 w-4" />
                    Empresas
                </button>
                <button
                    onClick={() => setActiveTab("tickets")}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        activeTab === "tickets" 
                            ? "bg-violet-600 text-white shadow-lg shadow-violet-900/20" 
                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                >
                    <MessageSquare className="h-4 w-4" />
                    Tickets de Soporte
                </button>
            </div>

            {activeTab === "companies" ? (
                <>
                    {/* ── Tarjetas de estadísticas ── */}
                    {stats && (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { label: "Total Empresas", value: stats.totalCompanies, icon: Building2, from: "from-violet-600", to: "to-fuchsia-700" },
                                { label: "Activas", value: stats.activeCompanies, icon: CheckCircle2, from: "from-emerald-600", to: "to-green-700" },
                                { label: "Pendientes", value: stats.pendingCompanies, icon: Clock, from: "from-amber-600", to: "to-orange-700" },
                                { label: "Usuarios Totales", value: stats.totalUsers, icon: Users, from: "from-blue-600", to: "to-cyan-700" },
                            ].map(stat => {
                                const Icon = stat.icon
                                return (
                                    <div key={stat.label} className={`bg-gradient-to-br ${stat.from} ${stat.to} rounded-2xl p-6 relative overflow-hidden`}>
                                        <div className="absolute -right-5 -bottom-5 opacity-15">
                                            <Icon size={90} />
                                        </div>
                                        <p className="text-white/70 text-sm font-medium">{stat.label}</p>
                                        <p className="text-4xl font-bold text-white mt-2">{stat.value}</p>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* ── Tabla de empresas ── */}
                    <div className="bg-slate-900 rounded-2xl border border-slate-700/50 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                            <h2 className="font-semibold text-white flex items-center gap-2">
                                <Globe className="h-5 w-5 text-violet-400" />
                                Empresas Registradas
                            </h2>
                            <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full border border-slate-700">
                                {companies.length} empresas
                            </span>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-20 text-slate-500">
                                <RefreshCw className="animate-spin h-6 w-6 mr-3" />
                                Cargando datos de la plataforma...
                            </div>
                        ) : companies.length === 0 ? (
                            <div className="text-center py-20 text-slate-500">
                                <Building2 className="h-14 w-14 mx-auto mb-4 opacity-20" />
                                <p className="text-lg">No hay empresas registradas aún</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-slate-700/50 text-slate-400 text-left text-xs uppercase tracking-wider">
                                            <th className="px-6 py-3 font-semibold">Empresa</th>
                                            <th className="px-6 py-3 font-semibold">Administrador</th>
                                            <th className="px-6 py-3 font-semibold">Plan</th>
                                            <th className="px-6 py-3 font-semibold">Estado</th>
                                            <th className="px-6 py-3 font-semibold text-right">Ventas</th>
                                            <th className="px-6 py-3 font-semibold text-right">Ingresos</th>
                                            <th className="px-6 py-3 font-semibold text-center">Gestionar</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/60">
                                        {companies.map(company => {
                                            const statusCfg = STATUS_CONFIG[company.status] || STATUS_CONFIG.pending
                                            const planCfg = PLAN_CONFIG[company.plan] || PLAN_CONFIG.free
                                            return (
                                                <tr key={company._id} className="hover:bg-slate-800/40 transition-colors group">
                                                    {/* Empresa */}
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-700 flex items-center justify-center font-bold text-white shrink-0">
                                                                {company.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-white">{company.name}</p>
                                                                <p className="text-xs text-slate-500">{company.email}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    {/* Admin */}
                                                    <td className="px-6 py-4">
                                                        {company.adminUser ? (
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <p className="text-slate-200 font-medium">{company.adminUser.fullName}</p>
                                                                    <p className="text-xs text-slate-500">@{company.adminUser.username}</p>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    <button
                                                                        onClick={() => company.adminUser && toggleAdminStatus(company.adminUser._id, true, company.adminUser.fullName)}
                                                                        className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/40 transition-all"
                                                                        title="Activar administrador"
                                                                    >
                                                                        <Power className="h-3.5 w-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => company.adminUser && deleteAdmin(company.adminUser._id, company.adminUser.fullName)}
                                                                        className="p-1.5 rounded-lg bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/40 transition-all"
                                                                        title="Eliminar administrador"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-slate-600 text-xs italic">Sin admin asignado</span>
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedCompanyForAdmin(company)
                                                                        setShowCreateAdminModal(true)
                                                                    }}
                                                                    className="p-1.5 rounded-lg bg-violet-600/20 text-violet-400 border border-violet-500/30 hover:bg-violet-600/40 transition-all"
                                                                    title="Crear administrador"
                                                                >
                                                                    <UserPlus className="h-3.5 w-3.5" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                    {/* Plan */}
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${planCfg.badge}`}>
                                                            {planCfg.icon} {planCfg.label}
                                                        </span>
                                                    </td>
                                                    {/* Estado */}
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${statusCfg.bg}`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                                                            {statusCfg.label}
                                                        </span>
                                                    </td>
                                                    {/* Ventas */}
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="text-slate-300 font-medium">{company.salesCount}</span>
                                                        <span className="text-slate-600 text-xs ml-1">vtas</span>
                                                    </td>
                                                    {/* Ingresos */}
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="text-emerald-400 font-semibold">{formatCOP(company.totalRevenue)}</span>
                                                    </td>
                                                    {/* Acción: botones principales */}
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button
                                                                onClick={() => setSelectedCompany(company)}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                                                                    bg-violet-600/20 text-violet-400 border border-violet-500/30
                                                                    hover:bg-violet-600/40 hover:border-violet-400/60 transition-all"
                                                            >
                                                                <Globe className="h-3.5 w-3.5" />
                                                                Gestionar
                                                            </button>
                                                            <button
                                                                onClick={() => openEditUsersModal(company)}
                                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                                                                    bg-blue-600/20 text-blue-400 border border-blue-500/30
                                                                    hover:bg-blue-600/40 hover:border-blue-400/60 transition-all"
                                                            >
                                                                <Users className="h-3.5 w-3.5" />
                                                                Editar Tienda
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <TicketsManager />
            )}

            {/* ── Modal de acciones ── */}
            {selectedCompany && (
                <ActionModal
                    company={selectedCompany}
                    onClose={() => setSelectedCompany(null)}
                    onChangeStatus={changeStatus}
                    onChangePlan={changePlan}
                    onDelete={deleteCompany}
                    onUpdateBusiness={updateBusiness}
                />
            )}

            {/* ── Modal para crear administrador ── */}
            {showCreateAdminModal && (
                <CreateAdminModal
                    companies={companies}
                    onClose={() => {
                        setShowCreateAdminModal(false)
                        setSelectedCompanyForAdmin(null)
                    }}
                    onCreateAdmin={createAdmin}
                />
            )}

            {/* ── Modal para editar usuarios ── */}
            {showEditUsersModal && selectedCompanyForUsers && (
                <EditUsersModal
                    company={selectedCompanyForUsers}
                    onClose={() => {
                        setShowEditUsersModal(false)
                        setSelectedCompanyForUsers(null)
                    }}
                />
            )}
        </div>
    )
}
