export const normalizePhone = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed.startsWith('+')) {
    const digits = trimmed.slice(1).replace(/\D/g, '')
    return `+${digits}`
  }
  return trimmed.replace(/\D/g, '')
}

export const isValidSerbianPhone = (value: string) => {
  const normalized = normalizePhone(value)
  if (!normalized) return false
  if (normalized.startsWith('+')) {
    if (!normalized.startsWith('+381')) return false
    const rest = normalized.slice(4)
    return /^[1-9]\d{7,8}$/.test(rest)
  }
  if (!normalized.startsWith('0')) return false
  const rest = normalized.slice(1)
  return /^[1-9]\d{7,8}$/.test(rest)
}
