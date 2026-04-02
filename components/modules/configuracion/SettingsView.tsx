"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Save, Store, User, Bell, Palette, Loader2, Timer, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { saveInactivityTimeout, getInactivityTimeout } from "@/hooks/useInactivityLogout"

import { useTheme } from "next-themes"

export default function SettingsView() {
    const { theme, setTheme } = useTheme()
    const [user, setUser] = useState<any>(null)
    // ... rest of state
    const [company, setCompany] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [inactivityMinutes, setInactivityMinutes] = useState<number>(30)

    useEffect(() => {
        fetchSettings()
        // Leer la preferencia guardada en localStorage
        setInactivityMinutes(getInactivityTimeout())
    }, [])

    const handleSaveInactivity = (minutes: number) => {
        setInactivityMinutes(minutes)
        saveInactivityTimeout(minutes)
        if (minutes === 0) {
            toast.success("Cierre por inactividad desactivado")
        } else {
            toast.success(`Sesión se cerrará tras ${minutes} minuto${minutes === 1 ? "" : "s"} de inactividad`)
        }
    }

    const fetchSettings = async () => {
        try {
            const [userRes, compRes] = await Promise.all([
                fetch('/api/usuarios/profile'),
                fetch('/api/empresa/profile')
            ])

            if (userRes.ok) {
                setUser(await userRes.json())
            } else {
                const err = await userRes.json()
                toast.error(`Error de usuario: ${err.error || userRes.statusText}`)
            }

            if (compRes.ok) {
                setCompany(await compRes.json())
            } else {
                const err = await compRes.json()
                toast.error(`Error de empresa: ${err.error || compRes.statusText}`)
            }
        } catch (error) {
            toast.error("Error de conexión al servidor")
        } finally {
            setLoading(false)
        }
    }

    const handleUpdateUser = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/usuarios/profile', {
                method: 'PUT',
                body: JSON.stringify(user)
            })
            if (res.ok) {
                toast.success("Perfil actualizado")
                fetchSettings()
            }
        } catch (error) {
            toast.error("Error de conexión")
        } finally {
            setSaving(false)
        }
    }

    const handleUpdateCompany = async () => {
        setSaving(true)
        try {
            const res = await fetch('/api/empresa/profile', {
                method: 'PUT',
                body: JSON.stringify(company)
            })
            if (res.ok) {
                toast.success("Datos de empresa actualizados")
                fetchSettings()
            } else {
                const err = await res.json()
                toast.error(`Fallo al guardar: ${err.error || res.statusText}`)
            }
        } catch (error) {
            toast.error("Error de conexión")
        } finally {
            setSaving(false)
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center h-[400px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Cargando preferencias...</span>
        </div>
    )

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
                <p className="text-muted-foreground">Administra las preferencias del sistema y tu cuenta.</p>
            </div>
            <Separator />
            <Tabs defaultValue="profile" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="profile">Perfil</TabsTrigger>
                    <TabsTrigger value="store">Empresa</TabsTrigger>
                    <TabsTrigger value="preferences">Sistema</TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <User className="h-5 w-5 text-primary" />
                                Información Personal
                            </CardTitle>
                            <CardDescription>Actualiza tus datos de usuario.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nombre Completo</Label>
                                    <Input
                                        value={user?.fullName || ""}
                                        onChange={(e) => setUser({ ...user, fullName: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Correo Electrónico</Label>
                                    <Input
                                        value={user?.email || ""}
                                        onChange={(e) => setUser({ ...user, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Teléfono</Label>
                                    <Input
                                        value={user?.phone || ""}
                                        onChange={(e) => setUser({ ...user, phone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <Button onClick={handleUpdateUser} disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Guardar Perfil
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="store">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Store className="h-5 w-5 text-primary" />
                                Datos del Negocio
                            </CardTitle>
                            <CardDescription>Información que aparecerá en facturas y reportes.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Nombre de la Empresa</Label>
                                <Input
                                    value={company?.name || ""}
                                    onChange={(e) => setCompany({ ...company, name: e.target.value })}
                                />
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>NIT / RUT</Label>
                                    <Input
                                        value={company?.taxId || ""}
                                        onChange={(e) => setCompany({ ...company, taxId: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Dirección</Label>
                                    <Input
                                        value={company?.address || ""}
                                        onChange={(e) => setCompany({ ...company, address: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Teléfono de Contacto</Label>
                                    <Input
                                        value={company?.phone || ""}
                                        onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                                        placeholder="Ej: +57 300 123 4567"
                                    />
                                </div>
                                <div className="col-span-full space-y-2">
                                    <Label>Mensaje al Pie de la Factura</Label>
                                    <Input
                                        value={company?.footerText || ""}
                                        onChange={(e) => setCompany({ ...company, footerText: e.target.value })}
                                        placeholder="Ej: ¡Gracias por su compra! Vuelva pronto."
                                    />
                                    <p className="text-[10px] text-muted-foreground italic">Este texto aparecerá al final de todos tus recibos impresos.</p>
                                </div>
                                <Separator className="col-span-full my-4" />
                                <div className="col-span-full space-y-4">
                                    <div className="flex flex-col">
                                        <Label className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2 mb-2">
                                            <ShieldCheck size={18} /> Métodos de Pago Alternativos (Costo $0)
                                        </Label>
                                        <p className="text-xs text-muted-foreground mb-4">Configura aquí los datos para que tus clientes te paguen por transferencia (Nequi, Daviplata, Bancolombia) sin pagar comisiones a pasarelas.</p>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Instrucciones de Pago (Texto)</Label>
                                            <Input
                                                value={company?.paymentInfo || ""}
                                                onChange={(e) => setCompany({ ...company, paymentInfo: e.target.value })}
                                                placeholder="Ej: Nequi: 300 123 4567 - Bancolombia: Ahorros 123..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>URL Imagen Código QR</Label>
                                            <Input
                                                value={company?.paymentQR || ""}
                                                onChange={(e) => setCompany({ ...company, paymentQR: e.target.value })}
                                                placeholder="Pega aquí el link de tu imagen de QR"
                                            />
                                            <p className="text-[10px] text-muted-foreground">Sube tu QR a un servicio de imágenes y pega el enlace aquí para mostrarlo en el POS.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <Button onClick={handleUpdateCompany} disabled={saving}>
                                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Actualizar Empresa
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="preferences">
                    <div className="space-y-4">

                        {/* Tarjeta: Cierre por Inactividad */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Timer className="h-5 w-5 text-primary" />
                                    Cierre de Sesión por Inactividad
                                </CardTitle>
                                <CardDescription>
                                    Elige cuánto tiempo sin actividad para cerrar sesión automáticamente.
                                    Útil para proteger el sistema si olvidas cerrar sesión.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[
                                        { label: "Desactivado", value: 0, desc: "Nunca cerrar" },
                                        { label: "15 minutos", value: 15, desc: "Recomendado caja" },
                                        { label: "30 minutos", value: 30, desc: "Por defecto" },
                                        { label: "1 hora", value: 60, desc: "Uso moderado" },
                                        { label: "2 horas", value: 120, desc: "Uso prolongado" },
                                        { label: "4 horas", value: 240, desc: "Turno completo" },
                                        { label: "8 horas", value: 480, desc: "Jornada laboral" },
                                        { label: "7 días", value: 10080, desc: "Sin restricción" },
                                    ].map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => handleSaveInactivity(opt.value)}
                                            className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all
                                                ${inactivityMinutes === opt.value
                                                    ? "border-primary bg-primary/10 text-primary"
                                                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                                                }`}
                                        >
                                            <span className="font-semibold text-sm">{opt.label}</span>
                                            <span className="text-xs text-muted-foreground mt-0.5">{opt.desc}</span>
                                        </button>
                                    ))}
                                </div>
                                {inactivityMinutes > 0 && (
                                    <p className="text-sm text-muted-foreground mt-3 flex items-center gap-1.5">
                                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                                        La sesión se cerrará tras <strong>{inactivityMinutes} minuto{inactivityMinutes === 1 ? "" : "s"}</strong> sin actividad.
                                        Se mostrará un aviso 1 minuto antes.
                                    </p>
                                )}
                                {inactivityMinutes === 0 && (
                                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-3">
                                        ⚠️ El cierre automático está desactivado. Recuerda cerrar sesión manualmente.
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Tarjeta: otras preferencias del sistema */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Palette className="h-5 w-5 text-primary" />
                                    Preferencias Generales
                                </CardTitle>
                                <CardDescription>Personaliza la experiencia de uso.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Modo Oscuro</Label>
                                        <p className="text-sm text-muted-foreground">Cambiar entre tema claro y oscuro</p>
                                    </div>
                                    <Switch 
                                        checked={theme === 'dark'}
                                        onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                                    />
                                </div>
                                <div className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <Label className="text-base">Notificaciones por Correo</Label>
                                        <p className="text-sm text-muted-foreground">Recibir alertas de stock bajo</p>
                                    </div>
                                    <Switch defaultChecked />
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
