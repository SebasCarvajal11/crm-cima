import type { ReactNode } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type AuthCardLayoutProps = {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}

/** Plantilla centrada para flujos públicos de auth (plantilla). */
export function AuthCardLayout({
  title,
  description,
  children,
  footer,
}: AuthCardLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
      {footer ? (
        <p className="text-center text-sm text-muted-foreground">{footer}</p>
      ) : null}
    </div>
  )
}
