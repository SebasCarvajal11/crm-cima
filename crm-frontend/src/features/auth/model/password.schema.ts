import { z } from 'zod'

export const strongPasswordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(
    /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    'Mayúscula, número y carácter especial (@$!%*?&)'
  )

