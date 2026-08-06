import { DomainError } from '../types/errors.js'

export const parseId = (raw: string | string[] | undefined): number => {
  const value = Array.isArray(raw) ? raw[0] : raw
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) {
    throw new DomainError('INVALID_ID', '无效的 id', 400)
  }
  return id
}
