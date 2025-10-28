import { z } from 'zod'

/**
 * Validation schema for user registration
 */
export const registerSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  password: z
    .string()
    .min(8, { message: 'Password must be at least 8 characters' })
    .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
    .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
    .regex(/[0-9]/, { message: 'Password must contain at least one number' }),
  username: z
    .string()
    .min(3, { message: 'Username must be at least 3 characters' })
    .max(20, { message: 'Username must be at most 20 characters' })
    .regex(/^[a-zA-Z0-9_]+$/, {
      message: 'Username can only contain letters, numbers, and underscores',
    }),
  displayName: z
    .string()
    .min(1, { message: 'Display name is required' })
    .max(50, { message: 'Display name must be at most 50 characters' }),
})

export type RegisterInput = z.infer<typeof registerSchema>

/**
 * Validation schema for user login
 */
export const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email format' }),
  password: z.string().min(1, { message: 'Password is required' }),
})

export type LoginInput = z.infer<typeof loginSchema>
