export type UserRole = 'admin' | 'worker' | 'client'

export type IdentityUser = {
  id: string
  email: string
  role: UserRole
  first_name: string | null
  last_name: string | null
  client_kind: 'natural' | 'juridical' | null
  company_name: string | null
  profession: string | null
  emailVerifiedAt: string | null
  force_password_change?: boolean
}

export type ClientSearchResult = {
  subject: string
  email: string
  role: UserRole
}

export type MeResponse = {
  data: IdentityUser
}
