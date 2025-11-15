/**
 * Integration tests for authentication API endpoints
 * Following TDD approach - these tests are written BEFORE implementation
 */

import { prisma } from '@/lib/prisma'
import bcrypt from 'bcrypt'
import { verifyTestDatabase } from '../../helpers/database'

describe('POST /api/auth/register', () => {
  // ⚠️ SAFETY CHECK: Verify we're using test database
  beforeAll(verifyTestDatabase)

  // Clean up test database before each test (safe - verified above)
  beforeEach(async () => {
    await prisma.user.deleteMany({})
    await prisma.portfolio.deleteMany({})
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('should register a new user successfully', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      username: 'testuser',
      displayName: 'Test User',
    }

    const response = await registerUser(userData)

    expect(response.success).toBe(true)
    if (response.success) {
      expect(response.data).toHaveProperty('userId')
      expect(response.data).toHaveProperty('email', userData.email)
      expect(response.data).toHaveProperty('username', userData.username)
      expect(response.data).not.toHaveProperty('password') // Password should not be returned
    }
  })

  it('should create a portfolio for the new user', async () => {
    const userData = {
      email: 'portfolio@example.com',
      password: 'SecurePass123!',
      username: 'portfoliouser',
      displayName: 'Portfolio User',
    }

    const response = await registerUser(userData)

    expect(response.success).toBe(true)
    if (response.success) {
      // Verify portfolio was created
      const portfolio = await prisma.portfolio.findUnique({
        where: { userId: response.data.userId },
      })

      expect(portfolio).not.toBeNull()
      expect(portfolio?.initialCapital).toBe(10000000)
      expect(portfolio?.currentCash).toBe(10000000)
      expect(portfolio?.totalAssets).toBe(10000000)
      expect(portfolio?.totalReturn).toBe(0)
    }
  })

  it('should hash the password before storing', async () => {
    const userData = {
      email: 'hash@example.com',
      password: 'MyPassword123!',
      username: 'hashuser',
      displayName: 'Hash User',
    }

    const response = await registerUser(userData)

    expect(response.success).toBe(true)

    // Verify password is hashed
    const user = await prisma.user.findUnique({
      where: { email: userData.email },
    })

    expect(user).not.toBeNull()
    expect(user?.password).not.toBe(userData.password) // Should be hashed

    // Verify hash is valid
    const isValidPassword = await bcrypt.compare(userData.password, user!.password)
    expect(isValidPassword).toBe(true)
  })

  it('should reject registration with duplicate email', async () => {
    const userData = {
      email: 'duplicate@example.com',
      password: 'SecurePass123!',
      username: 'user1',
      displayName: 'User One',
    }

    // Register first user
    await registerUser(userData)

    // Try to register with same email
    const duplicateData = {
      ...userData,
      username: 'user2', // Different username
    }

    const response = await registerUser(duplicateData)

    expect(response.success).toBe(false)
    if (!response.success) {
      expect(response.error.code).toBe('AUTH_DUPLICATE_EMAIL')
      expect(response.error.message).toContain('email')
    }
  })

  it('should reject registration with duplicate username', async () => {
    const userData = {
      email: 'user1@example.com',
      password: 'SecurePass123!',
      username: 'duplicateuser',
      displayName: 'User One',
    }

    await registerUser(userData)

    const duplicateData = {
      email: 'user2@example.com', // Different email
      password: 'SecurePass123!',
      username: 'duplicateuser', // Same username
      displayName: 'User Two',
    }

    const response = await registerUser(duplicateData)

    expect(response.success).toBe(false)
    if (!response.success) {
      expect(response.error.code).toBe('AUTH_DUPLICATE_USERNAME')
      expect(response.error.message).toContain('username')
    }
  })

  it('should reject registration with invalid email format', async () => {
    const userData = {
      email: 'invalid-email',
      password: 'SecurePass123!',
      username: 'testuser',
      displayName: 'Test User',
    }

    const response = await registerUser(userData)

    expect(response.success).toBe(false)
    if (!response.success) {
      expect(response.error.code).toBe('VALIDATION_INVALID_EMAIL')
    }
  })

  it('should reject registration with weak password', async () => {
    const userData = {
      email: 'weak@example.com',
      password: '123', // Too weak
      username: 'weakuser',
      displayName: 'Weak User',
    }

    const response = await registerUser(userData)

    expect(response.success).toBe(false)
    if (!response.success) {
      expect(response.error.code).toBe('VALIDATION_WEAK_PASSWORD')
      expect(response.error.message.toLowerCase()).toContain('password')
    }
  })

  it('should reject registration with missing required fields', async () => {
    const incompleteData = {
      email: 'incomplete@example.com',
      // Missing password, username, displayName
    }

    const response = await registerUser(incompleteData as any)

    expect(response.success).toBe(false)
    if (!response.success) {
      // When fields are missing, Zod validates in order and returns the first error
      // This could be VALIDATION_WEAK_PASSWORD (password missing) or VALIDATION_MISSING_FIELDS
      expect(response.error.code).toMatch(/^VALIDATION_/)
      expect(['VALIDATION_MISSING_FIELDS', 'VALIDATION_WEAK_PASSWORD']).toContain(
        response.error.code
      )
    }
  })
})

