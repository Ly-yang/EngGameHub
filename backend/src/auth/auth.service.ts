import { Injectable, UnauthorizedException, BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../database/database.module';
import { RedisService } from '../redis/redis.service';
import { EmailService } from '../email/email.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { MfaService } from './services/mfa.service';
import { User, UserRole } from '@prisma/client';
import { 
  RegisterDto, 
  LoginDto, 
  AuthResult, 
  AuthTokens,
  UnauthorizedError,
  ValidationError 
} from '../../shared/types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly emailService: EmailService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly mfaService: MfaService,
    private readonly configService: ConfigService,
    @InjectQueue('auth') private readonly authQueue: Queue,
  ) {}

  /**
   * 用户注册
   */
  async register(dto: RegisterDto): Promise<AuthResult> {
    // 1. 验证用户唯一性
    await this.validateUniqueUser(dto.email);

    // 2. 密码强度验证和加密
    this.passwordService.validatePasswordStrength(dto.password);
    const passwordHash = await this.passwordService.hashPassword(dto.password);

    // 3. 创建用户
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        passwordHash,
        nickname: dto.nickname?.trim(),
        uuid: uuidv4(),
        roles: [UserRole.STUDENT], // 默认角色
        // 创建默认用户偏好
        userPreferences: {
          create: {
            language: 'en',
            theme: 'light',
            emailNotifications: true,
            pushNotifications: true,
          },
        },
      },
      include: {
        userPreferences: true,
      },
    });

    // 4. 生成Token对
    const tokens = await this.tokenService.generateTokenPair(user);

    // 5. 异步发送验证邮件
    await this.authQueue.add('send-verification-email', {
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
    }, {
      delay: 1000, // 1秒后发送
    });

    // 6. 记录注册事件
    await this.logAuthEvent(user.id, 'REGISTER', {
      email: user.email,
      ip: dto.clientInfo?.ip,
      userAgent: dto.clientInfo?.userAgent,
    });

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * 用户登录
   */
  async login(dto: LoginDto): Promise<AuthResult> {
    // 1. 验证用户凭据
    const user = await this.validateUserCredentials(dto.email, dto.password);

    // 2. 检查账户状态
    await this.checkAccountStatus(user);

    // 3. 检查登录频率限制
    await this.checkLoginRateLimit(user.id, dto.clientInfo?.ip);

    // 4. 多因素认证检查
    if (user.mfaEnabled) {
      const mfaToken = await this.mfaService.generateMfaToken(user.id);
      
      // 记录MFA请求
      await this.logAuthEvent(user.id, 'MFA_REQUIRED', {
        ip: dto.clientInfo?.ip,
        userAgent: dto.clientInfo?.userAgent,
      });

      return {
        requiresMfa: true,
        mfaToken,
      };
    }

    // 5. 生成Token对
    const tokens = await this.tokenService.generateTokenPair(user);

    // 6. 更新用户最后登录信息
    await this.updateUserLoginInfo(user.id, dto.clientInfo);

    // 7. 记录登录事件
    await this.logAuthEvent(user.id, 'LOGIN_SUCCESS', {
      ip: dto.clientInfo?.ip,
      userAgent: dto.clientInfo?.userAgent,
      rememberMe: dto.rememberMe,
    });

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * MFA验证登录
   */
  async verifyMfaAndLogin(mfaToken: string, mfaCode: string, clientInfo?: any): Promise<AuthResult> {
    // 1. 验证MFA令牌
    const userId = await this.mfaService.verifyMfaToken(mfaToken);
    if (!userId) {
      throw new UnauthorizedError('Invalid or expired MFA token');
    }

    // 2. 获取用户信息
    const user = await this.findUserById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // 3. 验证MFA代码
    const isValidMfaCode = await this.mfaService.verifyMfaCode(user.id, mfaCode);
    if (!isValidMfaCode) {
      await this.logAuthEvent(user.id, 'MFA_FAILED', { ip: clientInfo?.ip });
      throw new UnauthorizedError('Invalid MFA code');
    }

    // 4. 生成Token对
    const tokens = await this.tokenService.generateTokenPair(user);

    // 5. 更新用户登录信息
    await this.updateUserLoginInfo(user.id, clientInfo);

    // 6. 记录成功登录
    await this.logAuthEvent(user.id, 'MFA_LOGIN_SUCCESS', {
      ip: clientInfo?.ip,
      userAgent: clientInfo?.userAgent,
    });

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * 刷新访问令牌
   */
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    // 1. 验证刷新令牌
    const tokenData = await this.tokenService.verifyRefreshToken(refreshToken);
    if (!tokenData) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // 2. 获取用户信息
    const user = await this.findUserById(tokenData.userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // 3. 检查用户账户状态
    await this.checkAccountStatus(user);

    // 4. 生成新的Token对
    const tokens = await this.tokenService.generateTokenPair(user);

    // 5. 撤销旧的刷新令牌
    await this.tokenService.revokeRefreshToken(refreshToken);

    // 6. 记录令牌刷新事件
    await this.logAuthEvent(user.id, 'TOKEN_REFRESH', {});

    return tokens;
  }

  /**
   * 用户登出
   */
  async logout(userId: string, refreshToken?: string): Promise<void> {
    // 1. 撤销刷新令牌
    if (refreshToken) {
      await this.tokenService.revokeRefreshToken(refreshToken);
    }

    // 2. 撤销用户所有刷新令牌（可选，用于全设备登出）
    await this.tokenService.revokeAllUserTokens(userId);

    // 3. 清除用户相关缓存
    await this.clearUserCache(userId);

    // 4. 记录登出事件
    await this.logAuthEvent(userId, 'LOGOUT', {});
  }

  /**
   * 发送邮箱验证邮件
   */
  async sendVerificationEmail(email: string): Promise<void> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // 检查发送频率限制
    const rateLimitKey = `verify_email:${email}`;
    const canSend = await this.redisService.checkRateLimit(rateLimitKey, 3, 300); // 5分钟内最多3次
    if (!canSend) {
      throw new BadRequestException('Too many verification emails sent. Please try again later.');
    }

    // 异步发送验证邮件
    await this.authQueue.add('send-verification-email', {
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
    });
  }

  /**
   * 验证邮箱
   */
  async verifyEmail(token: string): Promise<void> {
    // 1. 验证邮箱验证令牌
    const tokenData = await this.tokenService.verifyEmailToken(token);
    if (!tokenData) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // 2. 更新用户邮箱验证状态
    await this.prisma.user.update({
      where: { id: tokenData.userId },
      data: { 
        emailVerified: true,
        emailVerifiedAt: new Date(),
      },
    });

    // 3. 记录验证事件
    await this.logAuthEvent(tokenData.userId, 'EMAIL_VERIFIED', {});
  }

  /**
   * 发送密码重置邮件
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      // 为了安全，不暴露用户是否存在
      return;
    }

    // 检查发送频率限制
    const rateLimitKey = `reset_password:${email}`;
    const canSend = await this.redisService.checkRateLimit(rateLimitKey, 3, 300); // 5分钟内最多3次
    if (!canSend) {
      throw new BadRequestException('Too many reset emails sent. Please try again later.');
    }

    // 异步发送重置邮件
    await this.authQueue.add('send-password-reset-email', {
      userId: user.id,
      email: user.email,
      nickname: user.nickname,
    });
  }

  /**
   * 重置密码
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // 1. 验证重置令牌
    const tokenData = await this.tokenService.verifyPasswordResetToken(token);
    if (!tokenData) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // 2. 验证新密码强度
    this.passwordService.validatePasswordStrength(newPassword);

    // 3. 加密新密码
    const passwordHash = await this.passwordService.hashPassword(newPassword);

    // 4. 更新用户密码
    await this.prisma.user.update({
      where: { id: tokenData.userId },
      data: { passwordHash },
    });

    // 5. 撤销用户所有刷新令牌（强制重新登录）
    await this.tokenService.revokeAllUserTokens(tokenData.userId);

    // 6. 记录密码重置事件
    await this.logAuthEvent(tokenData.userId, 'PASSWORD_RESET', {});
  }

  /**
   * 修改密码
   */
  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    // 1. 获取用户信息
    const user = await this.findUserById(userId);
    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // 2. 验证旧密码
    const isOldPasswordValid = await this.passwordService.verifyPassword(oldPassword, user.passwordHash);
    if (!isOldPasswordValid) {
      throw new UnauthorizedError('Invalid current password');
    }

    // 3. 验证新密码强度
    this.passwordService.validatePasswordStrength(newPassword);

    // 4. 加密新密码
    const passwordHash = await this.passwordService.hashPassword(newPassword);

    // 5. 更新用户密码
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // 6. 撤销其他设备的刷新令牌
    await this.tokenService.revokeAllUserTokens(userId);

    // 7. 记录密码修改事件
    await this.logAuthEvent(userId, 'PASSWORD_CHANGE', {});
  }

  // 私有辅助方法
  
  private async validateUniqueUser(email: string): Promise<void> {
    const existingUser = await this.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }
  }

  private async validateUserCredentials(email: string, password: string): Promise<User> {
    const user = await this.findUserByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const isPasswordValid = await this.passwordService.verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      // 记录失败的登录尝试
      await this.logAuthEvent(user.id, 'LOGIN_FAILED', { reason: 'invalid_password' });
      throw new UnauthorizedError('Invalid credentials');
    }

    return user;
  }

  private async checkAccountStatus(user: User): Promise<void> {
    // 这里可以添加账户状态检查，如封禁、锁定等
    // 目前简单实现
    if (!user) {
      throw new UnauthorizedError('Account not found');
    }
  }

  private async checkLoginRateLimit(userId: string, ip?: string): Promise<void> {
    const rateLimitKey = `login_attempts:${userId}:${ip || 'unknown'}`;
    const canLogin = await this.redisService.checkRateLimit(rateLimitKey, 5, 300); // 5分钟内最多5次
    if (!canLogin) {
      throw new BadRequestException('Too many login attempts. Please try again later.');
    }
  }

  private async updateUserLoginInfo(userId: string, clientInfo?: any): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { 
        lastLoginAt: new Date(),
        lastActivityAt: new Date(),
      },
    });
  }

  private async findUserById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        userPreferences: true,
      },
    });
  }

  private async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: {
        userPreferences: true,
      },
    });
  }

  private async clearUserCache(userId: string): Promise<void> {
    const keys = [
      `user:${userId}`,
      `user_progress:${userId}`,
      `user_preferences:${userId}`,
    ];
    
    await Promise.all(
      keys.map(key => this.redisService.del(key))
    );
  }

  private async logAuthEvent(userId: string, action: string, details: any): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        resource: 'auth',
        details,
        ip: details.ip,
        userAgent: details.userAgent,
      },
    });
  }

  private sanitizeUser(user: User): Partial<User> {
    const { passwordHash, mfaSecret, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}
