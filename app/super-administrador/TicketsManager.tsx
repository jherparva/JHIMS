"use client"

import { useState, useEffect } from "react"
import { 
    MessageSquare, Send, CheckCircle2, Clock, 
    AlertCircle, RefreshCw, User, Building2, 
    Search, Filter, ChevronRight
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

interface Ticket {
    _id: string
    companyId: { _id: string, name: string, email: string }
    userId: { _id: string, fullName: string, username: string, email: string }
    subject: string
    message: string
    status: "open" | "in_progress" | "resolved" | "closed"
    priority: "low" | "medium" | "high"
    response?: string
    respondedAt?: string
    createdAt: string
}

const STATUS_MAP = {
    open: { label: "Abierto", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Clock },
    in_progress: { label: "En Proceso", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: RefreshCw },
    resolved: { label: "Resuelto", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
    closed: { label: "Cerrado", color: "bg-slate-500/10 text-slate-400 border-slate-500/20", icon: AlertCircle },
}

export default function TicketsManager() {
    const [tickets, setTickets] = useState<Ticket[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)
    const [response, setResponse] = useState("")
    const [sending, setSending] = useState(false)
    const [filter, setFilter] = useState("all")

    useEffect(() => {
        fetchTickets()
    }, [])

    const fetchTickets = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/super-administrador/tickets")
            if (res.ok) {
                const data = await res.json()
                setTickets(data)
            } else {
                toast.error("Error al cargar tickets")
            }
        } catch (error) {
            toast.error("Error de conexión")
        } finally {
            setLoading(false)
        }
    }

    const handleSendResponse = async () => {
        if (!selectedTicket || !response.trim()) return

        setSending(true)
        try {
            const res = await fetch(`/api/super-administrador/tickets/${selectedTicket._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    response: response.trim(),
                    status: "resolved" 
                })
            })

            if (res.ok) {
                toast.success("Respuesta enviada exitosamente")
                setResponse("")
                setSelectedTicket(null)
                fetchTickets()
            } else {
                toast.error("Error al enviar respuesta")
            }
        } catch (error) {
            toast.error("Error de conexión")
        } finally {
            setSending(false)
        }
    }

    const filteredTickets = tickets.filter(t => {
        if (filter === "all") return true
        if (filter === "pending") return t.status === "open" || t.status === "in_progress"
        if (filter === "resolved") return t.status === "resolved"
        return true
    })

    return (
        <div className="grid lg:grid-cols-12 gap-6 h-[calc(100vh-250px)]">
            {/* Lista de Tickets */}
            <div className="lg:col-span-4 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-violet-400" />
                        Mensajes de Ayuda
                    </h2>
                    <Button variant="ghost" size="icon" onClick={fetchTickets} disabled={loading}>
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                </div>

                <div className="flex gap-2">
                    <button 
                        onClick={() => setFilter("all")}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                            filter === "all" 
                                ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/20" 
                                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                        }`}
                    >
                        Todos
                    </button>
                    <button 
                        onClick={() => setFilter("pending")}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                            filter === "pending" 
                                ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/20" 
                                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                        }`}
                    >
                        Pendientes
                    </button>
                    <button 
                        onClick={() => setFilter("resolved")}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                            filter === "resolved" 
                                ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/20" 
                                : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                        }`}
                    >
                        Resueltos
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-700">
                    {loading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-24 bg-slate-800/50 rounded-2xl animate-pulse" />
                        ))
                    ) : filteredTickets.length === 0 ? (
                        <div className="text-center py-10 text-slate-500">
                            <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-20" />
                            <p className="text-sm">No hay mensajes</p>
                        </div>
                    ) : (
                        filteredTickets.map((ticket) => {
                            const StatusIcon = STATUS_MAP[ticket.status].icon
                            return (
                                <button
                                    key={ticket._id}
                                    onClick={() => setSelectedTicket(ticket)}
                                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                                        selectedTicket?._id === ticket._id 
                                            ? "bg-violet-600/10 border-violet-500/50 shadow-lg shadow-violet-900/10" 
                                            : "bg-slate-900 border-slate-700/50 hover:bg-slate-800"
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge className={`text-[10px] uppercase font-bold py-0 h-5 ${STATUS_MAP[ticket.status].color}`}>
                                            <StatusIcon className="h-3 w-3 mr-1" />
                                            {STATUS_MAP[ticket.status].label}
                                        </Badge>
                                        <span className="text-[10px] text-slate-500">
                                            {new Date(ticket.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-white text-sm truncate mb-1">{ticket.subject}</h4>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mb-2">
                                        <Building2 className="h-3 w-3" />
                                        <span className="truncate">{ticket.companyId?.name}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                        {ticket.message}
                                    </p>
                                </button>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Detalle y Respuesta */}
            <div className="lg:col-span-8 flex flex-col h-full">
                {selectedTicket ? (
                    <div className="bg-slate-900 border border-slate-700/50 rounded-3xl flex flex-col h-full overflow-hidden shadow-2xl">
                        {/* Cabecera del Detalle */}
                        <div className="p-6 border-b border-slate-700/50 bg-slate-800/20">
                            <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-1">{selectedTicket.subject}</h3>
                                    <div className="flex items-center gap-4 text-xs text-slate-400">
                                        <span className="flex items-center gap-1">
                                            <User className="h-3 w-3 text-violet-400" />
                                            {selectedTicket.userId?.fullName} (@{selectedTicket.userId?.username})
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Building2 className="h-3 w-3 text-violet-400" />
                                            {selectedTicket.companyId?.name}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Fecha de solicitud</p>
                                    <p className="text-sm text-slate-300">{new Date(selectedTicket.createdAt).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Mensaje original */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            <div className="flex gap-4 items-start">
                                <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                                    <User className="h-5 w-5 text-slate-400" />
                                </div>
                                <div className="space-y-2 max-w-[85%]">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mensaje del Usuario</p>
                                    <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-none p-4 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
                                        {selectedTicket.message}
                                    </div>
                                </div>
                            </div>

                            {selectedTicket.response && (
                                <div className="flex gap-4 items-start justify-end text-right">
                                    <div className="space-y-2 max-w-[85%]">
                                        <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Respuesta de JHIMS (Tú)</p>
                                        <div className="bg-violet-600/10 border border-violet-500/30 rounded-2xl rounded-tr-none p-4 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
                                            {selectedTicket.response}
                                        </div>
                                        <p className="text-[10px] text-slate-500 italic">Respondido el {new Date(selectedTicket.respondedAt!).toLocaleString()}</p>
                                    </div>
                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-700 flex items-center justify-center shrink-0 shadow-lg shadow-violet-900/20">
                                        <ShieldCheck className="h-5 w-5 text-white" />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Formulario de Respuesta */}
                        {selectedTicket.status !== "closed" && (
                            <div className="p-6 border-t border-slate-700/50 bg-slate-800/10">
                                <div className="space-y-3">
                                    <Label htmlFor="admin-response" className="text-xs font-bold text-slate-400 uppercase tracking-widest">Escribir Respuesta</Label>
                                    <Textarea 
                                        id="admin-response"
                                        placeholder="Escribe aquí tu solución o respuesta para el usuario..."
                                        className="bg-slate-800 border-slate-700 rounded-2xl min-h-[120px] focus:ring-violet-500/30 text-sm"
                                        value={response}
                                        onChange={(e) => setResponse(e.target.value)}
                                    />
                                    <div className="flex justify-end gap-3 pt-2">
                                        <Button 
                                            variant="ghost" 
                                            className="rounded-xl text-xs hover:bg-slate-800"
                                            onClick={() => setSelectedTicket(null)}
                                        >
                                            Cancelar
                                        </Button>
                                        <Button 
                                            className="rounded-2xl bg-violet-600 hover:bg-violet-700 px-8 h-11 font-bold shadow-lg shadow-violet-900/20"
                                            onClick={handleSendResponse}
                                            disabled={sending || !response.trim()}
                                        >
                                            {sending ? "Enviando..." : (
                                                <>
                                                    <Send className="h-4 w-4 mr-2" />
                                                    Enviar Respuesta y Resolver
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-10 bg-slate-900/50 border border-dashed border-slate-700 rounded-3xl">
                        <div className="w-20 h-20 rounded-full bg-slate-800/50 flex items-center justify-center mb-6 border border-slate-700">
                            <MessageSquare className="h-10 w-10 text-slate-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-300 mb-2">Selecciona un mensaje</h3>
                        <p className="text-sm text-slate-500 max-w-sm">
                            Elige un ticket de soporte de la lista de la izquierda para ver los detalles y responder al usuario directamente desde aquí.
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}

function ShieldCheck(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    )
}
