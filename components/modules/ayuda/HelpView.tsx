"use client"

import { useState } from "react"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Mail, Phone, FileText, ExternalLink, Leaf, Send, HelpCircle, Clock, MessageSquare, CheckCircle2, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { useEffect } from "react"
import { Badge } from "@/components/ui/badge"

export default function HelpView() {
    const [sending, setSending] = useState(false)
    const [tickets, setTickets] = useState<any[]>([])
    const [loadingTickets, setLoadingTickets] = useState(true)

    useEffect(() => {
        fetchMyTickets()
        
        // Configurar polling para verificar nuevas respuestas cada 30 segundos
        const interval = setInterval(() => {
            fetchMyTickets()
        }, 30000)
        
        return () => clearInterval(interval)
    }, [])

    const fetchMyTickets = async () => {
        try {
            const res = await fetch("/api/ayuda/tickets")
            if (res.ok) {
                const data = await res.json()
                setTickets(data)
                console.log("Tickets cargados:", data)
            } else {
                console.error("Error al cargar tickets:", res.status)
            }
        } catch (error) {
            console.error("Error al cargar tickets:", error)
        } finally {
            setLoadingTickets(false)
        }
    }

    const handleSendSupport = async (e: React.FormEvent) => {
        e.preventDefault()
        const form = e.target as HTMLFormElement
        const subject = (form.querySelector('#subject') as HTMLInputElement).value
        const message = (form.querySelector('#message') as HTMLTextAreaElement).value

        setSending(true)
        try {
            const response = await fetch("/api/ayuda/tickets", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subject, message })
            })

            if (response.ok) {
                toast.success("Mensaje enviado al soporte técnico. El Superadmin te responderá pronto.")
                form.reset()
                fetchMyTickets()
            } else {
                toast.error("Error al enviar el mensaje")
            }
        } catch (error) {
            toast.error("Error de conexión")
        } finally {
            setSending(false)
        }
    }

    return (
        <div className="space-y-8 pb-8">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                    <HelpCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Centro de Ayuda</h1>
                    <p className="text-muted-foreground">Recursos, soporte y compromiso con la sostenibilidad.</p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* FAQ y Sostenibilidad Column */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Preguntas Frecuentes</CardTitle>
                            <CardDescription>Respuestas rápidas a dudas comunes.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Accordion type="single" collapsible className="w-full">
                                <AccordionItem value="item-1">
                                    <AccordionTrigger>¿Cómo registro una venta?</AccordionTrigger>
                                    <AccordionContent>
                                        Ve al módulo de "Punto de Venta", busca los productos, agrégalos al carrito y haz clic en "Procesar Venta".
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="item-2">
                                    <AccordionTrigger>¿Cómo agrego stock?</AccordionTrigger>
                                    <AccordionContent>
                                        Usa el módulo "Entradas" (Stock In) para registrar la llegada de nueva mercancía seleccionando el proveedor y el producto.
                                    </AccordionContent>
                                </AccordionItem>
                                <AccordionItem value="item-3">
                                    <AccordionTrigger>¿Puedo exportar reportes?</AccordionTrigger>
                                    <AccordionContent>
                                        Sí, en el módulo "Reportes" puedes visualizar el balance de ventas y compras en tiempo real.
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </CardContent>
                    </Card>

                    <Card className="bg-emerald-50/50 border-emerald-100">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-emerald-700">
                                <Leaf className="h-5 w-5" />
                                Compromiso de Sostenibilidad
                            </CardTitle>
                            <CardDescription className="text-emerald-600/80">Tips para un negocio eco-responsable con JHIMS.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="p-4 bg-white rounded-lg border border-emerald-100 shadow-sm">
                                    <h4 className="font-semibold text-emerald-800 mb-1">Cero Papel</h4>
                                    <p className="text-sm text-emerald-700/70">Usa el sistema para consultar ventas e inventario digitalmente. Evita imprimir reportes innecesarios.</p>
                                </div>
                                <div className="p-4 bg-white rounded-lg border border-emerald-100 shadow-sm">
                                    <h4 className="font-semibold text-emerald-800 mb-1">Optimización de Stock</h4>
                                    <p className="text-sm text-emerald-700/70">Evita el desperdicio de productos perecederos usando nuestras alertas de stock bajo y reportes de rotación.</p>
                                </div>
                                <div className="p-4 bg-white rounded-lg border border-emerald-100 shadow-sm">
                                    <h4 className="font-semibold text-emerald-800 mb-1">Proveedores Locales</h4>
                                    <p className="text-sm text-emerald-700/70">Registra y prioriza proveedores de tu región para reducir la huella de carbono por transporte.</p>
                                </div>
                                <div className="p-4 bg-white rounded-lg border border-emerald-100 shadow-sm">
                                    <h4 className="font-semibold text-emerald-800 mb-1">Eficiencia Energética</h4>
                                    <p className="text-sm text-emerald-700/70">Configura el modo oscuro del sistema para reducir el consumo energético de tus monitores durante la jornada.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Formulario de Soporte y Recursos */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Soporte Técnico</CardTitle>
                            <CardDescription>Envíanos tus dudas o problemas.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSendSupport} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="subject">Asunto</Label>
                                    <Input id="subject" placeholder="Ej: Error al reporte" required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="message">Mensaje</Label>
                                    <Textarea id="message" placeholder="Describe tu problema..." className="min-h-[100px]" required />
                                </div>
                                <Button type="submit" className="w-full" disabled={sending}>
                                    {sending ? "Enviando..." : <><Send className="mr-2 h-4 w-4" /> Enviar Mensaje</>}
                                </Button>
                            </form>
                            <div className="mt-6 pt-6 border-t space-y-3">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Mail className="h-4 w-4" />
                                    soporte@jhims.com
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Phone className="h-4 w-4" />
                                    +57 300 123 4567
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <MessageSquare className="h-5 w-5" />
                                    Mis Tickets de Soporte
                                    {tickets.filter(t => t.response).length > 0 && (
                                        <Badge variant="secondary" className="ml-2">
                                            {tickets.filter(t => t.response).length} respuesta(s)
                                        </Badge>
                                    )}
                                </div>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={fetchMyTickets}
                                    disabled={loadingTickets}
                                >
                                    <RefreshCw className={`h-4 w-4 ${loadingTickets ? 'animate-spin' : ''}`} />
                                </Button>
                            </CardTitle>
                            <CardDescription>Historial de tus solicitudes de ayuda.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loadingTickets ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    <span className="ml-2">Cargando tickets...</span>
                                </div>
                            ) : tickets.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No tienes tickets de soporte aún.</p>
                                    <p className="text-sm">Usa el formulario de arriba para enviar tu primera solicitud.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {tickets.map((ticket) => (
                                        <div key={ticket._id} className="border rounded-lg p-4 space-y-3">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <h4 className="font-semibold">{ticket.subject}</h4>
                                                        <Badge variant={
                                                            ticket.status === 'open' ? 'destructive' :
                                                            ticket.status === 'in_progress' ? 'default' :
                                                            'secondary'
                                                        }>
                                                            {ticket.status === 'open' ? 'Abierto' :
                                                             ticket.status === 'in_progress' ? 'En Proceso' :
                                                             'Resuelto'}
                                                        </Badge>
                                                        <Badge variant="outline">
                                                            {ticket.priority === 'high' ? 'Alta' :
                                                             ticket.priority === 'medium' ? 'Media' :
                                                             'Baja'}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mb-2">
                                                        {new Date(ticket.createdAt).toLocaleDateString('es-ES', {
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                    <div className="bg-muted/50 rounded p-3">
                                                        <p className="text-sm whitespace-pre-wrap">{ticket.message}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {ticket.response && (
                                                <div className="border-t pt-3">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                        <span className="font-semibold text-emerald-700">Respuesta del Superadmin</span>
                                                        <span className="text-sm text-muted-foreground">
                                                            {new Date(ticket.respondedAt).toLocaleDateString('es-ES', {
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            })}
                                                        </span>
                                                    </div>
                                                    <div className="bg-emerald-50 border border-emerald-200 rounded p-3">
                                                        <p className="text-sm whitespace-pre-wrap">{ticket.response}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
