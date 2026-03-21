"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeft, Loader2, Lock, Mail, ShieldCheck, KeyRound, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

type Step = "request" | "verify" | "reset" | "success"

export default function ForgotPasswordPage() {
    const router = useRouter()
    const [step, setStep] = useState<Step>("request")
    const [isLoading, setIsLoading] = useState(false)
    const [email, setEmail] = useState("")
    const [code, setCode] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [resetToken, setResetToken] = useState("")
    const [emailSent, setEmailSent] = useState(false)
    const [maskedEmail, setMaskedEmail] = useState("")

    // Paso 1: Solicitar código de recuperación
    const handleRequestCode = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!email.trim()) {
            toast.error("Por favor ingresa tu correo o nombre de usuario")
            return
        }

        setIsLoading(true)
        try {
            const res = await fetch("/api/autenticacion/recuperar-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "request", identifier: email.trim() }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Error al solicitar recuperación")
            }

            if (data.resetToken) {
                setResetToken(data.resetToken)
            }

            setEmailSent(!!data.emailSent)
            if (data.message && data.emailSent) {
                // Extraer el correo enmascarado del mensaje (e.g. "Código enviado a j***n@gmail.com")
                const match = data.message.match(/([\w*]+@[\w.]+)/)
                if (match) setMaskedEmail(match[1])
            }

            toast.success(data.message || "Código de verificación enviado")
            setStep("verify")
        } catch (error: any) {
            toast.error(error.message || "Error de conexión")
        } finally {
            setIsLoading(false)
        }
    }

    // Paso 2: Verificar código
    const handleVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!code.trim()) {
            toast.error("Por favor ingresa el código de verificación")
            return
        }

        setIsLoading(true)
        try {
            const res = await fetch("/api/autenticacion/recuperar-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "verify",
                    identifier: email.trim(),
                    code: code.trim(),
                    resetToken,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Código inválido")
            }

            if (data.resetToken) {
                setResetToken(data.resetToken)
            }

            toast.success("Código verificado correctamente")
            setStep("reset")
        } catch (error: any) {
            toast.error(error.message || "Error de conexión")
        } finally {
            setIsLoading(false)
        }
    }

    // Paso 3: Establecer nueva contraseña
    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!newPassword || !confirmPassword) {
            toast.error("Por favor completa ambos campos")
            return
        }

        if (newPassword.length < 8) {
            toast.error("La contraseña debe tener al menos 8 caracteres")
            return
        }

        if (newPassword !== confirmPassword) {
            toast.error("Las contraseñas no coinciden")
            return
        }

        setIsLoading(true)
        try {
            const res = await fetch("/api/autenticacion/recuperar-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "reset",
                    identifier: email.trim(),
                    newPassword,
                    resetToken,
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || "Error al actualizar contraseña")
            }

            toast.success("¡Contraseña actualizada exitosamente!")
            setStep("success")
        } catch (error: any) {
            toast.error(error.message || "Error de conexión")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
            <Card className="w-full max-w-md shadow-xl border-border/50 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* ── PASO 1: Solicitar recuperación ── */}
                {step === "request" && (
                    <>
                        <CardHeader className="space-y-1">
                            <div className="flex justify-center mb-2">
                                <div className="p-3 rounded-full bg-primary/10">
                                    <KeyRound className="h-6 w-6 text-primary" />
                                </div>
                            </div>
                            <CardTitle className="text-2xl font-bold text-center">
                                Recuperar Contraseña
                            </CardTitle>
                            <CardDescription className="text-center">
                                Ingresa tu correo electrónico o nombre de usuario para recuperar tu cuenta.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleRequestCode} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Correo o Usuario</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="text"
                                            placeholder="tu@correo.com o tu_usuario"
                                            className="pl-10"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            disabled={isLoading}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <Button type="submit" className="w-full h-11" disabled={isLoading}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Enviando...
                                        </>
                                    ) : (
                                        "Enviar código de verificación"
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </>
                )}

                {/* ── PASO 2: Verificar código ── */}
                {step === "verify" && (
                    <>
                        <CardHeader className="space-y-1">
                            <div className="flex justify-center mb-2">
                                <div className="p-3 rounded-full bg-amber-500/10">
                                    <ShieldCheck className="h-6 w-6 text-amber-500" />
                                </div>
                            </div>
                            <CardTitle className="text-2xl font-bold text-center">
                                Verificar Código
                            </CardTitle>
                            <CardDescription className="text-center">
                                {emailSent ? (
                                    <>
                                        Hemos enviado un código de 6 dígitos a <br />
                                        <span className="font-semibold text-primary">{maskedEmail}</span>
                                        <br />
                                        <span className="text-xs text-muted-foreground">
                                            Revisa tu bandeja de entrada y la carpeta de spam.
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        Ingresa el código de verificación. <br />
                                        <span className="text-xs text-muted-foreground">
                                            Solicita el código al administrador del sistema.
                                        </span>
                                    </>
                                )}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleVerifyCode} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="code">Código de verificación</Label>
                                    <Input
                                        id="code"
                                        type="text"
                                        placeholder="Ingresa el código de 6 dígitos"
                                        className="text-center text-lg tracking-widest font-mono"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                                        required
                                        disabled={isLoading}
                                        autoFocus
                                        maxLength={6}
                                    />
                                </div>
                                <Button type="submit" className="w-full h-11" disabled={isLoading || code.length < 6}>
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Verificando...
                                        </>
                                    ) : (
                                        "Verificar código"
                                    )}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="w-full text-sm"
                                    onClick={() => setStep("request")}
                                    disabled={isLoading}
                                >
                                    ← Volver a solicitar código
                                </Button>
                            </form>
                        </CardContent>
                    </>
                )}

                {/* ── PASO 3: Nueva contraseña ── */}
                {step === "reset" && (
                    <>
                        <CardHeader className="space-y-1">
                            <div className="flex justify-center mb-2">
                                <div className="p-3 rounded-full bg-emerald-500/10">
                                    <Lock className="h-6 w-6 text-emerald-500" />
                                </div>
                            </div>
                            <CardTitle className="text-2xl font-bold text-center">
                                Nueva Contraseña
                            </CardTitle>
                            <CardDescription className="text-center">
                                Establece una nueva contraseña segura para tu cuenta.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="new-password">Nueva contraseña</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            id="new-password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Mínimo 8 caracteres"
                                            className="pl-10"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            required
                                            disabled={isLoading}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirm-password">Confirmar contraseña</Label>
                                    <div className="relative">
                                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            id="confirm-password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Repite tu nueva contraseña"
                                            className="pl-10"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            required
                                            disabled={isLoading}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="show-pw"
                                        checked={showPassword}
                                        onChange={(e) => setShowPassword(e.target.checked)}
                                        className="rounded"
                                    />
                                    <Label htmlFor="show-pw" className="text-sm font-normal cursor-pointer">
                                        Mostrar contraseñas
                                    </Label>
                                </div>

                                {newPassword && newPassword.length < 8 && (
                                    <p className="text-xs text-amber-600 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        La contraseña debe tener al menos 8 caracteres
                                    </p>
                                )}

                                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                                    <p className="text-xs text-destructive flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        Las contraseñas no coinciden
                                    </p>
                                )}

                                <Button
                                    type="submit"
                                    className="w-full h-11"
                                    disabled={isLoading || newPassword.length < 8 || newPassword !== confirmPassword}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Actualizando...
                                        </>
                                    ) : (
                                        "Actualizar contraseña"
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </>
                )}

                {/* ── PASO 4: Éxito ── */}
                {step === "success" && (
                    <>
                        <CardHeader className="space-y-1">
                            <div className="flex justify-center mb-2">
                                <div className="p-3 rounded-full bg-emerald-500/10">
                                    <ShieldCheck className="h-6 w-6 text-emerald-500" />
                                </div>
                            </div>
                            <CardTitle className="text-2xl font-bold text-center text-emerald-600">
                                ¡Contraseña Actualizada!
                            </CardTitle>
                            <CardDescription className="text-center">
                                Tu contraseña ha sido cambiada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button
                                className="w-full h-11"
                                onClick={() => router.push("/inicio-sesion")}
                            >
                                Ir a Iniciar Sesión
                            </Button>
                        </CardContent>
                    </>
                )}

                <CardFooter className="justify-center pt-0">
                    <Link
                        href="/inicio-sesion"
                        className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Volver al inicio de sesión
                    </Link>
                </CardFooter>
            </Card>
        </div>
    )
}
