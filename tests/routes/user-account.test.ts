import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Clerk auth and client
const mockDeleteUser = vi.fn()
const mockClerkClient = vi.fn(() => ({
  users: {
    deleteUser: mockDeleteUser
  }
}))

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(async () => ({ userId: 'test-clerk-user-id' })),
  clerkClient: mockClerkClient
}))

// Mock database functions
const mockDeleteUserByClerkId = vi.fn()
vi.mock('@/lib/db', () => ({
  deleteUserByClerkId: mockDeleteUserByClerkId
}))

// Mock subscription functions
let mockSubscription: any = null
vi.mock('@/lib/subscription', () => ({
  getCurrentSubscription: vi.fn(async () => mockSubscription)
}))

describe('DELETE /api/user/account', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSubscription = null
  })

  it('returns 409 when user has active subscription', async () => {
    // Set up active subscription
    mockSubscription = {
      status: 'active',
      plan: 'pro',
      periodEnd: new Date('2025-12-31')
    }

    const mod = await import('@/app/api/user/account/route')
    const req = new Request('http://localhost/api/user/account', { method: 'DELETE' }) as any
    const resp = await mod.DELETE()
    const json = await resp.json()

    expect(resp.status).toBe(409)
    expect(json.error).toBe('Cannot delete account with active subscription')
    expect(json.message).toContain('Please cancel your subscription')
    expect(json.subscription.status).toBe('active')
    expect(json.subscription.plan).toBe('pro')
    
    // Ensure deletion functions were NOT called
    expect(mockDeleteUserByClerkId).not.toHaveBeenCalled()
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })

  it('returns 409 when user has trialing subscription', async () => {
    // Set up trialing subscription
    mockSubscription = {
      status: 'trialing',
      plan: 'pro',
      periodEnd: new Date('2025-11-30')
    }

    const mod = await import('@/app/api/user/account/route')
    const req = new Request('http://localhost/api/user/account', { method: 'DELETE' }) as any
    const resp = await mod.DELETE()
    const json = await resp.json()

    expect(resp.status).toBe(409)
    expect(json.error).toBe('Cannot delete account with active subscription')
    expect(json.subscription.status).toBe('trialing')
    
    // Ensure deletion functions were NOT called
    expect(mockDeleteUserByClerkId).not.toHaveBeenCalled()
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })

  it('allows deletion when subscription is free', async () => {
    // Set up free subscription
    mockSubscription = {
      status: 'free',
      plan: 'free'
    }

    mockDeleteUserByClerkId.mockResolvedValueOnce({ id: 'db-user-id' })
    mockDeleteUser.mockResolvedValueOnce(undefined)

    const mod = await import('@/app/api/user/account/route')
    const req = new Request('http://localhost/api/user/account', { method: 'DELETE' }) as any
    const resp = await mod.DELETE()
    const json = await resp.json()

    expect(resp.status).toBe(200)
    expect(json.success).toBe(true)
    expect(json.message).toBe('Account deleted successfully')
    
    // Ensure deletion functions were called
    expect(mockDeleteUserByClerkId).toHaveBeenCalledWith('test-clerk-user-id')
    expect(mockDeleteUser).toHaveBeenCalledWith('test-clerk-user-id')
  })

  it('allows deletion when subscription is canceled', async () => {
    // Set up canceled subscription
    mockSubscription = {
      status: 'canceled',
      plan: 'pro',
      periodEnd: new Date('2025-01-01')
    }

    mockDeleteUserByClerkId.mockResolvedValueOnce({ id: 'db-user-id' })
    mockDeleteUser.mockResolvedValueOnce(undefined)

    const mod = await import('@/app/api/user/account/route')
    const req = new Request('http://localhost/api/user/account', { method: 'DELETE' }) as any
    const resp = await mod.DELETE()
    const json = await resp.json()

    expect(resp.status).toBe(200)
    expect(json.success).toBe(true)
    
    // Ensure deletion functions were called
    expect(mockDeleteUserByClerkId).toHaveBeenCalledWith('test-clerk-user-id')
    expect(mockDeleteUser).toHaveBeenCalledWith('test-clerk-user-id')
  })

  it('allows deletion when subscription is past_due', async () => {
    // Set up past_due subscription
    mockSubscription = {
      status: 'past_due',
      plan: 'pro',
      periodEnd: new Date('2024-12-01')
    }

    mockDeleteUserByClerkId.mockResolvedValueOnce({ id: 'db-user-id' })
    mockDeleteUser.mockResolvedValueOnce(undefined)

    const mod = await import('@/app/api/user/account/route')
    const req = new Request('http://localhost/api/user/account', { method: 'DELETE' }) as any
    const resp = await mod.DELETE()
    const json = await resp.json()

    expect(resp.status).toBe(200)
    expect(json.success).toBe(true)
    
    // Ensure deletion functions were called
    expect(mockDeleteUserByClerkId).toHaveBeenCalledWith('test-clerk-user-id')
    expect(mockDeleteUser).toHaveBeenCalledWith('test-clerk-user-id')
  })

  it('returns 500 when subscription status cannot be retrieved', async () => {
    // Set subscription to null to simulate retrieval failure
    mockSubscription = null

    const mod = await import('@/app/api/user/account/route')
    const req = new Request('http://localhost/api/user/account', { method: 'DELETE' }) as any
    const resp = await mod.DELETE()
    const json = await resp.json()

    expect(resp.status).toBe(500)
    expect(json.error).toBe('Unable to verify subscription status. Please try again.')
    
    // Ensure deletion functions were NOT called
    expect(mockDeleteUserByClerkId).not.toHaveBeenCalled()
    expect(mockDeleteUser).not.toHaveBeenCalled()
  })
})

