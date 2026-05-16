import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Bell, ChevronUp, LogOut, Menu, PanelLeftClose, PanelLeftOpen, User, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/shared/lib/utils'

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
  userAvatarUrl?: string | null
  onOpenProfile: () => void
  onOpenNotifications: () => void
  onLogout: () => void
  isLoggingOut?: boolean
  headerExtras?: React.ReactNode
  children: React.ReactNode
  className?: string
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  worker: 'Trabajador',
  client: 'Cliente',
}

const shellSidebarWidth = 'md:w-64 lg:w-72'
const shellSidebarOffset = 'md:ml-64 lg:ml-72'

const navItemBaseClass =
  'group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/50'

function roleInitial(role: string) {
  const label = ROLE_LABEL[role] ?? role
  return label.charAt(0).toUpperCase() || 'U'
}

function visibleItems(items: SidebarItem[]) {
  return items.filter((item) => !item.hidden)
}

function SidebarBrand({
  title,
  headerExtras,
  closeOnNavigate,
}: {
  title: string
  headerExtras?: React.ReactNode
  closeOnNavigate: () => void
}) {
  return (
    <div className="flex items-center gap-3">
      <Link
        to="/dashboard"
        className="min-w-0 truncate text-lg font-black uppercase tracking-tight text-primary-foreground"
        onClick={closeOnNavigate}
      >
        {title}
      </Link>
      {headerExtras ? <div className="ml-auto shrink-0">{headerExtras}</div> : null}
    </div>
  )
}

function SidebarNav({
  items,
  compact = false,
  onItemClick,
}: {
  items: SidebarItem[]
  compact?: boolean
  onItemClick: () => void
}) {
  const filteredItems = useMemo(() => visibleItems(items), [items])

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Navegacion principal">
      {filteredItems.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => {
            item.onClick()
            onItemClick()
          }}
          aria-current={item.isActive ? 'page' : undefined}
          className={cn(
            navItemBaseClass,
            item.isActive
              ? 'bg-primary-foreground/14 text-primary-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]'
              : 'text-primary-foreground/72 hover:bg-primary-foreground/9 hover:text-primary-foreground',
            compact && 'justify-center px-2.5'
          )}
        >
          <span className="shrink-0" aria-hidden="true">{item.icon}</span>
          {!compact && <span className="truncate">{item.label}</span>}
          {item.isActive && (
            <span
              className={cn(
                'ml-auto inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-primary-foreground',
                compact && 'absolute -right-1 top-1/2 -translate-y-1/2'
              )}
              aria-hidden="true"
            />
          )}
        </button>
      ))}
    </nav>
  )
}

function SidebarFooter({
  userEmail,
  userRole,
  userAvatarUrl,
  onOpenProfile,
  onOpenNotifications,
  onLogout,
  isLoggingOut,
  compact = false,
  menuPlacement = 'inline',
}: {
  userEmail: string
  userRole: string
  userAvatarUrl?: string | null
  onOpenProfile: () => void
  onOpenNotifications: () => void
  onLogout: () => void
  isLoggingOut: boolean
  compact?: boolean
  menuPlacement?: 'inline' | 'side'
}) {
  const roleLabel = ROLE_LABEL[userRole] ?? userRole
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onClickOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  return (
    <div className="border-t border-primary-foreground/10 p-3" ref={rootRef}>
      <div className={cn('rounded-xl bg-primary-foreground/[0.07] p-3', compact && 'p-2')}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'flex w-full items-start gap-3 rounded-lg border border-transparent px-2 py-1.5 text-left transition-all hover:border-primary-foreground/15 hover:bg-primary-foreground/10',
            compact && 'justify-center px-0'
          )}
        >
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-foreground/20 text-xs font-semibold text-primary-foreground">
            {userAvatarUrl ? (
              <img src={userAvatarUrl} alt="Foto de perfil" className="size-8 rounded-full object-cover" />
            ) : (
              roleInitial(userRole)
            )}
          </div>
          {!compact && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-primary-foreground/70">{userEmail}</p>
              <p className="text-xs font-medium text-primary-foreground/90">{roleLabel}</p>
            </div>
          )}
          {!compact && (
            <ChevronUp className={cn('mt-2 size-4 text-primary-foreground/70 transition-transform', open && 'rotate-180')} />
          )}
        </button>

        {open && !compact && (
          <div
            className={cn(
              'space-y-1 rounded-lg border border-primary-foreground/12 bg-primary text-primary-foreground p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95 duration-150',
              menuPlacement === 'side'
                ? 'absolute bottom-3 left-[calc(100%+0.5rem)] z-50 min-w-[220px]'
                : 'mt-2 bg-primary-foreground/[0.04]'
            )}
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false)
                onOpenProfile()
              }}
              className="h-8 w-full justify-start rounded-md text-primary-foreground/80 hover:bg-primary-foreground/12 hover:text-primary-foreground"
            >
              <User className="size-4" />
              <span>Mi Cuenta</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false)
                onOpenNotifications()
              }}
              className="h-8 w-full justify-start rounded-md text-primary-foreground/80 hover:bg-primary-foreground/12 hover:text-primary-foreground"
            >
              <Bell className="size-4" />
              <span>Notificaciones</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onLogout}
              disabled={isLoggingOut}
              className="h-8 w-full justify-start rounded-md text-primary-foreground/80 hover:bg-primary-foreground/12 hover:text-primary-foreground"
            >
              <LogOut className="size-4" />
              <span>{isLoggingOut ? 'Cerrando sesion...' : 'Cerrar Sesion'}</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

