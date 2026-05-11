import { cn } from '@/lib/utils'

type SectionIntroProps = {
  title: string
  description?: string
  className?: string
}

/** Título + descripción reutilizable para bloques de página (molécula). */
export function SectionIntro({ title, description, className }: SectionIntroProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}
