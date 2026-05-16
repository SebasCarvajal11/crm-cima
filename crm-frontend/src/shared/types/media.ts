export type AvatarUploadResponse = {
  data: {
    version: number
    urls: Record<'64' | '256' | '512', string>
  }
}

export type CurrentAvatarResponse = {
  data: {
    version: number
    urls: Partial<Record<'64' | '256' | '512', string>>
  }
}

export type DocumentUploadResponse = {
  data: {
    objectKey: string
  }
}

export type UserAvatarsResponse = {
  data: {
    items: Record<
      string,
      {
        version: number
        urls: Partial<Record<'64' | '256' | '512', string>>
      }
    >
  }
}
