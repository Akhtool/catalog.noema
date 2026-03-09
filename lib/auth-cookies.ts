import type { Session } from '@supabase/supabase-js'

import { getRootDomain, normalizeHost } from '@/lib/host'

export const ACCESS_TOKEN_COOKIE_NAME = 'sb-access-token'
export const REFRESH_TOKEN_COOKIE_NAME = 'sb-refresh-token'

const ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7
const REFRESH_TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

type CookieTarget = {
  set: (
    name: string,
    value: string,
    options?: {
      domain?: string
      httpOnly?: boolean
      maxAge?: number
      path?: string
      sameSite?: 'lax'
      secure?: boolean
    }
  ) => unknown
}

function getCookieDomain(host: string | null | undefined): string | undefined {
  const normalizedHost = normalizeHost(host ?? null)
  const rootDomain = getRootDomain()

  if (!normalizedHost) return undefined
  if (normalizedHost === rootDomain || normalizedHost.endsWith(`.${rootDomain}`)) {
    return `.${rootDomain}`
  }

  return undefined
}

function getBaseCookieOptions(host: string | null | undefined) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    domain: getCookieDomain(host),
  }
}

export function writeServerSessionCookies(
  target: CookieTarget,
  session: Pick<Session, 'access_token' | 'refresh_token'>,
  host: string | null | undefined
) {
  const options = getBaseCookieOptions(host)

  target.set(ACCESS_TOKEN_COOKIE_NAME, session.access_token, {
    ...options,
    maxAge: ACCESS_TOKEN_MAX_AGE_SECONDS,
  })

  target.set(REFRESH_TOKEN_COOKIE_NAME, session.refresh_token, {
    ...options,
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
  })
}

export function clearServerSessionCookies(target: CookieTarget, host: string | null | undefined) {
  const options = getBaseCookieOptions(host)

  target.set(ACCESS_TOKEN_COOKIE_NAME, '', {
    ...options,
    maxAge: 0,
  })

  target.set(REFRESH_TOKEN_COOKIE_NAME, '', {
    ...options,
    maxAge: 0,
  })
}

