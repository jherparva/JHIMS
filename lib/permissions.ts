//jhims-inventory\lib\permissions.ts//

import type { SessionUser } from "./auth"

export type Permission =
  | "dashboard.view"
  | "products.create"
  | "products.edit"
  | "products.delete"
  | "products.view"
  | "sales.create"
  | "sales.view"
  | "sales.edit"
  | "sales.delete"
  | "expenses.view"
  | "purchases.view"
  | "cashflow.view"
  | "categories.create"
  | "categories.edit"
  | "categories.delete"
  | "categories.view"
  | "suppliers.create"
  | "suppliers.edit"
  | "suppliers.delete"
  | "suppliers.view"
  | "customers.create"
  | "customers.edit"
  | "customers.delete"
  | "customers.view"
  | "stockin.create"
  | "stockin.view"
  | "reports.view"
  | "reports.create"
  | "users.create"
  | "users.edit"
  | "users.delete"
  | "users.view"
  | "settings.view"
  | "settings.edit"

// ─────────────────────────────────────────────────────────────────
//  PERMISOS POR ROL
//  ┌─ ADMIN: Acceso total al sistema
//  └─ VENDEDOR: Solo operaciones de venta y consulta
// ─────────────────────────────────────────────────────────────────
const rolePermissions: Record<"admin" | "seller", Permission[]> = {
  admin: [
    // Dashboard
    "dashboard.view",
    // Productos (CRUD completo)
    "products.create", "products.edit", "products.delete", "products.view",
    // Ventas (CRUD completo)
    "sales.create", "sales.view", "sales.edit", "sales.delete",
    // Categorías (CRUD completo)
    "categories.create", "categories.edit", "categories.delete", "categories.view",
    // Proveedores (CRUD completo)
    "suppliers.create", "suppliers.edit", "suppliers.delete", "suppliers.view",
    // Clientes (CRUD completo)
    "customers.create", "customers.edit", "customers.delete", "customers.view",
    // Entradas de Stock
    "stockin.create", "stockin.view",
    // Reportes
    "reports.view", "reports.create",
    // Usuarios (solo admin)
    "users.create", "users.edit", "users.delete", "users.view",
    // Configuración (solo admin)
    "settings.view", "settings.edit",
  ],
  seller: [
    // Dashboard: Solo puede ver el resumen
    "dashboard.view",
    // Productos: Solo consultar (no puede crear ni borrar)
    "products.view",
    // Ventas: Puede crear y ver (no puede eliminar ni editar)
    "sales.create",
    "sales.view",
    // Clientes: Puede crear y ver
    "customers.create",
    "customers.view",
    // Categorías: Solo ver
    "categories.view",
    // NO tiene acceso a: suppliers, stockin, reports completos, users, settings
  ],
}

// ─────────────────────────────────────────────────────────────────
//  Rutas que solo puede ver el ADMIN
// ─────────────────────────────────────────────────────────────────
export const ADMIN_ONLY_ROUTES = [
  "/usuarios",
  "/configuracion",
  "/reportes",
  "/entrada-inventario",
  "/proveedores",
  "/categorias",
  "/inventario",
]

// ─────────────────────────────────────────────────────────────────
//  Funciones de verificación de permisos
// ─────────────────────────────────────────────────────────────────
export function hasPermission(user: SessionUser | null, permission: Permission): boolean {
  if (!user) return false

  // Admin siempre tiene todos los permisos
  if (user.role === "admin" || user.role === "superadmin") return true

  // Para vendedores: verificar permisos personalizados o usar defaults del rol
  if (user.role === "seller") {
    // Si tiene permisos personalizados asignados por el admin, usarlos
    if (user.permissions && user.permissions.length > 0) {
      return user.permissions.includes(permission)
    }
    // Sin permisos personalizados, usar los defaults del rol vendedor
    return rolePermissions.seller.includes(permission)
  }

  return false
}

export function canDelete(user: SessionUser | null, _resource: string): boolean {
  if (!user) return false
  // Solo el admin puede eliminar registros
  return user.role === "admin" || user.role === "superadmin"
}

export function canEdit(user: SessionUser | null, resource: string): boolean {
  if (!user) return false
  if (user.role === "admin" || user.role === "superadmin") return true
  // Los vendedores no pueden editar nada (solo crear ventas y ver)
  return false
}

export function canCreate(user: SessionUser | null, resource: string): boolean {
  if (!user) return false
  if (user.role === "admin" || user.role === "superadmin") return true
  // Vendedores solo pueden crear ventas y clientes nuevos
  if (user.role === "seller") {
    return ["sales", "customers"].includes(resource)
  }
  return false
}

export function isAdmin(user: SessionUser | null): boolean {
  return user?.role === "admin" || user?.role === "superadmin"
}

export function isSeller(user: SessionUser | null): boolean {
  return user?.role === "seller"
}

export function getDefaultPermissions(role: "admin" | "seller"): Permission[] {
  return rolePermissions[role] || []
}
