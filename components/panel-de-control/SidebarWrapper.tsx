"use client"

import { useLayout } from "@/components/proveedores-componentes/LayoutProvider"
import { Sidebar } from "./sidebar"

export function SidebarWrapper() {
    const { isVisualMode } = useLayout()

    if (isVisualMode) return null

    return <Sidebar />
}
