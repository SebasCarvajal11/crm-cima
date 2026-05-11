import { createRootRoute, Outlet } from '@tanstack/react-router'
import { GridPattern } from '@/components/ui/grid-pattern'

/**
 * Raiz del router. La fuente predeterminada se aplica en index.css via `font-sans`
 * en el `body`. Este wrapper garantiza la estructura base de pantalla completa.
 */
export const Route = createRootRoute({
  component: () => (
    <div className="relative min-h-screen bg-background">
      <GridPattern
        width={30}
        height={30}
        x={-1}
        y={-1}
        strokeDasharray={"4 2"}
        className="[mask-image:radial-gradient(1000px_circle_at_center,white,transparent)] opacity-40"
      />
      <div className="relative z-10">
        <Outlet />
      </div>
    </div>
  ),
})
