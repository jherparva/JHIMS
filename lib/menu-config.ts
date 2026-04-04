import {
    Home,
    ShoppingCart,
    Package,
    Truck,
    Wallet,
    Users,
    BarChart3,
    Settings,
    Headphones,
    ShoppingBag,
    Tags,
    UserCog,
    LucideIcon
} from "lucide-react"

export interface MenuItem {
    title: string
    href: string
    icon: LucideIcon
    description?: string
    /** Si es true, solo lo ve el admin */
    adminOnly?: boolean
    /** Permisos requeridos para ver este item (cualquiera de los listados) */
    requiredPermission?: string
    color?: string
}

export const MENU_ITEMS: MenuItem[] = [
    {
        title: "Panel de Control",
        href: "/dashboard",
        icon: Home,
        description: "Resumen general y estadísticas",
        color: "from-blue-500 to-blue-600"
    },
    {
        title: "Punto de Venta",
        href: "/punto-de-venta",
        icon: ShoppingCart,
        description: "Realizar ventas y facturación",
        color: "from-green-500 to-emerald-600"
    },
    {
        title: "Historial de Ventas",
        href: "/ventas",
        icon: ShoppingBag,
        description: "Listado e historial de ventas",
        color: "from-teal-400 to-teal-600"
    },
    {
        title: "Gastos",
        href: "/gastos",
        icon: Wallet,
        description: "Control de gastos y salidas de caja",
        color: "from-rose-500 to-red-600"
    },
    {
        title: "Cartera",
        href: "/cartera",
        icon: Users,
        description: "Cuentas por cobrar y abonos",
        color: "from-indigo-600 to-blue-700"
    },
    // ── Solo ADMIN ─────────────────────────────────────────────────────
    {
        title: "Inventario",
        href: "/inventario",
        icon: Package,
        description: "Gestión de productos y stock",
        adminOnly: true,
        color: "from-indigo-500 to-purple-600"
    },
    {
        title: "Categorías",
        href: "/categorias",
        icon: Tags,
        description: "Organiza tus productos por grupos",
        adminOnly: true,
        color: "from-yellow-500 to-orange-600"
    },
    {
        title: "Entradas de Stock",
        href: "/entrada-inventario",
        icon: Truck,
        description: "Registro de mercancía entrante",
        adminOnly: true,
        color: "from-orange-400 to-red-500"
    },
    {
        title: "Proveedores",
        href: "/proveedores",
        icon: Users,
        description: "Gestión de proveedores",
        adminOnly: true,
        color: "from-teal-500 to-cyan-600"
    },
    {
        title: "Clientes",
        href: "/clientes",
        icon: Users,
        description: "Gestión de clientes y contactos",
        color: "from-blue-400 to-indigo-600"
    },
    {
        title: "Reportes",
        href: "/reportes",
        icon: BarChart3,
        description: "Informes y análisis de ventas",
        adminOnly: true,
        color: "from-violet-500 to-fuchsia-600"
    },
    {
        title: "Usuarios",
        href: "/usuarios",
        icon: UserCog,
        description: "Administración de usuarios",
        adminOnly: true,
        color: "from-slate-700 to-slate-800"
    },
    {
        title: "Configuración",
        href: "/configuracion",
        icon: Settings,
        description: "Ajustes del sistema",
        adminOnly: true,
        color: "from-stone-500 to-stone-600"
    },
    // ── Todos los roles ────────────────────────────────────────────────
    {
        title: "Ayuda",
        href: "/ayuda",
        icon: Headphones,
        description: "Soporte y documentación",
        color: "from-pink-500 to-rose-600"
    },
]
