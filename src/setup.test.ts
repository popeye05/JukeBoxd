import fc from 'fast-check';

describe('Project Setup Verification', () => {
  it('should have TypeScript compilation working', () => {
    const testFunction = (x: number): number => x * 2;
    expect(testFunction(5)).toBe(10);
  });

  it('should have Jest configured correctly', () => {
    expect(jest).toBeDefined();
    expect(describe).toBeDefined();
    expect(it).toBeDefined();
    expect(expect).toBeDefined();
  });

  it('should have fast-check property-based testing available', () => {
    expect(fc).toBeDefined();
    expect(fc.integer).toBeDefined();
    expect(fc.string).toBeDefined();
  });

  it('should run a simple property-based test', () => {
    fc.assert(
      fc.property(fc.integer(), (n) => {
        return n + 0 === n;
      }),
      { numRuns: 100 }
    );
  });

  it('should have all required dependencies available', () => {
    // Test that we can import key dependencies
    expect(() => require('express')).not.toThrow();
    expect(() => require('cors')).not.toThrow();
    expect(() => require('helmet')).not.toThrow();
    expect(() => require('morgan')).not.toThrow();
    expect(() => require('bcrypt')).not.toThrow();
    expect(() => require('jsonwebtoken')).not.toThrow();
    expect(() => require('pg')).not.toThrow();
    expect(() => require('redis')).not.toThrow();
    expect(() => require('axios')).not.toThrow();
    expect(() => require('dotenv')).not.toThrow();
    expect(() => require('express-rate-limit')).not.toThrow();
    expect(() => require('express-validator')).not.toThrow();
    expect(() => require('uuid')).not.toThrow();
  });

  it('should have TypeScript path aliases configured', () => {
    // This test will fail if module resolution isn't working
    expect(() => require('@/types')).not.toThrow();
    expect(() => require('@/config/redis')).not.toThrow();
  });
});