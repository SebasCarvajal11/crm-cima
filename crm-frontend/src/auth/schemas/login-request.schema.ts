import { z } from 'zod'

/**
 * Validación del cuerpo de `POST /auth/login`.
 * Reglas equivalentes a `components.schemas.LoginRequest` del OpenAPI servido por el gateway
 * (`{base}/openapi.yaml`). Si el backend cambia el contrato, actualiza este esquema o regenera
 * tipos desde OpenAPI cuando incorpores codegen en este paquete.
 */
export const loginRequestSchema = z.object({
  email: z
    .string()
    .email({ message: 'Correo no válido' })
    .max(255, { message: 'El correo es demasiado largo' }),
  password: z
    .string()
    .min(8, { message: 'La contraseña debe tener al menos 8 caracteres' }),
})

export type LoginRequestValues = z.infer<typeof loginRequestSchema>
