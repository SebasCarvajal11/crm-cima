import { createRootRoute, Outlet } from '@tanstack/react-router'

/**
 * Raiz del router. La fuente predeterminada se aplica en index.css via `font-sans`
 * en el `body`. Este wrapper garantiza la estructura base de pantalla completa.
 */
export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-background">
      <Outlet />
    </div>
  ),
})
