export const BLOCKED_EXTENSIONS = new Set([
  'exe', 'msi', 'dll', 'bat', 'cmd', 'com', 'scr', 'pif', 'cpl', 'jar', 'js', 'jse', 'vbs', 'vbe', 'wsf', 'wsh',
  'ps1', 'psm1', 'psd1', 'sh', 'bash', 'zsh', 'ksh', 'php', 'phar', 'hta', 'lnk', 'reg', 'iso', 'img',
])

export const SAFE_FILE_ACCEPT =
  'image/*,video/*,audio/*,text/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.zip,.rar,.7z,.tar,.gz,.json,.xml,.md'

export function isBlockedByExtension(fileName: string) {
  const idx = fileName.lastIndexOf('.')
  if (idx < 0 || idx === fileName.length - 1) return false
  return BLOCKED_EXTENSIONS.has(fileName.slice(idx + 1).toLowerCase())
}
