import { isHTTPError } from 'ky'
/** Cuerpo cuando la validación JSON falla en el backend (p. ej. validador Zod en el servicio). */
type ZodValidatorFailureBody = {
  success: false
  error?: {
    name?: string
    message?: string
  }
}

function messageFromZodValidatorBody(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const o = data as ZodValidatorFailureBody
  if (o.success !== false || !o.error?.message) return null
  try {
    const parsed = JSON.parse(o.error.message) as unknown
    if (Array.isArray(parsed) && parsed.length > 0) {
      const first = parsed[0] as { message?: string }
      if (typeof first?.message === 'string' && first.message.length > 0) {
        return first.message
      }
    }
  } catch {
    /* message no es JSON de issues */
  }
  if (typeof o.error.message === 'string' && o.error.message.length > 0) {
    return o.error.message
  }
  return null
}

function messageFromApiShape(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const o = data as Record<string, unknown>
  if (typeof o.error === 'string' && o.error.length > 0) return o.error
  return null
}

async function readJsonPayload(response: Response): Promise<unknown> {
  const text = await response.text()
  const trimmed = text.trim()
  if (!trimmed) return null
  try {
    return JSON.parse(trimmed) as unknown
  } catch {
    return null
  }
}

function fallbackMessageForStatus(status: number): string | null {
  switch (status) {
    case 401:
      return 'No se pudo iniciar sesión. Revisa correo y contraseña.'
    case 403:
      return 'No tienes permiso para esta operación.'
    case 429:
      return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.'
    default:
      return null
  }
}

/** Mensaje legible desde `{ error: string }`, validación Zod o fallback por código HTTP. */
export async function parseApiError(error: unknown): Promise<string> {
  if (isHTTPError(error)) {
    const status = error.response.status
    try {
      const raw = await readJsonPayload(error.response.clone())
      const fromZod = messageFromZodValidatorBody(raw)
      if (fromZod) return fromZod
      const fromApi = messageFromApiShape(raw)
      if (fromApi) return fromApi
    } catch {
      /* sin cuerpo parseable */
    }
    const fb = fallbackMessageForStatus(status)
    if (fb) return fb
    return error.message || `Error HTTP ${status}`
  }
  if (error instanceof Error) return error.message
  return 'Error desconocido'
}
