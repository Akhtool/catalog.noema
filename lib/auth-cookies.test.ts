import { describe, expect, it, vi } from 'vitest'

import { clearServerSessionCookies, writeServerSessionCookies } from './auth-cookies'

describe('auth cookie helpers', () => {
  it('writes domain-scoped auth cookies for root-zone hosts', () => {
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'catlg.ru')

    const target = {
      set: vi.fn(),
    }

    writeServerSessionCookies(
      target,
      {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      },
      'acme.catlg.ru'
    )

    expect(target.set).toHaveBeenNthCalledWith(
      1,
      'sb-access-token',
      'access-token',
      expect.objectContaining({
        domain: '.catlg.ru',
        path: '/',
        sameSite: 'lax',
        httpOnly: true,
        maxAge: 604800,
      })
    )
    expect(target.set).toHaveBeenNthCalledWith(
      2,
      'sb-refresh-token',
      'refresh-token',
      expect.objectContaining({
        domain: '.catlg.ru',
        path: '/',
        sameSite: 'lax',
        httpOnly: true,
        maxAge: 2592000,
      })
    )

    vi.unstubAllEnvs()
  })

  it('clears auth cookies with the same domain/path contract', () => {
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'catlg.ru')

    const target = {
      set: vi.fn(),
    }

    clearServerSessionCookies(target, 'catlg.ru')

    expect(target.set).toHaveBeenNthCalledWith(
      1,
      'sb-access-token',
      '',
      expect.objectContaining({
        domain: '.catlg.ru',
        path: '/',
        sameSite: 'lax',
        httpOnly: true,
        maxAge: 0,
      })
    )
    expect(target.set).toHaveBeenNthCalledWith(
      2,
      'sb-refresh-token',
      '',
      expect.objectContaining({
        domain: '.catlg.ru',
        path: '/',
        sameSite: 'lax',
        httpOnly: true,
        maxAge: 0,
      })
    )

    vi.unstubAllEnvs()
  })
})
