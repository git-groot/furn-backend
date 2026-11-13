import { TokenPayload } from '../../src/types';
import { UnauthorizedError } from '../../src/utils/errors';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from '../../src/utils/jwt';

describe('JWT Utility', () => {
  const mockPayload: TokenPayload = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@myfurniture.com',
    role: 'customer',
  };

  it('should generate and verify access token', () => {
    const token = generateAccessToken(mockPayload);
    expect(typeof token).toBe('string');

    const decoded = verifyAccessToken(token);
    expect(decoded.userId).toEqual(mockPayload.userId);
    expect(decoded.email).toEqual(mockPayload.email);
    expect(decoded.role).toEqual(mockPayload.role);
  });

  it('should generate and verify refresh token', () => {
    const token = generateRefreshToken(mockPayload);
    expect(typeof token).toBe('string');

    const decoded = verifyRefreshToken(token);
    expect(decoded.userId).toEqual(mockPayload.userId);
    expect(decoded.email).toEqual(mockPayload.email);
    expect(decoded.role).toEqual(mockPayload.role);
  });

  it('should throw UnauthorizedError on invalid token', () => {
    expect(() => verifyAccessToken('invalid.token.here')).toThrow(UnauthorizedError);
  });
});

