"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import useSWR from "swr"
import styles from './dashboard.module.css'
import { DollarSign, ShoppingCart, Package, Users, PackageOpen, Receipt } from 'lucide-react'
import { motion, Variants } from "framer-motion"
import { useLayout } from "@/components/proveedores-componentes/LayoutProvider"
import { MENU_ITEMS } from "@/lib/menu-config"
import { Logo } from "@/components/logo"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Button } from "@/components/ui/button"

const fetcher = (url: string) => fetch(url).then(res => res.json())

const CountUp = ({ value, prefix = "", suffix = "" }: { value: number, prefix?: string, suffix?: string }) => {
    const [count, setCount] = useState(0)
    
    useEffect(() => {
        let start = 0
        const end = Math.floor(value)
        if (start === end) return
        
        let totalMiliseconds = 1500
        let incrementTime = (totalMiliseconds / end) * 5
        
        let timer = setInterval(() => {
            start += Math.ceil(end / 100)
            if (start >= end) {
                setCount(end)
                clearInterval(timer)
            } else {
                setCount(start)
            }
        }, 15)
        
        return () => clearInterval(timer)
    }, [value])
    
    return <span>{prefix}{count.toLocaleString()}{suffix}</span>
}

export default function DashboardView() {
    const router = useRouter()
    const { isVisualMode } = useLayout()
    
    // Obtener datos rápidos con SWR
    const { data: userData } = useSWR("/api/autenticacion/me", fetcher)
    const { data: stats, isLoading: loadingStats } = useSWR("/api/dashboard", fetcher, { 
        refreshInterval: 120000, 
        revalidateOnFocus: true 
    })

    const user = userData?.user

    // Filtrar elementos según el rol
    const activeItems = MENU_ITEMS.filter(item => {
        if (item.title === "Dashboard" || item.title === "Panel de Control") return false
        if (item.adminOnly) {
            return user?.role === "admin" || user?.role === "superadmin"
        }
        return true
    })

    if (loadingStats && !stats) {
        return <div className="text-center py-12 text-gray-500 animate-pulse font-medium">Cargando métricas...</div>
    }

    const currentStats = stats || {
        totalSales: 0, totalOrders: 0, totalProducts: 0, totalCustomers: 0,
        recentSales: [], lowStockProducts: [], chartData: []
    }

    // --- VISUAL MODE: FULL GRID LAYOUT ---
    if (isVisualMode) {
        const containerVariants: Variants = {
            hidden: { opacity: 0 },
            show: {
                opacity: 1,
                transition: { staggerChildren: 0.1, delayChildren: 0.2 }
            }
        }

        const itemVariants: Variants = {
            hidden: { opacity: 0, y: 20, filter: "grayscale(100%)", scale: 0.95 },
            show: {
                opacity: 1, y: 0, filter: "grayscale(0%)", scale: 1,
                transition: { type: "spring", stiffness: 50 }
            }
        }

        return (
            <div className="container mx-auto px-4 py-4 sm:py-6">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center justify-center text-center mb-6"
                >
                    <div className="flex flex-row items-center justify-center mb-1">
                        <Logo size="large" className="h-[120px] sm:h-[160px] w-auto drop-shadow-2xl" animated={true} iconOnly={false} />
                    </div>
                    <p className="text-sm sm:text-base font-medium tracking-wide text-muted-foreground/80">Seleccione un módulo para comenzar</p>
                </motion.div>

                <motion.div
                    variants={containerVariants}
                    initial="hidden" animate="show"
                    className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 sm:gap-5 max-w-[90rem] mx-auto"
                >
                    {activeItems.map((item: any) => {
                        const Icon = item.icon
                        return (
                            <Link key={item.href} href={item.href} legacyBehavior passHref>
                                <motion.a
                                    variants={itemVariants}
                                    whileHover={{
                                        scale: 1.05,
                                        filter: "grayscale(0%)",
                                        boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
                                    }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`cursor-pointer group relative overflow-hidden rounded-2xl bg-gradient-to-br ${item.color || 'from-gray-500 to-gray-600'} p-4 sm:p-5 text-white shadow-lg block`}
                                >
                                    <div className="flex flex-col items-center justify-center h-36 sm:h-44 text-center gap-3">
                                        <div className="bg-white/20 w-16 h-16 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-inner group-hover:scale-110 transition-transform duration-300">
                                            <Icon className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg sm:text-lg mb-1 leading-tight">{item.title}</h3>
                                            {item.description && (
                                                <p className="text-[10px] sm:text-xs opacity-90 font-medium px-1 leading-tight line-clamp-2">
                                                    {item.description}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="absolute -right-6 -bottom-6 opacity-10 transform rotate-12 group-hover:scale-110 transition-transform duration-500">
                                        <Icon size={120} />
                                    </div>
                                </motion.a>
                            </Link>
                        )
                    })}
                </motion.div>
            </div>
        )
    }

    // --- CLASSIC MODE: DASHBOARD STATS & QUICK ACCESS ---
    return (
        <div className={styles.container}>
            <div className="flex justify-between items-center mb-6">
                <h1 className={styles.title} style={{ marginBottom: 0 }}>Dashboard</h1>
                <p className="text-muted-foreground">{new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            {/* Quick Access Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {activeItems.slice(0, 4).map((item: any) => {
                    const Icon = item.icon
                    return (
                        <div
                            key={item.href}
                            onClick={() => router.push(item.href)}
                            className={`cursor-pointer group relative overflow-hidden rounded-xl bg-gradient-to-br ${item.color || 'from-gray-500 to-gray-600'} p-6 text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl`}
                        >
                            <div className="flex flex-col justify-between h-32">
                                <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                    <Icon className="h-7 w-7 text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl mb-1">{item.title}</h3>
                                    {item.description && <p className="text-white/80 text-sm">{item.description}</p>}
                                </div>
                            </div>
                            <div className="absolute -right-4 -bottom-4 opacity-10 transform rotate-12 group-hover:scale-110 transition-transform">
                                <Icon size={120} />
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-4">
                        <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">Ventas Totales</div>
                        <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded-lg text-emerald-600 dark:text-emerald-400">
                            <DollarSign size={20} />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                        <CountUp value={currentStats.totalSales} prefix="$" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-4">
                        <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">Pedidos</div>
                        <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                            <ShoppingCart size={20} />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                        <CountUp value={currentStats.totalOrders} />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-4">
                        <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">Productos</div>
                        <div className="bg-purple-100 dark:bg-purple-900/50 p-2 rounded-lg text-purple-600 dark:text-purple-400">
                            <Package size={20} />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                        <CountUp value={currentStats.totalProducts} />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-4">
                        <div className="text-sm font-semibold text-slate-500 dark:text-slate-400">Clientes</div>
                        <div className="bg-orange-100 dark:bg-orange-900/50 p-2 rounded-lg text-orange-600 dark:text-orange-400">
                            <Users size={20} />
                        </div>
                    </div>
                    <div className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">
                        <CountUp value={currentStats.totalCustomers} />
                    </div>
                </div>
            </div>

            {/* Gráfica de Tendencia (Nueva) */}
            <div className="mb-8 bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Tendencia de Ventas (Últimos 7 días)</h3>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={currentStats.chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ventas']}
                            />
                            <Area type="monotone" dataKey="value" stroke="#0ea5e9" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Listas Interactivas y Empty States */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                        <h3 className="font-bold text-slate-800 dark:text-white">Ventas Recientes</h3>
                        <Link href="/ventas"><Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">Ver todas</Button></Link>
                    </div>
                    <div className="p-2 flex-grow">
                        {currentStats.recentSales.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full sm:h-48 text-center p-6 text-slate-400">
                                <Receipt className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-600" />
                                <p className="font-medium">No hay ventas recientes</p>
                                <p className="text-sm mt-1">Registra una nueva venta para verla aquí</p>
                            </div>
                        ) : (
                            currentStats.recentSales.map((sale: any) => (
                                <Link href={`/ventas`} key={sale.id}>
                                    <div className="flex justify-between items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                                        <div>
                                            <div className="font-medium text-slate-800 dark:text-slate-200">{sale.customer}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{sale.date}</div>
                                        </div>
                                        <div className="font-bold text-emerald-600 dark:text-emerald-400">
                                            ${sale.total.toLocaleString()}
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col">
                    <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                        <h3 className="font-bold text-slate-800 dark:text-white">Stock Crítico</h3>
                        <Link href="/inventario"><Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">Ir al Inventario</Button></Link>
                    </div>
                    <div className="p-2 flex-grow">
                        {currentStats.lowStockProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full sm:h-48 text-center p-6 text-slate-400">
                                <PackageOpen className="w-12 h-12 mb-3 text-emerald-300 dark:text-emerald-600" />
                                <p className="font-medium text-emerald-600 dark:text-emerald-500">Todo en orden</p>
                                <p className="text-sm mt-1">No hay productos con bajo inventario</p>
                            </div>
                        ) : (
                            currentStats.lowStockProducts.map((product: any) => (
                                <Link href={`/inventario`} key={product.id}>
                                    <div className="flex justify-between items-center p-3 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-red-100 dark:hover:border-red-900/30">
                                        <div>
                                            <div className="font-medium text-slate-800 dark:text-slate-200">{product.name}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">Inventario crítico</div>
                                        </div>
                                        <div className="font-bold text-red-600 dark:text-red-400 flex items-center bg-red-100 dark:bg-red-900/30 px-2.5 py-1 rounded-full text-sm">
                                            {product.stock} un.
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