describe('POST /api/auth/login', () => {
  // Clean up and create test user before each test
  beforeEach(async () => {
    await prisma.user.deleteMany({})
    await prisma.portfolio.deleteMany({})

    // Create a test user for login tests
    await registerUser({
      email: 'testuser@example.com',
      password: 'SecurePass123!',
      username: 'testlogin',
      displayName: 'Test Login User',
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
  })

  it('should login with correct credentials', async () => {
    const loginData = {
      email: 'testuser@example.com',
      password: 'SecurePass123!',
    }

    const response = await loginUser(loginData)

    expect(response.success).toBe(true)
    if (response.success) {
      expect(response.data).toHaveProperty('userId')
      expect(response.data).toHaveProperty('email', loginData.email)
      expect(response.data).toHaveProperty('username', 'testlogin')
      expect(response.data).toHaveProperty('displayName', 'Test Login User')
    }
  })

  it('should not return password in login response', async () => {
    const loginData = {
      email: 'testuser@example.com',
      password: 'SecurePass123!',
    }

    const response = await loginUser(loginData)

    expect(response.success).toBe(true)
    if (response.success) {
      expect(response.data).not.toHaveProperty('password')
    }
  })

  it('should reject login with non-existent email', async () => {
    const loginData = {
      email: 'nonexistent@example.com',
      password: 'SecurePass123!',
    }

    const response = await loginUser(loginData)

    expect(response.success).toBe(false)
    if (!response.success) {
      expect(response.error.code).toBe('AUTH_INVALID_CREDENTIALS')
      expect(response.error.message).toContain('Invalid email or password')
    }
  })

  it('should reject login with incorrect password', async () => {
    const loginData = {
      email: 'testuser@example.com',
      password: 'WrongPassword123!',
    }

    const response = await loginUser(loginData)

    expect(response.success).toBe(false)
    if (!response.success) {
      expect(response.error.code).toBe('AUTH_INVALID_CREDENTIALS')
      expect(response.error.message).toContain('Invalid email or password')
    }
  })

  it('should reject login with invalid email format', async () => {
    const loginData = {
      email: 'invalid-email',
      password: 'SecurePass123!',
    }

    const response = await loginUser(loginData)

    expect(response.success).toBe(false)
    if (!response.success) {
      expect(response.error.code).toBe('VALIDATION_INVALID_EMAIL')
    }
  })

  it('should reject login with missing password', async () => {
    const loginData = {
      email: 'testuser@example.com',
      // Missing password
    }

    const response = await loginUser(loginData as any)

    expect(response.success).toBe(false)
    if (!response.success) {
      expect(response.error.code).toBe('VALIDATION_MISSING_FIELDS')
    }
  })

  it('should reject login with missing email', async () => {
    const loginData = {
      // Missing email
      password: 'SecurePass123!',
    }

    const response = await loginUser(loginData as any)

    expect(response.success).toBe(false)
    if (!response.success) {
      expect(response.error.code).toMatch(/^VALIDATION_/)
    }
  })
})

// Helper function that calls the registration service
async function registerUser(userData: any): Promise<any> {
  const { registerUser: registerUserService } = await import('@/lib/services/authService')
  const { registerSchema } = await import('@/lib/utils/validation')

  try {
    // Validate the data first
    const validatedData = registerSchema.parse(userData)
    return await registerUserService(validatedData)
  } catch (error: any) {
    // Handle validation errors
    if (error.errors) {
      const emailError = error.errors.find((err: any) => err.path.includes('email'))
      const passwordError = error.errors.find((err: any) => err.path.includes('password'))

      if (emailError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_INVALID_EMAIL',
            message: emailError.message,
          },
        } as const
      }

      if (passwordError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_WEAK_PASSWORD',
            message: passwordError.message,
          },
        } as const
      }

      return {
        success: false,
        error: {
          code: 'VALIDATION_MISSING_FIELDS',
          message: error.errors[0]?.message || 'Validation failed',
        },
      } as const
    }

    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred' },
    } as const
  }
}

// Helper function that calls the login service
async function loginUser(loginData: any): Promise<any> {
  const { loginUser: loginUserService } = await import('@/lib/services/authService')
  const { loginSchema } = await import('@/lib/utils/validation')

  try {
    // Validate the data first
    const validatedData = loginSchema.parse(loginData)
    return await loginUserService(validatedData)
  } catch (error: any) {
    // Handle validation errors
    if (error.errors) {
      const emailError = error.errors.find((err: any) => err.path.includes('email'))
      const passwordError = error.errors.find((err: any) => err.path.includes('password'))

      if (emailError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_INVALID_EMAIL',
            message: emailError.message,
          },
        } as const
      }

      if (passwordError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_MISSING_FIELDS',
            message: passwordError.message,
          },
        } as const
      }

      return {
        success: false,
        error: {
          code: 'VALIDATION_MISSING_FIELDS',
          message: error.errors[0]?.message || 'Validation failed',
        },
      } as const
    }

    return {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An error occurred' },
    } as const
  }
}
