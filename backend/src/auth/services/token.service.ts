import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/database.module';
import { RedisService } from '../../redis/redis.service';
import { User } from '@prisma/client';
import { AuthTokens, UnauthorizedError } from '../../../shared/types';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

interface JwtPayload {
  sub: string; // user id
  email: string;
  roles: string[];
  permissions?: string[];
  type?: string;
  jti?: string; // JWT ID
  iat?: number;
  exp?: number;
}

interface TokenData {
  userId: string;
  email?: string;
  type: string;
  jti?: string;
}

@Injectable()
export class TokenService {
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;
  private readonly jwtSecret: string;
  private readonly issuer: string;
  private readonly audience: string;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {
    this.accessTokenExpiry = this.configService.get<string>('jwt.accessTokenExpiry', '15m');
    this.refreshTokenExpiry = this.configService.get<string>('jwt.refreshTokenExpiry', '7d');
    this.jwtSecret = this.configService.get<string>('jwt.secret');
    this.issuer = this.configService.get<string>('jwt.issuer', 'enggamehub');
    this.audience = this.configService.get<string>('jwt.audience', 'enggamehub-users');
  }

  /**
   * 生成访问令牌和刷新令牌对
   */
  async generateTokenPair(user: User): Promise<AuthTokens> {
    const jti = uuidv4();
    const permissions = await this.getUserPermissions(user);

    // JWT payload
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      permissions,
      jti,
    };

