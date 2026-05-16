import { cn } from '@/shared/lib/utils'

type SectionIntroProps = {
  title: string
  description?: string
  className?: string
}

/** TÃ­tulo + descripciÃ³n reutilizable para bloques de pÃ¡gina (molÃ©cula). */
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