function DesktopSidebar({
  title,
  items,
  userEmail,
  userRole,
  userAvatarUrl,
  onOpenProfile,
  onOpenNotifications,
  onLogout,
  isLoggingOut,
  headerExtras,
}: {
  title: string
  items: SidebarItem[]
  userEmail: string
  userRole: string
  userAvatarUrl?: string | null
  onOpenProfile: () => void
  onOpenNotifications: () => void
  onLogout: () => void
  isLoggingOut: boolean
  headerExtras?: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 hidden shrink-0 flex-col bg-primary text-primary-foreground md:flex',
        collapsed ? 'md:w-20' : shellSidebarWidth
      )}
      aria-label="Barra de navegacion lateral"
    >
      <div className="flex items-center gap-2 border-b border-primary-foreground/10 p-3">
        <div className="min-w-0 flex-1 px-1">
          <SidebarBrand title={title} headerExtras={collapsed ? undefined : headerExtras} closeOnNavigate={() => {}} />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => setCollapsed((prev) => !prev)}
          className="text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
          aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
        >
          {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
        </Button>
      </div>
      <SidebarNav items={items} compact={collapsed} onItemClick={() => {}} />
      <SidebarFooter
        userEmail={userEmail}
        userRole={userRole}
        userAvatarUrl={userAvatarUrl}
        onOpenProfile={onOpenProfile}
        onOpenNotifications={onOpenNotifications}
        onLogout={onLogout}
        isLoggingOut={isLoggingOut}
        compact={collapsed}
        menuPlacement="side"
      />
    </aside>
  )
}

function MobileSidebar({
  open,
  setOpen,
  title,
  items,
  userEmail,
  userRole,
  userAvatarUrl,
  onOpenProfile,
  onOpenNotifications,
  onLogout,
  isLoggingOut,
  headerExtras,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  title: string
  items: SidebarItem[]
  userEmail: string
  userRole: string
  userAvatarUrl?: string | null
  onOpenProfile: () => void
  onOpenNotifications: () => void
  onLogout: () => void
  isLoggingOut: boolean
  headerExtras?: React.ReactNode
}) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/45 md:hidden"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-primary text-primary-foreground shadow-xl transition-transform duration-300 md:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Menu de navegacion"
        {...(!open ? { inert: true } : {})}
      >
        <div className="flex items-center justify-between border-b border-primary-foreground/10 px-4 py-4">
          <div className="min-w-0 flex-1">
            <SidebarBrand title={title} headerExtras={headerExtras} closeOnNavigate={() => setOpen(false)} />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpen(false)}
            aria-label="Cerrar menu"
            className="text-primary-foreground/70 hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <X className="size-5" />
          </Button>
        </div>
        <SidebarNav items={items} onItemClick={() => setOpen(false)} />
        <SidebarFooter
          userEmail={userEmail}
          userRole={userRole}
          userAvatarUrl={userAvatarUrl}
          onOpenProfile={onOpenProfile}
          onOpenNotifications={onOpenNotifications}
          onLogout={onLogout}
          isLoggingOut={isLoggingOut}
          menuPlacement="inline"
        />
      </aside>
    </>
  )
}

export function AppShell({
  title,
  sidebarItems,
  userEmail,
  userRole,
  userAvatarUrl,
  onOpenProfile,
  onOpenNotifications,
  onLogout,
  isLoggingOut = false,
  headerExtras,
  children,
  className,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className={cn('flex min-h-screen bg-background', className)}>
      <DesktopSidebar
        title={title}
        items={sidebarItems}
        userEmail={userEmail}
        userRole={userRole}
        userAvatarUrl={userAvatarUrl}
        onOpenProfile={onOpenProfile}
        onOpenNotifications={onOpenNotifications}
        onLogout={onLogout}
        isLoggingOut={isLoggingOut}
        headerExtras={headerExtras}
      />

      <MobileSidebar
        open={mobileOpen}
        setOpen={setMobileOpen}
        title={title}
        items={sidebarItems}
        userEmail={userEmail}
        userRole={userRole}
        userAvatarUrl={userAvatarUrl}
        onOpenProfile={onOpenProfile}
        onOpenNotifications={onOpenNotifications}
        onLogout={onLogout}
        isLoggingOut={isLoggingOut}
        headerExtras={headerExtras}
      />

      <div className={cn('flex min-w-0 flex-1 flex-col', shellSidebarOffset)}>
        <header className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b bg-card/95 p-3 backdrop-blur md:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="size-5" />
          </Button>
          <span className="truncate text-sm font-black uppercase tracking-tight text-primary">{title}</span>
          <div className="flex min-w-0 items-center gap-2">
            {headerExtras}
            <span className="hidden max-w-[120px] truncate text-xs text-muted-foreground sm:inline">{userEmail}</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}