    // 生成访问令牌
    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn: this.accessTokenExpiry,
      issuer: this.issuer,
      audience: this.audience,
      jwtid: jti,
    });

    // 生成刷新令牌
    const refreshTokenId = uuidv4();
    const refreshToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        type: 'refresh',
        jti: refreshTokenId,
      },
      {
        expiresIn: this.refreshTokenExpiry,
        issuer: this.issuer,
        audience: this.audience,
        jwtid: refreshTokenId,
      }
    );

    // 计算过期时间
    const expiresIn = this.parseExpiryToSeconds(this.accessTokenExpiry);
    const refreshExpiresIn = this.parseExpiryToSeconds(this.refreshTokenExpiry);

    // 存储刷新令牌到数据库
    await this.prisma.refreshToken.create({
      data: {
        id: refreshTokenId,
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + refreshExpiresIn * 1000),
      },
    });

    // 缓存访问令牌信息到Redis (用于快速验证和撤销)
    await this.redisService.setex(
      `access_token:${jti}`,
      expiresIn,
      JSON.stringify({
        userId: user.id,
        email: user.email,
        roles: user.roles,
        permissions,
      })
    );

    return {
      accessToken,
      refreshToken,
      expiresIn,
      tokenType: 'Bearer',
    };
  }

  /**
   * 验证访问令牌
   */
  async verifyAccessToken(token: string): Promise<JwtPayload | null> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.jwtSecret,
        issuer: this.issuer,
        audience: this.audience,
      });

      // 检查令牌是否被撤销 (黑名单检查)
      const isRevoked = await this.isTokenRevoked(payload.jti);
      if (isRevoked) {
        return null;
      }

      // 检查Redis缓存中的令牌信息
      const cachedToken = await this.redisService.get(`access_token:${payload.jti}`);
      if (!cachedToken) {
        // 令牌可能已过期或被清除
        return null;
      }

      return payload;
    } catch (error) {
      return null;
    }
  }

  /**
   * 验证刷新令牌
   */
  async verifyRefreshToken(token: string): Promise<TokenData | null> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.jwtSecret,
        issuer: this.issuer,
        audience: this.audience,
      });

      if (payload.type !== 'refresh') {
        return null;
      }

      // 检查数据库中的刷新令牌
      const refreshToken = await this.prisma.refreshToken.findUnique({
        where: { 
          id: payload.jti,
          isRevoked: false,
        },
      });

      if (!refreshToken || refreshToken.expiresAt < new Date()) {
        return null;
      }

      return {
        userId: payload.sub,
        email: payload.email,
        type: 'refresh',
        jti: payload.jti,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 撤销刷新令牌
   */
  async revokeRefreshToken(token: string): Promise<void> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.jwtSecret,
        ignoreExpiration: true, // 允许过期的令牌被撤销
      });

      if (payload.jti) {
        await this.prisma.refreshToken.updateMany({
          where: { 
            id: payload.jti,
            isRevoked: false,
          },
          data: { isRevoked: true },
        });
      }
    } catch (error) {
      // 令牌格式错误，忽略
    }
  }

  /**
   * 撤销用户所有刷新令牌
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    // 撤销数据库中的所有刷新令牌
    await this.prisma.refreshToken.updateMany({
      where: { 
        userId,
        isRevoked: false,
      },
      data: { isRevoked: true },
    });

    // 将用户加入访问令牌黑名单
    await this.addUserToBlacklist(userId);
  }

  /**
   * 生成邮箱验证令牌
   */
  async generateEmailVerificationToken(userId: string, email: string): Promise<string> {
    const payload = {
      sub: userId,
      email,
      type: 'email_verification',
      jti: uuidv4(),
    };

    const token = await this.jwtService.signAsync(payload, {
      expiresIn: '24h', // 24小时过期
      issuer: this.issuer,
      audience: this.audience,
    });

    // 缓存验证令牌
    await this.redisService.setex(
      `email_verification:${userId}`,
      86400, // 24小时
      token
    );

    return token;
  }

  /**
   * 验证邮箱验证令牌
   */
  async verifyEmailToken(token: string): Promise<TokenData | null> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.jwtSecret,
        issuer: this.issuer,
        audience: this.audience,
      });

      if (payload.type !== 'email_verification') {
        return null;
      }

      // 检查缓存中的令牌
      const cachedToken = await this.redisService.get(`email_verification:${payload.sub}`);
      if (cachedToken !== token) {
        return null;
      }

      // 删除已使用的令牌
      await this.redisService.del(`email_verification:${payload.sub}`);

      return {
        userId: payload.sub,
        email: payload.email,
        type: 'email_verification',
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 生成密码重置令牌
   */
  async generatePasswordResetToken(userId: string, email: string): Promise<string> {
    const payload = {
      sub: userId,
      email,
      type: 'password_reset',
      jti: uuidv4(),
    };

    const token = await this.jwtService.signAsync(payload, {
      expiresIn: '1h', // 1小时过期
      issuer: this.issuer,
      audience: this.audience,
    });

    // 缓存重置令牌（覆盖之前的令牌）
    await this.redisService.setex(
      `password_reset:${userId}`,
      3600, // 1小时
      token
    );

    return token;
  }

  /**
   * 验证密码重置令牌
   */
  async verifyPasswordResetToken(token: string): Promise<TokenData | null> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.jwtSecret,
        issuer: this.issuer,
        audience: this.audience,
      });

      if (payload.type !== 'password_reset') {
        return null;
      }

      // 检查缓存中的令牌
      const cachedToken = await this.redisService.get(`password_reset:${payload.sub}`);
      if (cachedToken !== token) {
        return null;
      }

      // 删除已使用的令牌
      await this.redisService.del(`password_reset:${payload.sub}`);

      return {
        userId: payload.sub,
        email: payload.email,
        type: 'password_reset',
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * 检查令牌是否被撤销
   */
  private async isTokenRevoked(jti: string): Promise<boolean> {
    const isRevoked = await this.redisService.get(`revoked_token:${jti}`);
    return isRevoked === 'true';
  }

  /**
   * 将令牌加入黑名单
   */
  async revokeAccessToken(jti: string, expiresIn?: number): Promise<void> {
    const ttl = expiresIn || 86400; // 默认24小时
    await this.redisService.setex(`revoked_token:${jti}`, ttl, 'true');
  }

  /**
   * 将用户加入黑名单（撤销所有访问令牌）
   */
  private async addUserToBlacklist(userId: string): Promise<void> {
    const blacklistKey = `user_blacklist:${userId}`;
    await this.redisService.setex(blacklistKey, 86400, 'true'); // 24小时黑名单
  }

  /**
   * 获取用户权限
   */
  private async getUserPermissions(user: User): Promise<string[]> {
    const permissions: string[] = [];

    // 基于角色的权限映射
    if (user.roles.includes('ADMIN')) {
      permissions.push(
        'users:read', 'users:write', 'users:delete',
        'questions:read', 'questions:write', 'questions:delete', 'questions:review',
        'games:read', 'games:write', 'games:moderate',
        'analytics:read', 'analytics:write',
        'system:read', 'system:write'
      );
    }

    if (user.roles.includes('TEACHER')) {
      permissions.push(
        'users:read',
        'questions:read', 'questions:write', 'questions:review',
        'games:read', 'games:moderate',
        'analytics:read'
      );
    }

    if (user.roles.includes('STUDENT')) {
      permissions.push(
        'questions:read',
        'games:read', 'games:join',
        'learning:read', 'learning:write'
      );
    }

    return [...new Set(permissions)]; // 去重
  }

  /**
   * 解析过期时间为秒数
   */
  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhdw]?)$/);
    if (!match) return 3600; // 默认1小时

    const value = parseInt(match[1], 10);
    const unit = match[2] || 's';

    const multipliers = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
      w: 604800,
    };

    return value * (multipliers[unit] || 1);
  }

  /**
   * 清理过期的刷新令牌
   */
  async cleanExpiredTokens(): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { isRevoked: true, createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }, // 7天前的撤销令牌
        ],
      },
    });
  }
}
