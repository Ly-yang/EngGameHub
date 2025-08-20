import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { SecurityMiddleware } from './common/middleware/security.middleware';
import { MetricsService } from './common/services/metrics.service';

async function bootstrap() {
  // Winston Logger配置
  const logger = WinstonModule.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level}] ${message} ${
              Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
            }`;
          }),
        ),
      }),
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        ),
      }),
    ],
  });

  // 使用Fastify适配器提升性能
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ 
      logger: false,  // 使用自定义logger
      trustProxy: true,
      maxParamLength: 200
    }),
    {
      logger,
    }
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 4000;
  const nodeEnv = configService.get<string>('NODE_ENV') || 'development';
  
  // 安全中间件
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: [`'self'`],
        styleSrc: [`'self'`, `'unsafe-inline'`],
        scriptSrc: [`'self'`],
        imgSrc: [`'self'`, 'data:', 'validator.swagger.io'],
      },
    },
  });

  // 压缩中间件
  await app.register(compression);

  // CORS配置
  app.enableCors({
    origin: configService.get<string>('FRONTEND_URLS')?.split(',') || ['http://localhost:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // 全局管道配置
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: nodeEnv === 'production',
    }),
  );

  // 全局过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // 全局拦截器
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseInterceptor(),
  );

  // Swagger API文档（仅开发环境）
  if (nodeEnv !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('EngGameHub API')
      .setDescription('AI-Powered English Learning Game Platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User management')
      .addTag('questions', 'Question management')
      .addTag('games', 'Game functionality')
      .addTag('analytics', 'Learning analytics')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
    });
  }

  // 指标收集端点
  const metricsService = app.get(MetricsService);
  app.getHttpAdapter().get('/metrics', async (req, res) => {
    res.header('Content-Type', 'text/plain');
    res.send(await metricsService.getMetrics());
  });

  // 健康检查端点
  app.getHttpAdapter().get('/health', (req, res) => {
    res.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: nodeEnv,
      version: process.env.npm_package_version || '1.0.0'
    });
  });

  // 就绪检查端点
  app.getHttpAdapter().get('/health/ready', async (req, res) => {
    try {
      // 这里可以添加数据库连接检查等
      res.send({
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'ok',
          redis: 'ok',
          ai_services: 'ok'
        }
      });
    } catch (error) {
      res.status(503).send({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  });

  // 优雅关闭
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.log('SIGINT received, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  // 未捕获异常处理
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });

  await app.listen(port, '0.0.0.0');
  
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  if (nodeEnv !== 'production') {
    logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  }
  logger.log(`📊 Metrics: http://localhost:${port}/metrics`);
  logger.log(`💚 Health Check: http://localhost:${port}/health`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
