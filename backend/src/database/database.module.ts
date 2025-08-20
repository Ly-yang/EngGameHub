import { Global, Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Global()
@Module({
  providers: [
    {
      provide: 'PRISMA_SERVICE',
      useFactory: async (configService: ConfigService) => {
        const prisma = new PrismaClient({
          datasources: {
            db: {
              url: configService.get<string>('database.url'),
            },
          },
          log: [
            {
              emit: 'event',
              level: 'query',
            },
            {
              emit: 'event',
              level: 'error',
            },
            {
              emit: 'event',
              level: 'info',
            },
            {
              emit: 'event',
              level: 'warn',
            },
          ],
        });

        // 数据库连接监听器
        prisma.$on('query', (e) => {
          if (configService.get('app.nodeEnv') === 'development') {
            console.log('Query: ' + e.query);
            console.log('Params: ' + e.params);
            console.log('Duration: ' + e.duration + 'ms');
          }
        });

        prisma.$on('error', (e) => {
          console.error('Database Error:', e);
        });

        // 连接到数据库
        await prisma.$connect();
        console.log('✅ Database connected successfully');
        
        return prisma;
      },
      inject: [ConfigService],
    },
    PrismaService,
  ],
  exports: ['PRISMA_SERVICE', PrismaService],
})
export class DatabaseModule implements OnModuleInit, OnModuleDestroy {
  constructor(private prismaService: PrismaService) {}

  async onModuleInit() {
    // 模块初始化时的操作
    await this.prismaService.enableShutdownHooks();
  }

  async onModuleDestroy() {
    // 模块销毁时断开数据库连接
    await this.prismaService.disconnect();
  }
}

// Prisma服务类
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async enableShutdownHooks() {
    // 优雅关闭钩子
    process.on('beforeExit', async () => {
      console.log('🔄 Closing database connection...');
      await this.$disconnect();
    });
  }

  async disconnect() {
    await this.$disconnect();
    console.log('✅ Database disconnected');
  }

  // 健康检查
  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }

  // 获取连接状态
  async getStats() {
    try {
      const result = await this.$queryRaw`
        SELECT 
          count(*) as total_connections,
          count(*) FILTER (WHERE state = 'active') as active_connections,
          count(*) FILTER (WHERE state = 'idle') as idle_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      ` as any[];

      return result[0];
    } catch (error) {
      console.error('Failed to get database stats:', error);
      return null;
    }
  }
}
