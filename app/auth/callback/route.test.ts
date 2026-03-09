import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockCreateServerClient = vi.fn()
const mockGetBusinessSlugForUser = vi.fn()
const mockResolveRedirectAfterLogin = vi.fn()
const mockRedirect = vi.fn()

vi.mock('@/lib/supabase-server', () => ({
  createServerClient: mockCreateServerClient,
}))

vi.mock('@/lib/auth-redirect', () => ({
  getBusinessSlugForUser: mockGetBusinessSlugForUser,
  resolveRedirectAfterLogin: mockResolveRedirectAfterLogin,
}))

vi.mock('next/server', () => ({
  NextResponse: {
    redirect: mockRedirect,
  },
}))

describe('auth callback route', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubEnv('NEXT_PUBLIC_ROOT_DOMAIN', 'catlg.ru')

    mockRedirect.mockImplementation((url: URL) => ({
      redirectUrl: url.toString(),
      cookies: {
        set: vi.fn(),
      },
    }))
  })

  it('persists SSR auth cookies after a successful callback', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null })

    mockCreateServerClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({ error: null }),
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: 'access-token',
              refresh_token: 'refresh-token',
            },
          },
        }),
        getUser: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: 'user-1',
              email: 'owner@acme.test',
              user_metadata: {
                full_name: 'Owner',
              },
            },
          },
        }),
      },
      from: vi.fn().mockReturnValue({
        upsert,
      }),
    })
    mockGetBusinessSlugForUser.mockResolvedValue('acme')
    mockResolveRedirectAfterLogin.mockReturnValue('https://acme.catlg.ru')

    const { GET } = await import('./route')
    const response = await GET(new Request('https://catlg.ru/auth/callback?code=abc'))
    const mockedResponse = response as unknown as {
      redirectUrl: string
      cookies: { set: ReturnType<typeof vi.fn> }
    }

    expect(mockResolveRedirectAfterLogin).toHaveBeenCalledWith({
      slug: 'acme',
      protocol: 'https',
      port: null,
      host: 'catlg.ru',
    })
    expect(mockedResponse.redirectUrl).toBe('https://acme.catlg.ru/')
    expect(mockedResponse.cookies.set).toHaveBeenNthCalledWith(
      1,
      'sb-access-token',
      'access-token',
      expect.objectContaining({
        domain: '.catlg.ru',
        path: '/',
        maxAge: 604800,
      })
    )
    expect(mockedResponse.cookies.set).toHaveBeenNthCalledWith(
      2,
      'sb-refresh-token',
      'refresh-token',
      expect.objectContaining({
        domain: '.catlg.ru',
        path: '/',
        maxAge: 2592000,
      })
    )
    expect(upsert).toHaveBeenCalledTimes(1)
  })

  it('redirects to auth_failed when the callback code exchange fails', async () => {
    mockCreateServerClient.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({
          error: new Error('exchange failed'),
        }),
      },
    })

    const { GET } = await import('./route')
    const response = await GET(new Request('https://catlg.ru/auth/callback?code=abc'))
    const mockedResponse = response as unknown as { redirectUrl: string }

    expect(mockedResponse.redirectUrl).toBe('https://catlg.ru/login?error=auth_failed')
  })
})
