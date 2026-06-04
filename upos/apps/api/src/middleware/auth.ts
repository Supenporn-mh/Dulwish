import { Elysia } from 'elysia'
import jwt from 'jsonwebtoken'
import type { UserRole } from '@upos/shared-types'
import { User } from '../models'

const JWT_SECRET = process.env.JWT_SECRET ?? 'upos_super_secret_jwt_2026_dulwich'

export interface JwtPayload {
  userId: string
  role: UserRole
  uid: string
}

export function signAccessToken(payload: JwtPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' })
}

export function signRefreshToken(payload: JwtPayload) {
  const REFRESH = process.env.JWT_REFRESH_SECRET ?? 'upos_refresh_secret_jwt_2026'
  return jwt.sign(payload, REFRESH, { expiresIn: '7d' })
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload
}

export function verifyRefreshToken(token: string): JwtPayload {
  const REFRESH = process.env.JWT_REFRESH_SECRET ?? 'upos_refresh_secret_jwt_2026'
  return jwt.verify(token, REFRESH) as JwtPayload
}

// Elysia plugin — attaches `user` to context, guards by allowed roles
export function authPlugin(allowedRoles?: UserRole[]) {
  return new Elysia()
    .derive({ as: 'scoped' }, async ({ headers, set }) => {
      const authHeader = headers.authorization
      if (!authHeader?.startsWith('Bearer ')) {
        set.status = 401
        throw new Error('UNAUTHORIZED')
      }
      const token = authHeader.slice(7)
      try {
        const payload = verifyAccessToken(token)
        if (allowedRoles && !allowedRoles.includes(payload.role)) {
          set.status = 403
          throw new Error('FORBIDDEN')
        }
        const user = await User.findById(payload.userId).lean()
        if (!user || user.status !== 'active') {
          set.status = 401
          throw new Error('UNAUTHORIZED')
        }
        return { currentUser: user, jwtPayload: payload }
      } catch (err: unknown) {
        set.status = 401
        const msg = err instanceof Error ? err.message : 'UNAUTHORIZED'
        throw new Error(msg)
      }
    })
}
