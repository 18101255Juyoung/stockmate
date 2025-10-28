/**
 * Unit tests for financial calculation utilities
 * Tests core business logic for trading and portfolio management
 */

import {
  calculateTotalAssets,
  calculateTotalReturn,
  calculateAvgPrice,
  calculateUnrealizedPL,
  calculateRealizedPL,
  calculateTradingFee,
} from '@/lib/utils/calculations'

describe('Financial Calculations', () => {
  describe('calculateTotalAssets', () => {
    it('should calculate total assets correctly', () => {
      const cash = 5000000
      const holdings = [
        { quantity: 10, currentPrice: 70000 }, // 700,000
        { quantity: 5, currentPrice: 50000 }, // 250,000
      ]

      const total = calculateTotalAssets(cash, holdings)

      expect(total).toBe(5950000) // 5,000,000 + 700,000 + 250,000
    })

    it('should return cash only if no holdings', () => {
      const total = calculateTotalAssets(10000000, [])
      expect(total).toBe(10000000)
    })

    it('should handle zero cash', () => {
      const holdings = [{ quantity: 10, currentPrice: 70000 }]
      const total = calculateTotalAssets(0, holdings)
      expect(total).toBe(700000)
    })

    it('should handle fractional prices', () => {
      const cash = 1000000
      const holdings = [{ quantity: 100, currentPrice: 12345.67 }]
      const total = calculateTotalAssets(cash, holdings)
      expect(total).toBe(2234567) // 1,000,000 + 1,234,567
    })
  })

  describe('calculateTotalReturn', () => {
    it('should calculate positive return correctly', () => {
      const totalAssets = 11000000
      const initialCapital = 10000000

      const returnRate = calculateTotalReturn(totalAssets, initialCapital)

      expect(returnRate).toBe(10) // 10% profit
    })

    it('should calculate negative return correctly', () => {
      const totalAssets = 9000000
      const initialCapital = 10000000

      const returnRate = calculateTotalReturn(totalAssets, initialCapital)

      expect(returnRate).toBe(-10) // 10% loss
    })

    it('should return 0% for no change', () => {
      const returnRate = calculateTotalReturn(10000000, 10000000)
      expect(returnRate).toBe(0)
    })

    it('should handle fractional returns', () => {
      const totalAssets = 10123456
      const initialCapital = 10000000

      const returnRate = calculateTotalReturn(totalAssets, initialCapital)

      expect(returnRate).toBeCloseTo(1.23, 2) // ~1.23%
    })

    it('should return 0 if initial capital is 0', () => {
      const returnRate = calculateTotalReturn(5000000, 0)
      expect(returnRate).toBe(0)
    })
  })

  describe('calculateAvgPrice (FIFO)', () => {
    it('should return new price for first purchase', () => {
      const avgPrice = calculateAvgPrice(0, 0, 10, 70000)
      expect(avgPrice).toBe(70000)
    })

    it('should calculate average for additional purchase at same price', () => {
      const avgPrice = calculateAvgPrice(10, 70000, 10, 70000)
      expect(avgPrice).toBe(70000)
    })

    it('should calculate average for additional purchase at higher price', () => {
      // Initial: 10 shares @ 70,000 = 700,000
      // Buy: 10 shares @ 80,000 = 800,000
      // Total: 20 shares @ 1,500,000
      // Average: 75,000
      const avgPrice = calculateAvgPrice(10, 70000, 10, 80000)
      expect(avgPrice).toBe(75000)
    })

    it('should calculate average for additional purchase at lower price', () => {
      // Initial: 10 shares @ 70,000 = 700,000
      // Buy: 10 shares @ 60,000 = 600,000
      // Total: 20 shares @ 1,300,000
      // Average: 65,000
      const avgPrice = calculateAvgPrice(10, 70000, 10, 60000)
      expect(avgPrice).toBe(65000)
    })

    it('should handle unequal quantities', () => {
      // Initial: 10 shares @ 70,000 = 700,000
      // Buy: 5 shares @ 80,000 = 400,000
      // Total: 15 shares @ 1,100,000
      // Average: 73,333.33...
      const avgPrice = calculateAvgPrice(10, 70000, 5, 80000)
      expect(avgPrice).toBeCloseTo(73333.33, 2)
    })

    it('should handle fractional prices', () => {
      const avgPrice = calculateAvgPrice(100, 12345.67, 50, 23456.78)
      const expected = (100 * 12345.67 + 50 * 23456.78) / 150
      expect(avgPrice).toBeCloseTo(expected, 2)
    })

    it('should round to 2 decimal places', () => {
      const avgPrice = calculateAvgPrice(3, 10000, 1, 10001)
      expect(avgPrice).toBe(10000.25) // (30000 + 10001) / 4 = 10000.25
    })
  })

  describe('calculateUnrealizedPL', () => {
    it('should calculate unrealized profit', () => {
      const holdings = [
        { quantity: 10, avgPrice: 70000, currentPrice: 75000 }, // +50,000
        { quantity: 5, avgPrice: 50000, currentPrice: 55000 }, // +25,000
      ]

      const unrealizedPL = calculateUnrealizedPL(holdings)
      expect(unrealizedPL).toBe(75000) // Total: +75,000
    })

    it('should calculate unrealized loss', () => {
      const holdings = [
        { quantity: 10, avgPrice: 70000, currentPrice: 65000 }, // -50,000
        { quantity: 5, avgPrice: 50000, currentPrice: 45000 }, // -25,000
      ]

      const unrealizedPL = calculateUnrealizedPL(holdings)
      expect(unrealizedPL).toBe(-75000) // Total: -75,000
    })

    it('should return 0 for no holdings', () => {
      const unrealizedPL = calculateUnrealizedPL([])
      expect(unrealizedPL).toBe(0)
    })

    it('should return 0 when prices are equal', () => {
      const holdings = [{ quantity: 10, avgPrice: 70000, currentPrice: 70000 }]
      const unrealizedPL = calculateUnrealizedPL(holdings)
      expect(unrealizedPL).toBe(0)
    })

    it('should handle mixed profit and loss', () => {
      const holdings = [
        { quantity: 10, avgPrice: 70000, currentPrice: 75000 }, // +50,000
        { quantity: 5, avgPrice: 50000, currentPrice: 45000 }, // -25,000
      ]

      const unrealizedPL = calculateUnrealizedPL(holdings)
      expect(unrealizedPL).toBe(25000) // Net: +25,000
    })
  })

  describe('calculateRealizedPL', () => {
    it('should calculate realized profit on sell', () => {
      const avgPrice = 70000
      const sellPrice = 75000
      const quantity = 10

      const realizedPL = calculateRealizedPL(avgPrice, sellPrice, quantity)
      expect(realizedPL).toBe(50000) // (75,000 - 70,000) × 10
    })

    it('should calculate realized loss on sell', () => {
      const avgPrice = 70000
      const sellPrice = 65000
      const quantity = 10

      const realizedPL = calculateRealizedPL(avgPrice, sellPrice, quantity)
      expect(realizedPL).toBe(-50000) // (65,000 - 70,000) × 10
    })

    it('should return 0 if sold at same price', () => {
      const realizedPL = calculateRealizedPL(70000, 70000, 10)
      expect(realizedPL).toBe(0)
    })

    it('should handle fractional calculations', () => {
      const realizedPL = calculateRealizedPL(12345.67, 23456.78, 100)
      const expected = (23456.78 - 12345.67) * 100
      expect(realizedPL).toBeCloseTo(expected, 2)
    })
  })

  describe('calculateTradingFee', () => {
    it('should calculate default fee (0.015%)', () => {
      const amount = 10000000 // 10,000,000 KRW
      const fee = calculateTradingFee(amount)
      expect(fee).toBe(1500) // 10,000,000 × 0.00015
    })

    it('should calculate custom fee rate', () => {
      const amount = 10000000
      const customRate = 0.0003 // 0.03%
      const fee = calculateTradingFee(amount, customRate)
      expect(fee).toBe(3000) // 10,000,000 × 0.0003
    })

    it('should return 0 for zero amount', () => {
      const fee = calculateTradingFee(0)
      expect(fee).toBe(0)
    })

    it('should round to integer (no fractional KRW)', () => {
      const amount = 1234567
      const fee = calculateTradingFee(amount)
      expect(Number.isInteger(fee)).toBe(true)
    })

    it('should handle small amounts', () => {
      const amount = 1000
      const fee = calculateTradingFee(amount)
      expect(fee).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle very large numbers', () => {
      const largeNumber = 999999999999
      const holdings = [{ quantity: 1, currentPrice: largeNumber }]
      const total = calculateTotalAssets(largeNumber, holdings)
      expect(total).toBe(largeNumber * 2)
    })

    it('should handle floating point precision issues', () => {
      // Famous JS issue: 0.1 + 0.2 !== 0.3
      const avgPrice = calculateAvgPrice(1, 0.1, 1, 0.2)
      // Should handle rounding correctly
      expect(avgPrice).toBeCloseTo(0.15, 10)
    })

    it('should not produce negative averages', () => {
      const avgPrice = calculateAvgPrice(10, 50000, 5, 60000)
      expect(avgPrice).toBeGreaterThan(0)
    })

    it('should handle zero quantities gracefully', () => {
      // This shouldn't happen in production, but test defensive coding
      const holdings = [{ quantity: 0, avgPrice: 70000, currentPrice: 70000 }]
      const unrealizedPL = calculateUnrealizedPL(holdings)
      expect(unrealizedPL).toBe(0)
    })
  })
})
