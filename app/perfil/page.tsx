"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, Mail, Shield, Calendar, Edit2, Save, X, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import type { SessionUser } from "@/lib/auth"

export default function PerfilPage() {
  const router = useRouter()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    fullName: "",
    email: ""
  })

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    try {
      const response = await fetch("/api/autenticacion/me")
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setFormData({
          fullName: data.user.fullName || "",
          email: data.user.email || ""
        })
      }
    } catch (error) {
      console.error("Error al obtener perfil:", error)
      toast.error("Error al cargar el perfil")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      const response = await fetch("/api/usuarios/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success("Perfil actualizado correctamente")
        setEditing(false)
        fetchUserProfile() // Recargar datos
      } else {
        toast.error("Error al actualizar el perfil")
      }
    } catch (error) {
      console.error("Error al guardar perfil:", error)
      toast.error("Error de conexión")
    }
  }

  const handleCancel = () => {
    setEditing(false)
    if (user) {
      setFormData({
        fullName: user.fullName || "",
        email: user.email || ""
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">No se encontró el usuario</h1>
          <Button onClick={() => router.push("/dashboard")}>
            Volver al Panel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Button variant="outline" size="icon" onClick={() => router.back()} className="h-8 w-8 rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">Mi Perfil</h1>
          </div>
          <p className="text-muted-foreground ml-11">Gestiona tu información personal</p>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Información básica */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {user.fullName?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>{user.fullName}</CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                  <Shield className="h-3 w-3 mr-1" />
                  {user.role === "admin" ? "Administrador" : user.role === "superadmin" ? "Superadmin" : "Usuario"}
                </Badge>
                {!editing ? (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancel}>
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={handleSave}>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="fullName">Nombre Completo</Label>
                  <Input
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Nombre Completo</p>
                    <p className="text-sm text-muted-foreground">{user.fullName || "No especificado"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Correo Electrónico</p>
                    <p className="text-sm text-muted-foreground">{user.email || "No especificado"}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Información de la cuenta */}
        <Card>
          <CardHeader>
            <CardTitle>Información de la Cuenta</CardTitle>
            <CardDescription>Detalles de tu cuenta y permisos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Rol</p>
                <p className="text-sm text-muted-foreground">
                  {user.role === "admin" ? "Administrador de Empresa" : 
                   user.role === "superadmin" ? "Superadministrador" : 
                   "Usuario"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="font-medium">Miembro desde</p>
                <p className="text-sm text-muted-foreground">Usuario activo</p>
              </div>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <div>
                <p className="font-medium">Estado de la cuenta</p>
                <p className="text-sm text-muted-foreground">Activa</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
