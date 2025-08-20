export default () => ({
  // 应用配置
  app: {
    port: parseInt(process.env.PORT, 10) || 4000,
    nodeEnv: process.env.NODE_ENV || 'development',
    name: 'EngGameHub API',
    version: process.env.npm_package_version || '1.0.0',
    frontendUrls: process.env.FRONTEND_URLS?.split(',') || ['http://localhost:3000'],
  },

  // 数据库配置
  database: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'enggamehub',
    ssl: process.env.DB_SSL === 'true',
    maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS, 10) || 100,
    connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT, 10) || 5000,
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT, 10) || 30000,
  },

  // Redis配置
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
    keepAlive: 30000,
    family: 4,
    keyPrefix: 'enggamehub:',
  },

  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
    issuer: process.env.JWT_ISSUER || 'enggamehub',
    audience: process.env.JWT_AUDIENCE || 'enggamehub-users',
  },

  // AI服务配置
  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      organization: process.env.OPENAI_ORG_ID,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS, 10) || 1000,
      temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.3,
      timeout: parseInt(process.env.OPENAI_TIMEOUT, 10) || 30000,
    },
    azure: {
      speechKey: process.env.AZURE_SPEECH_KEY,
      speechRegion: process.env.AZURE_SPEECH_REGION || 'eastus',
      endpoint: process.env.AZURE_ENDPOINT,
      timeout: parseInt(process.env.AZURE_TIMEOUT, 10) || 10000,
    },
  },

  // 安全配置
  security: {
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS, 10) || 12,
    rateLimitTtl: parseInt(process.env.RATE_LIMIT_TTL, 10) || 60,
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    corsOrigin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    encryptionKey: process.env.ENCRYPTION_KEY || 'your-32-character-encryption-key!',
    csrfSecret: process.env.CSRF_SECRET || 'csrf-secret-key',
  },

  // 文件存储配置
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local', // local, aws-s3, gcp, azure
    local: {
      uploadDir: process.env.UPLOAD_DIR || './uploads',
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10 * 1024 * 1024, // 10MB
    },
    aws: {
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: process.env.AWS_S3_BUCKET,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  },

  // 邮件服务配置
  email: {
    provider: process.env.EMAIL_PROVIDER || 'smtp', // smtp, sendgrid, mailgun
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    },
    from: process.env.EMAIL_FROM || 'noreply@enggamehub.com',
  },

  // 短信服务配置
  sms: {
    provider: process.env.SMS_PROVIDER || 'twilio', // twilio, aws-sns
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_FROM_NUMBER,
    },
  },

  // 监控配置
  monitoring: {
    enableMetrics: process.env.ENABLE_METRICS !== 'false',
    metricsPrefix: process.env.METRICS_PREFIX || 'enggamehub_',
    healthCheck: {
      timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT, 10) || 5000,
    },
    sentry: {
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE) || 0.1,
    },
  },

  // WebSocket配置
  websocket: {
    cors: {
      origin: process.env.FRONTEND_URLS?.split(',') || ['http://localhost:3000'],
      credentials: true,
    },
    transports: ['websocket'],
    pingTimeout: parseInt(process.env.WS_PING_TIMEOUT, 10) || 60000,
    pingInterval: parseInt(process.env.WS_PING_INTERVAL, 10) || 25000,
    adapter: process.env.WS_ADAPTER || 'memory', // memory, redis
  },

  // 游戏配置
  game: {
    defaultSettings: {
      timeLimit: parseInt(process.env.GAME_TIME_LIMIT, 10) || 30, // 30秒每题
      maxPlayers: parseInt(process.env.GAME_MAX_PLAYERS, 10) || 10,
      questionCount: parseInt(process.env.GAME_QUESTION_COUNT, 10) || 10,
    },
    scoring: {
      baseScore: parseInt(process.env.GAME_BASE_SCORE, 10) || 10,
      timeBonusMultiplier: parseFloat(process.env.GAME_TIME_BONUS_MULTIPLIER) || 2.0,
      streakBonusMultiplier: parseFloat(process.env.GAME_STREAK_BONUS_MULTIPLIER) || 1.5,
    },
  },

  // 学习分析配置
  analytics: {
    retentionPeriod: parseInt(process.env.ANALYTICS_RETENTION_DAYS, 10) || 365, // 保留一年
    batchSize: parseInt(process.env.ANALYTICS_BATCH_SIZE, 10) || 1000,
    processingInterval: parseInt(process.env.ANALYTICS_PROCESSING_INTERVAL, 10) || 300000, // 5分钟
  },

  // 缓存配置
  cache: {
    ttl: parseInt(process.env.CACHE_TTL, 10) || 600, // 10分钟
    max: parseInt(process.env.CACHE_MAX, 10) || 1000,
    userDataTtl: parseInt(process.env.CACHE_USER_DATA_TTL, 10) || 300, // 5分钟
    questionsTtl: parseInt(process.env.CACHE_QUESTIONS_TTL, 10) || 3600, // 1小时
    aiResponseTtl: parseInt(process.env.CACHE_AI_RESPONSE_TTL, 10) || 86400, // 24小时
  },

  // 队列配置
  queue: {
    defaultJobOptions: {
      removeOnComplete: parseInt(process.env.QUEUE_REMOVE_ON_COMPLETE, 10) || 10,
      removeOnFail: parseInt(process.env.QUEUE_REMOVE_ON_FAIL, 10) || 5,
      attempts: parseInt(process.env.QUEUE_ATTEMPTS, 10) || 3,
      backoffDelay: parseInt(process.env.QUEUE_BACKOFF_DELAY, 10) || 2000,
    },
    concurrency: {
      email: parseInt(process.env.QUEUE_EMAIL_CONCURRENCY, 10) || 5,
      analytics: parseInt(process.env.QUEUE_ANALYTICS_CONCURRENCY, 10) || 3,
      ai: parseInt(process.env.QUEUE_AI_CONCURRENCY, 10) || 2,
    },
  },

  // 日志配置
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
    maxFiles: parseInt(process.env.LOG_MAX_FILES, 10) || 5,
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    datePattern: process.env.LOG_DATE_PATTERN || 'YYYY-MM-DD',
  },

  // 第三方API配置
  thirdParty: {
    rateLimit: {
      openai: {
        requests: parseInt(process.env.OPENAI_RATE_LIMIT_REQUESTS, 10) || 60,
        window: parseInt(process.env.OPENAI_RATE_LIMIT_WINDOW, 10) || 60000,
      },
      azure: {
        requests: parseInt(process.env.AZURE_RATE_LIMIT_REQUESTS, 10) || 20,
        window: parseInt(process.env.AZURE_RATE_LIMIT_WINDOW, 10) || 60000,
      },
    },
  },
});
