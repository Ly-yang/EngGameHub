import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { RedisModule } from '../redis/redis.module';
import { EmailModule } from '../email/email.module';

// 策略
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';

// 守卫
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { RolesGuard } from './guards/roles.guard';

// 服务
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { MfaService } from './services/mfa.service';

// 队列处理器
import { AuthQueueProcessor } from './processors/auth-queue.processor';

@Module({
  imports: [
    // JWT模块配置
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.accessTokenExpiry'),
          issuer: configService.get<string>('jwt.issuer'),
          audience: configService.get<string>('jwt.audience'),
        },
      }),
    }),
    
    // Passport模块
    PassportModule.register({ defaultStrategy: 'jwt' }),
    
    // 队列模块 - 处理异步认证任务
    BullModule.registerQueue({
      name: 'auth',
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    }),
    
    // 其他模块
    forwardRef(() => UsersModule),
    RedisModule,
    EmailModule,
  ],
  
  controllers: [AuthController],
  
  providers: [
    // 核心服务
    AuthService,
    PasswordService,
    TokenService,
    MfaService,
    
    // 认证策略
    LocalStrategy,
    JwtStrategy,
    RefreshTokenStrategy,
    
    // 守卫
    JwtAuthGuard,
    LocalAuthGuard,
    RolesGuard,
    
    // 队列处理器
    AuthQueueProcessor,
  ],
  
  exports: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    TokenService,
    PasswordService,
  ],
})
export class AuthModule {}
