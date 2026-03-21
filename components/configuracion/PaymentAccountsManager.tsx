"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { CreditCard, Plus, Edit, Trash2, Star } from "lucide-react"

interface PaymentAccount {
    _id: string
    name: string
    type: "cash" | "nequi" | "bank" | "card" | "transfer"
    accountNumber?: string
    phoneNumber?: string
    cardLastDigits?: string
    bankName?: string
    accountType?: "savings" | "checking"
    isActive: boolean
    isDefault: boolean
    notes?: string
}

const PAYMENT_TYPES = [
    { value: "cash", label: "Efectivo" },
    { value: "nequi", label: "Nequi" },
    { value: "bank", label: "Cuenta Bancaria" },
    { value: "card", label: "Tarjeta" },
    { value: "transfer", label: "Transferencia" }
]

const BANKS = [
    "Bancolombia",
    "Davivienda",
    "Banco de Bogotá",
    "BBVA",
    "Banco Popular",
    "Banco de Occidente",
    "Banco AV Villas",
    "Banco Caja Social",
    "Colpatria",
    "Itaú",
    "Scotiabank Colpatria",
    "Otro"
]

export default function PaymentAccountsManager() {
    const [accounts, setAccounts] = useState<PaymentAccount[]>([])
    const [loading, setLoading] = useState(true)
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingAccount, setEditingAccount] = useState<PaymentAccount | null>(null)
    const [formData, setFormData] = useState<{
        name: string
        type: "cash" | "nequi" | "bank" | "card" | "transfer"
        accountNumber: string
        phoneNumber: string
        cardLastDigits: string
        bankName: string
        accountType: "savings" | "checking"
        isDefault: boolean
        notes: string
    }>({
        name: "",
        type: "cash",
        accountNumber: "",
        phoneNumber: "",
        cardLastDigits: "",
        bankName: "",
        accountType: "savings",
        isDefault: false,
        notes: ""
    })

    useEffect(() => {
        fetchAccounts()
    }, [])

    const fetchAccounts = async () => {
        try {
            const res = await fetch("/api/empresa/payment-accounts")
            if (res.ok) {
                const data = await res.json()
                setAccounts(data.accounts || [])
            }
        } catch (error) {
            console.error("Error loading accounts:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validaciones específicas por tipo
        if (formData.type === "nequi" && !formData.phoneNumber) {
            return toast.error("Número de teléfono es requerido para Nequi")
        }
        if (formData.type === "bank" && (!formData.accountNumber || !formData.bankName)) {
            return toast.error("Número de cuenta y banco son requeridos")
        }
        if (formData.type === "card" && !formData.cardLastDigits) {
            return toast.error("Últimos 4 dígitos son requeridos para tarjetas")
        }

        try {
            const url = editingAccount
                ? `/api/empresa/payment-accounts/${editingAccount._id}`
                : "/api/empresa/payment-accounts"
            const method = editingAccount ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                toast.success(editingAccount ? "Cuenta actualizada" : "Cuenta creada")
                setDialogOpen(false)
                resetForm()
                fetchAccounts()
            } else {
                const error = await res.json()
                toast.error(error.error || "Error al guardar cuenta")
            }
        } catch (error) {
            toast.error("Error al guardar cuenta")
        }
    }

    const handleEdit = (account: PaymentAccount) => {
        setEditingAccount(account)
        setFormData({
            name: account.name,
            type: account.type,
            accountNumber: account.accountNumber || "",
            phoneNumber: account.phoneNumber || "",
            cardLastDigits: account.cardLastDigits || "",
            bankName: account.bankName || "",
            accountType: account.accountType || "savings",
            isDefault: account.isDefault,
            notes: account.notes || ""
        })
        setDialogOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de desactivar esta cuenta?")) return

        try {
            const res = await fetch(`/api/empresa/payment-accounts/${id}`, {
                method: "DELETE"
            })

            if (res.ok) {
                toast.success("Cuenta desactivada")
                fetchAccounts()
            } else {
                const error = await res.json()
                toast.error(error.error || "Error al desactivar cuenta")
            }
        } catch (error) {
            toast.error("Error al desactivar cuenta")
        }
    }

    const resetForm = () => {
        setFormData({
            name: "",
            type: "cash",
            accountNumber: "",
            phoneNumber: "",
            cardLastDigits: "",
            bankName: "",
            accountType: "savings",
            isDefault: false,
            notes: ""
        })
        setEditingAccount(null)
    }

    const getAccountsByType = (type: string) => {
        return accounts.filter(acc => acc.type === type && acc.isActive)
    }

    const renderAccountDetails = (account: PaymentAccount) => {
        switch (account.type) {
            case "nequi":
                return <span className="text-sm text-muted-foreground">{account.phoneNumber}</span>
            case "bank":
                return (
                    <span className="text-sm text-muted-foreground">
                        {account.bankName} - {account.accountType === "savings" ? "Ahorros" : "Corriente"} - {account.accountNumber}
                    </span>
                )
            case "card":
                return <span className="text-sm text-muted-foreground">**** {account.cardLastDigits}</span>
            default:
                return null
        }
    }

    if (loading) {
        return <div>Cargando...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold">Métodos de Pago</h3>
                    <p className="text-sm text-muted-foreground">
                        Configura las cuentas bancarias, Nequi y otros métodos de pago de tu empresa
                    </p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button onClick={resetForm}>
                            <Plus className="mr-2 h-4 w-4" />
                            Agregar Cuenta
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{editingAccount ? "Editar Cuenta" : "Nueva Cuenta de Pago"}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Tipo de Cuenta *</Label>
                                    <Select
                                        value={formData.type}
                                        onValueChange={(value: any) => setFormData({ ...formData, type: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PAYMENT_TYPES.map(type => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Nombre de la Cuenta *</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="Ej: Nequi Principal"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Campos específicos por tipo */}
                            {formData.type === "nequi" && (
                                <div>
                                    <Label>Número de Teléfono *</Label>
                                    <Input
                                        value={formData.phoneNumber}
                                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                        placeholder="3001234567"
                                        maxLength={10}
                                    />
                                </div>
                            )}

                            {formData.type === "bank" && (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Banco *</Label>
                                            <Select
                                                value={formData.bankName}
                                                onValueChange={(value) => setFormData({ ...formData, bankName: value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar banco" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {BANKS.map(bank => (
                                                        <SelectItem key={bank} value={bank}>{bank}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>Tipo de Cuenta *</Label>
                                            <Select
                                                value={formData.accountType}
                                                onValueChange={(value: any) => setFormData({ ...formData, accountType: value })}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="savings">Ahorros</SelectItem>
                                                    <SelectItem value="checking">Corriente</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Número de Cuenta *</Label>
                                        <Input
                                            value={formData.accountNumber}
                                            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                                            placeholder="1234567890"
                                        />
                                    </div>
                                </>
                            )}

                            {formData.type === "card" && (
                                <div>
                                    <Label>Últimos 4 Dígitos *</Label>
                                    <Input
                                        value={formData.cardLastDigits}
                                        onChange={(e) => setFormData({ ...formData, cardLastDigits: e.target.value })}
                                        placeholder="1234"
                                        maxLength={4}
                                    />
                                </div>
                            )}

                            <div>
                                <Label>Notas (Opcional)</Label>
                                <Input
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Información adicional"
                                />
                            </div>

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id="isDefault"
                                    checked={formData.isDefault}
                                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                                    className="rounded"
                                />
                                <Label htmlFor="isDefault" className="cursor-pointer">
                                    Marcar como cuenta predeterminada para este tipo
                                </Label>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button type="submit">
                                    {editingAccount ? "Actualizar" : "Crear"} Cuenta
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Lista de cuentas por tipo */}
            <div className="space-y-4">
                {PAYMENT_TYPES.map(type => {
                    const typeAccounts = getAccountsByType(type.value)
                    if (typeAccounts.length === 0) return null

                    return (
                        <Card key={type.value}>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <CreditCard className="h-4 w-4" />
                                    {type.label}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {typeAccounts.map(account => (
                                        <div
                                            key={account._id}
                                            className="flex items-center justify-between p-3 border rounded-lg"
                                        >
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{account.name}</span>
                                                    {account.isDefault && (
                                                        <Badge variant="default" className="text-xs">
                                                            <Star className="h-3 w-3 mr-1" />
                                                            Predeterminada
                                                        </Badge>
                                                    )}
                                                </div>
                                                {renderAccountDetails(account)}
                                            </div>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(account)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(account._id)}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-600" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}

                {accounts.filter(a => a.isActive).length === 0 && (
                    <Card>
                        <CardContent className="py-8 text-center text-muted-foreground">
                            <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No hay cuentas de pago configuradas</p>
                            <p className="text-sm">Agrega tu primera cuenta para comenzar</p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    )
}
