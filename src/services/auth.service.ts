import { toUserResponse, userRepository } from '../repositories/user.repository';
import { AuthTokens, UserWithoutPassword } from '../types';
import { ConflictError, NotFoundError, UnauthorizedError } from '../utils/errors';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { comparePassword, hashPassword } from '../utils/password';

export class AuthService {
  async register(data: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
  }): Promise<AuthTokens> {
    const existing = await userRepository.findByEmail(data.email);
    if (existing) {
      throw new ConflictError('A user with this email address already exists');
    }

    const password_hash = await hashPassword(data.password);
    const user = await userRepository.create({
      email: data.email,
      password_hash,
      first_name: data.first_name,
      last_name: data.last_name,
      phone: data.phone,
      role: 'customer',
      is_active: true,
    });

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.token_version,
    };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return {
      accessToken,
      refreshToken,
      user: toUserResponse(user),
    };
  }

  async login(credentials: { email: string; password: string }): Promise<AuthTokens> {
    const user = await userRepository.findByEmail(credentials.email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.deleted_at || !user.is_active) {
      throw new UnauthorizedError('Account is deactivated or disabled');
    }

    const isMatch = await comparePassword(credentials.password, user.password_hash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.token_version,
    };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    return {
      accessToken,
      refreshToken,
      user: toUserResponse(user),
    };
  }

  async refresh(token: string): Promise<{ accessToken: string; user: UserWithoutPassword }> {
    const payload = verifyRefreshToken(token);
    const user = await userRepository.findById(payload.userId);
    if (!user) {
      throw new UnauthorizedError('User session not found');
    }

    if (user.deleted_at || !user.is_active) {
      throw new UnauthorizedError('Account is deactivated or disabled');
    }

    if (payload.tokenVersion !== undefined && user.token_version !== payload.tokenVersion) {
      throw new UnauthorizedError('Refresh token has been revoked');
    }

    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.token_version,
    };
    const newAccessToken = generateAccessToken(tokenPayload);

    return {
      accessToken: newAccessToken,
      user: toUserResponse(user),
    };
  }

  async getCurrentUser(userId: string): Promise<UserWithoutPassword> {
    const user = await userRepository.findById(userId);
    if (!user || user.deleted_at || !user.is_active) {
      throw new NotFoundError('User not found');
    }
    return toUserResponse(user);
  }
}

export const authService = new AuthService();
