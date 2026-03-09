import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCookies = vi.fn()
const mockHeaders = vi.fn()
const mockCreateServerClient = vi.fn()

vi.mock('next/headers', () => ({
  cookies: mockCookies,
  headers: mockHeaders,
}))

vi.mock('@/lib/supabase-server', () => ({
  createServerClient: mockCreateServerClient,
}))

describe('login actions', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'catlg.ru')
  })

  it('setServerSession writes auth cookies with the shared root-domain scope', async () => {
    const cookieStore = {
      set: vi.fn(),
    }

    mockCookies.mockResolvedValue(cookieStore)
    mockHeaders.mockResolvedValue({
      get: vi.fn().mockReturnValue('acme.catlg.ru'),
    })

    const { setServerSession } = await import('./actions')
    await setServerSession('access-token', 'refresh-token')

    expect(cookieStore.set).toHaveBeenNthCalledWith(
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
    expect(cookieStore.set).toHaveBeenNthCalledWith(
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
  })

  it('logout clears auth cookies with the same scope and signs out from supabase', async () => {
    const cookieStore = {
      set: vi.fn(),
    }
    const signOut = vi.fn().mockResolvedValue({ error: null })

    mockCookies.mockResolvedValue(cookieStore)
    mockHeaders.mockResolvedValue({
      get: vi.fn().mockReturnValue('acme.catlg.ru'),
    })
    mockCreateServerClient.mockResolvedValue({
      auth: {
        signOut,
      },
    })

    const { logout } = await import('./actions')
    await logout()

    expect(cookieStore.set).toHaveBeenNthCalledWith(
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
    expect(cookieStore.set).toHaveBeenNthCalledWith(
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
    expect(signOut).toHaveBeenCalledTimes(1)
  })

  it('logout also clears root-domain auth cookies on the root host', async () => {
    const cookieStore = {
      set: vi.fn(),
    }
    const signOut = vi.fn().mockResolvedValue({ error: null })

    mockCookies.mockResolvedValue(cookieStore)
    mockHeaders.mockResolvedValue({
      get: vi.fn().mockReturnValue('catlg.ru'),
    })
    mockCreateServerClient.mockResolvedValue({
      auth: {
        signOut,
      },
    })

    const { logout } = await import('./actions')
    await logout()

    expect(cookieStore.set).toHaveBeenNthCalledWith(
      1,
      'sb-access-token',
      '',
      expect.objectContaining({
        domain: '.catlg.ru',
        path: '/',
        maxAge: 0,
      })
    )
    expect(cookieStore.set).toHaveBeenNthCalledWith(
      2,
      'sb-refresh-token',
      '',
      expect.objectContaining({
        domain: '.catlg.ru',
        path: '/',
        maxAge: 0,
      })
    )
    expect(signOut).toHaveBeenCalledTimes(1)
  })
})
