"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import Link from "next/link"
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Logo } from "@/components/logo"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Package, ShoppingCart, BarChart3, Users, HelpCircle, Info, Sparkles, DollarSign } from "lucide-react"
import { Suspense } from "react"

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [showSplash, setShowSplash] = useState(true)
  const [showSupportModal, setShowSupportModal] = useState(false)
  const [showAboutModal, setShowAboutModal] = useState(false)
  const [showFeaturesModal, setShowFeaturesModal] = useState(false)
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })

  const [showSessionConflict, setShowSessionConflict] = useState(false)
  const isNewWindowSession = searchParams.get('session') === 'new'

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false)
    }, 4500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (isNewWindowSession) {
      setShowSessionConflict(true)
      // No limpiamos el parámetro de inmediato para mantener el estado del modal si se recarga
    }
  }, [isNewWindowSession])

  const handleResolveConflict = (action: 'admit' | 'reject' | 'takeover') => {
    if (action === 'admit') {
      // Simplemente cerrar el modal y permitir login normal
      setShowSessionConflict(false)
      router.replace('/inicio-sesion')
    } else if (action === 'reject') {
      // Cerrar la ventana o redirigir a una página informativa
      window.location.href = "https://www.google.com" // O cualquier página externa
    } else if (action === 'takeover') {
      // En un sistema real, aquí invalidaríamos otras sesiones. 
      // Por ahora, simplemente procedemos con un login limpio.
      toast.info("Procediendo con sesión exclusiva...")
      setShowSessionConflict(false)
      router.replace('/inicio-sesion')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validación básica
    if (!formData.username.trim() || !formData.password) {
      toast.error("Por favor completa todos los campos")
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch("/api/autenticacion/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          rememberMe
        }),
      })

      // Verificar si la respuesta es OK antes de parsear JSON
      if (!response.ok) {
        // Si la respuesta no es OK, intentar obtener el mensaje de error
        let errorMessage = "Error al iniciar sesión"
        try {
          const errorData = await response.text()
          console.log("Respuesta de error (raw):", errorData)
          // Si es HTML, extraer el mensaje de error
          if (errorData.includes('<!DOCTYPE')) {
            errorMessage = "Error del servidor. Por favor intenta más tarde."
          } else {
            // Intentar parsear como JSON por si acaso
            try {
              const jsonData = JSON.parse(errorData)
              errorMessage = jsonData.error || errorMessage
            } catch {
              // Si no es JSON, usar el texto completo si es corto
              if (errorData.length < 200) {
                errorMessage = errorData
              }
            }
          }
        } catch (parseError) {
          console.error("Error al parsear respuesta de error:", parseError)
        }
        
        throw new Error(errorMessage)
      }

      // Si la respuesta es OK, parsear JSON
      const data = await response.json()

      toast.success(`Bienvenido ${data.user.fullName}`)

      // Redirigir según el rol de forma inmediata para evitar bucles de middleware
      if (data.user.role === "superadmin") {
        window.location.href = "/super-administrador"
      } else {
        window.location.href = "/dashboard"
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error((error as any).message || "Error de conexión. Intenta de nuevo")
    } finally {
      setIsLoading(false)
    }
  }

  // Renderizar Splash Screen
  if (showSplash) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#020617] transition-colors duration-1000"> {/* Fondo oscuro premium */}
        <div className="flex flex-col items-center animate-in fade-in duration-1000">
          <Logo size="xl" variant="full" className="h-auto w-auto drop-shadow-2xl" animated={true} />
        </div>
      </div>
    )
  }

  // Renderizar Login (sin animación en el logo)
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-[#020617] to-[#0f172a] animate-in fade-in duration-700">
      {/* Panel izquierdo con diseño mejorado */}
      <div className="w-full flex items-center justify-center p-8">
        <Card className="w-full max-w-md shadow-2xl border-white/5 bg-slate-900/50 backdrop-blur-xl">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-6">
              <div className="p-3 bg-transparent rounded-2xl">
                <Logo size="small" className="h-14 w-auto drop-shadow-md" animated={false} iconOnly={true} />
              </div>
            </div>
            <CardTitle className="text-3xl font-black text-center text-white italic tracking-tighter">
              INICIAR SESIÓN
            </CardTitle>
            <CardDescription className="text-center text-slate-400 font-medium">
              Accede al sistema de gestión JHIMS
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#0f172a] px-2 text-slate-500 font-semibold tracking-wider">Credenciales de acceso</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-300">Usuario o correo</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="usuario@ejemplo.com"
                    className="pl-10 bg-slate-950/50 border-white/5 text-white placeholder:text-slate-500 focus:ring-cyan-500/20"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    disabled={isLoading}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-300">Contraseña</Label>
                  <Link
                    href="/olvide-contrasena"
                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                    tabIndex={-1}
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10 bg-slate-950/50 border-white/5 text-white placeholder:text-slate-500 focus:ring-cyan-500/20"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(!!checked)}
                    disabled={isLoading}
                    className="border-white/20 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                  />
                  <Label htmlFor="remember" className="text-sm font-medium text-slate-400 cursor-pointer">
                    Recordar sesión
                  </Label>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold shadow-xl shadow-cyan-900/20 border-none transition-all duration-300 transform active:scale-[0.98]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    INICIANDO...
                  </>
                ) : 'INGRESAR AL SISTEMA'}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4 pt-4 border-t border-white/5">
            <div className="text-center text-xs text-slate-500">
              Al continuar, aceptas nuestros{' '}
              <Link href="/terminos" className="text-slate-400 hover:text-white transition-colors underline-offset-4 hover:underline">Términos de servicio</Link>
              {' '}y{' '}
              <Link href="/privacidad" className="text-slate-400 hover:text-white transition-colors underline-offset-4 hover:underline">Política de privacidad</Link>.
            </div>
            <div className="flex flex-col items-center gap-2 pt-2">
              <Link
                href="/contacto"
                className="text-xs text-cyan-500 hover:text-cyan-400 font-semibold transition-colors flex items-center gap-1 group"
              >
                <HelpCircle className="h-3 w-3 transition-transform group-hover:scale-110" />
                ¿Necesitas ayuda? Contáctanos
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Modal de Protección de Sesión (Escudo) */}
      <Dialog open={showSessionConflict} onOpenChange={setShowSessionConflict}>
        <DialogContent className="sm:max-w-[450px] border-amber-200 bg-amber-50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-800">
              <Info className="h-5 w-5" /> Escudo de Seguridad JHIMS
            </DialogTitle>
            <DialogDescription className="text-amber-900 font-medium">
              Se ha detectado que intentas abrir el sistema en una nueva ventana. Por seguridad, debes elegir cómo proceder para evitar conflictos de datos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            <Button 
              variant="outline" 
              className="justify-start h-auto p-4 border-amber-300 hover:bg-amber-100 text-left"
              onClick={() => handleResolveConflict('admit')}
            >
              <div>
                <p className="font-bold text-amber-900">Mantener ambas ventanas</p>
                <p className="text-xs text-amber-700">Permite usar el sistema en ambas pestañas (Uso bajo tu responsabilidad).</p>
              </div>
            </Button>
            <Button 
              variant="outline"
              className="justify-start h-auto p-4 border-amber-300 hover:bg-amber-100 text-left"
              onClick={() => handleResolveConflict('takeover')}
            >
              <div>
                <p className="font-bold text-amber-900">Usar solo esta ventana (Recomendado)</p>
                <p className="text-xs text-amber-700">Inicia sesión aquí y considera cerrar la ventana anterior.</p>
              </div>
            </Button>
            <Button 
              variant="destructive"
              className="justify-start h-auto p-4 text-left"
              onClick={() => handleResolveConflict('reject')}
            >
              <div>
                <p className="font-bold">No permitir acceso</p>
                <p className="text-xs opacity-90">Cierra esta ventana y regresa a la sesión activa original.</p>
              </div>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <Dialog open={showSupportModal} onOpenChange={setShowSupportModal}>
        {/* ... content ... */}
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Soporte Técnico</DialogTitle>
            <DialogDescription>
              Estamos aquí para ayudarte con cualquier problema o duda que tengas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/50 rounded-lg space-y-3 border border-border">
              <h4 className="font-bold text-lg flex items-center gap-2 text-foreground">
                <Mail className="h-5 w-5 text-primary" /> Contacto Directo
              </h4>
              <p className="text-base text-foreground font-medium">
                Envíanos un correo a: <a href="mailto:soporte@jhims.com" className="text-primary hover:underline font-bold">soporte@jhims.com</a>
              </p>
              <p className="text-base text-foreground font-medium">
                Llámanos al: <span className="text-foreground font-bold">+1 (234) 567-890</span>
              </p>
            </div>
            <div className="text-sm font-medium text-foreground/80 bg-blue-50 p-3 rounded-md text-blue-900 border border-blue-100">
              <p>🕒 Horario de atención: Lunes a Viernes, 9:00 AM - 6:00 PM</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAboutModal} onOpenChange={setShowAboutModal}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Acerca de JHIMS</DialogTitle>
            <DialogDescription>
              Sistema de Gestión de Inventario y Ventas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <p className="text-base text-foreground leading-relaxed">
              <span className="font-bold text-primary">JHIMS</span> (Inventory Management System) es una plataforma integral diseñada para optimizar la gestión de
              inventarios y ventas en tiendas y negocios locales.
            </p>
            <p className="text-base text-foreground leading-relaxed">
              Nuestro sistema proporciona herramientas modernas y fáciles de usar que permiten a los comerciantes
              llevar un control preciso de sus productos, registrar ventas de manera eficiente y generar reportes
              detallados para tomar mejores decisiones de negocio.
            </p>
            <div className="pt-4 border-t">
              <p className="font-bold text-lg text-foreground mb-3">Beneficios Clave</p>
              <ul className="space-y-3 text-base text-foreground">
                <li className="flex items-center gap-2"><span className="text-green-600 font-bold">✓</span> Reduce errores en el control de inventario</li>
                <li className="flex items-center gap-2"><span className="text-green-600 font-bold">✓</span> Agiliza el proceso de ventas</li>
                <li className="flex items-center gap-2"><span className="text-green-600 font-bold">✓</span> Genera reportes automáticos y precisos</li>
                <li className="flex items-center gap-2"><span className="text-green-600 font-bold">✓</span> Mejora la toma de decisiones con datos en tiempo real</li>
                <li className="flex items-center gap-2"><span className="text-green-600 font-bold">✓</span> Interfaz intuitiva y fácil de aprender</li>
                <li className="flex items-center gap-2"><span className="text-green-600 font-bold">✓</span> Acceso desde cualquier dispositivo</li>
              </ul>
            </div>
            <div className="pt-4 border-t text-center text-xs text-muted-foreground">
              <p>© 2025 JHIMS. Todos los derechos reservados.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showFeaturesModal} onOpenChange={setShowFeaturesModal}>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Características Principales</DialogTitle>
            <DialogDescription>
              Herramientas esenciales para la gestión eficiente de tu negocio
            </DialogDescription>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-4 py-4">
            <div className="p-5 border border-border/60 rounded-xl space-y-3 bg-card hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 font-bold text-lg text-foreground">
                <Package className="h-6 w-6 text-primary" />
                Gestión de Inventario
              </div>
              <ul className="text-base space-y-2 text-foreground/90 pl-7 list-disc marker:text-primary">
                <li>Registro y categorización</li>
                <li>Control en tiempo real</li>
                <li>Alertas automáticas</li>
                <li>Historial completo</li>
              </ul>
            </div>

            <div className="p-5 border border-border/60 rounded-xl space-y-3 bg-card hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 font-bold text-lg text-foreground">
                <ShoppingCart className="h-6 w-6 text-primary" />
                Control de Ventas
              </div>
              <ul className="text-base space-y-2 text-foreground/90 pl-7 list-disc marker:text-primary">
                <li>Ventas rápidas y eficientes</li>
                <li>Facturación profesional</li>
                <li>Control de caja</li>
                <li>Sincronización automática</li>
              </ul>
            </div>

            <div className="p-5 border border-border/60 rounded-xl space-y-3 bg-card hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 font-bold text-lg text-foreground">
                <BarChart3 className="h-6 w-6 text-primary" />
                Reportes y Análisis
              </div>
              <ul className="text-base space-y-2 text-foreground/90 pl-7 list-disc marker:text-primary">
                <li>Reportes personalizables</li>
                <li>Análisis de rendimiento</li>
                <li>Indicadores clave</li>
                <li>Exportación en PDF/Excel</li>
              </ul>
            </div>

            <div className="p-5 border border-border/60 rounded-xl space-y-3 bg-card hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 font-bold text-lg text-foreground">
                <Users className="h-6 w-6 text-primary" />
                Gestión de Usuarios
              </div>
              <ul className="text-base space-y-2 text-foreground/90 pl-7 list-disc marker:text-primary">
                <li>Autenticación segura</li>
                <li>Roles personalizados</li>
                <li>Log de actividades</li>
                <li>Permisos granulares</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}