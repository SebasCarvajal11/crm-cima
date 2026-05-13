import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SidebarItem = {
  key: string
  label: string
  icon: React.ReactNode
  onClick: () => void
  isActive: boolean
  hidden?: boolean
}

type AppShellProps = {
  title: string
  sidebarItems: SidebarItem[]
  userEmail: string
  userRole: string
  onLogout: () => void
  isLoggingOut?: boolean
  headerExtras?: React.ReactNode
  children: React.ReactNode
  className?: string
}

const ROLE_LABEL: Record<string, string> = {
  admin:  'Administrador',
  worker: 'Trabajador',
  client: 'Cliente',
}

// ─── Sub-componentes fuera del AppShell para evitar problemas con HMR ────────

function SidebarNav({
  items,
  onItemClick,
}: {
  items: SidebarItem[]
  onItemClick: () => void
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Navegación principal">
      {items.filter((i) => !i.hidden).map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => { item.onClick(); onItemClick() }}
          aria-current={item.isActive ? 'page' : undefined}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/50',
            item.isActive
              ? 'bg-primary-foreground/15 text-primary-foreground'
              : 'text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground'
          )}
        >
          <span className="shrink-0" aria-hidden="true">{item.icon}</span>
          <span>{item.label}</span>
          {item.isActive && (
            <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground" aria-hidden="true" />
          )}
        </button>
      ))}
    </nav>
  )
}

function SidebarFooter({
  userEmail,
  userRole,
  onLogout,
  isLoggingOut,
}: {
  userEmail: string
  userRole: string
  onLogout: () => void
  isLoggingOut: boolean
}) {
  return (
    <div className="border-t border-primary-foreground/10 px-4 py-4 space-y-3">
      <div className="min-w-0">
        <p className="text-xs text-primary-foreground/60 truncate">{userEmail}</p>
        <p className="text-xs font-medium text-primary-foreground/80">
          {ROLE_LABEL[userRole] ?? userRole}
        </p>
      </div>
      <button
        type="button"
        onClick={onLogout}
        disabled={isLoggingOut}
        className="w-full text-left text-xs text-primary-foreground/60 hover:text-primary-foreground transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/50 rounded px-1"
      >
        {isLoggingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
      </button>
    </div>
  )
}

// ─── Shell principal ──────────────────────────────────────────────────────────

/**
 * Marco principal de la aplicación autenticada.
 * Sidebar fija a la izquierda (colapsable en móvil) + área de contenido a la derecha.
 */
export function AppShell({
  title,
  sidebarItems,
  userEmail,
  userRole,
  onLogout,
  isLoggingOut = false,
  headerExtras,
  children,
  className,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const brand = (
    <Link
      to="/dashboard"
      className="text-xl font-black uppercase tracking-tight text-primary-foreground"
      onClick={() => setMobileOpen(false)}
    >
      {title}
    </Link>
  )

  return (
    <div className={cn('min-h-screen bg-background flex', className)}>

      {/* ── Sidebar desktop (fija, siempre visible en md+) ── */}
      <aside
        className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col bg-primary text-primary-foreground fixed inset-y-0 left-0 z-30"
        aria-label="Barra de navegación lateral"
      >
        <div className="flex items-center gap-2 px-5 py-5 border-b border-primary-foreground/10">
          {brand}
          {headerExtras ? <div className="ml-auto">{headerExtras}</div> : null}
        </div>
        <SidebarNav items={sidebarItems} onItemClick={() => {}} />
        <SidebarFooter
          userEmail={userEmail}
          userRole={userRole}
          onLogout={onLogout}
          isLoggingOut={isLoggingOut}
        />
      </aside>

      {/* ── Overlay móvil ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          aria-hidden="true"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar móvil (deslizable) ── */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-primary text-primary-foreground flex flex-col transition-transform duration-300 md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Menú de navegación"
        {...(!mobileOpen ? { inert: true } : {})}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-primary-foreground/10">
          <span className="text-xl font-black uppercase tracking-tight text-primary-foreground">{title}</span>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
            className="text-primary-foreground/70 hover:text-primary-foreground"
          >
            <X className="size-5" />
          </button>
        </div>
        <SidebarNav items={sidebarItems} onItemClick={() => setMobileOpen(false)} />
        <SidebarFooter
          userEmail={userEmail}
          userRole={userRole}
          onLogout={onLogout}
          isLoggingOut={isLoggingOut}
        />
      </aside>

      {/* ── Área de contenido principal ── */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-60 lg:ml-64">

        {/* Topbar solo en móvil */}
        <header className="md:hidden sticky top-0 z-20 flex items-center justify-between gap-2 border-b bg-card/95 backdrop-blur px-3 py-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="size-5" />
          </button>
          <span className="font-black uppercase tracking-tight text-primary text-sm truncate">{title}</span>
          <div className="flex min-w-0 items-center gap-2">
            {headerExtras}
            <span className="hidden text-xs text-muted-foreground truncate max-w-[120px] sm:inline">{userEmail}</span>
          </div>
        </header>

        {/* Contenido */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
