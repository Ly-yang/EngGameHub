// 共享类型定义
export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin'
}

export enum CEFRLevel {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2'
}

export enum ModuleType {
  GRAMMAR = 'grammar',
  VOCABULARY = 'vocabulary',
  LISTENING = 'listening',
  SPEAKING = 'speaking',
  READING = 'reading',
  WRITING = 'writing',
  PRONUNCIATION = 'pronunciation'
}

export enum SkillType {
  GRAMMAR = 'grammar',
  VOCABULARY = 'vocabulary',
  LISTENING = 'listening',
  SPEAKING = 'speaking',
  READING = 'reading',
  WRITING = 'writing',
  PRONUNCIATION = 'pronunciation'
}

export enum GameState {
  WAITING = 'waiting',
  STARTING = 'starting',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ENDED = 'ended'
}

export interface User {
  id: string;
  uuid: string;
  email: string;
  nickname?: string;
  avatarUrl?: string;
  level: CEFRLevel;
  totalXP: number;
  currentStreak: number;
  roles: UserRole[];
  subscriptionType: 'free' | 'basic' | 'premium';
  emailVerified: boolean;
  mfaEnabled: boolean;
  lastActivityAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Question {
  id: string;
  moduleType: ModuleType;
  level: CEFRLevel;
  difficulty: number; // 1-10
  content: QuestionContent;
  correctAnswer: string | string[];
  explanation: string;
  metadata: QuestionMetadata;
  analytics: QuestionAnalytics;
}

export interface QuestionContent {
  text: string;
  options?: string[];
  audioUrl?: string;
  imageUrl?: string;
  timeLimit?: number;
}

export interface QuestionMetadata {
  tags: string[];
  skillType: SkillType;
  estimatedTime: number; // seconds
  createdBy: string;
  reviewedBy?: string;
  version: number;
}

export interface QuestionAnalytics {
  totalAttempts: number;
  correctAttempts: number;
  avgResponseTime: number;
  difficultyRating: number;
  lastUpdated: Date;
}

export interface GameRoom {
  id: string;
  hostId: string;
  gameMode: ModuleType;
  maxPlayers: number;
  currentPlayers: number;
  isPrivate: boolean;
  gameState: GameState;
  settings: GameSettings;
  createdAt: Date;
}

export interface GameSettings {
  timeLimit: number; // seconds per question
  questionCount: number;
  autoStart: boolean;
  allowSpectators: boolean;
}

export interface LearningAttempt {
  id: string;
  userId: string;
  questionId: string;
  moduleType: ModuleType;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  responseTime: number; // milliseconds
  score: number;
  aiFeedback?: string;
  sessionId: string;
  createdAt: Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResult {
  user?: User;
  tokens?: AuthTokens;
  requiresMfa?: boolean;
  mfaToken?: string;
}

// DTOs (Data Transfer Objects)
export interface RegisterDto {
  email: string;
  password: string;
  nickname: string;
  agreeToTerms: boolean;
}

export interface LoginDto {
  email: string;
  password: string;
  rememberMe?: boolean;
  clientInfo?: {
    userAgent: string;
    ip: string;
    device: string;
  };
}

export interface CreateQuestionDto {
  moduleType: ModuleType;
  level: CEFRLevel;
  difficulty: number;
  content: QuestionContent;
  correctAnswer: string | string[];
  explanation: string;
  tags: string[];
  skillType: SkillType;
  estimatedTime: number;
}

export interface GameAnswerDto {
  questionId: string;
  answer: string;
  responseTime: number;
}

export interface CreateRoomDto {
  gameMode: ModuleType;
  maxPlayers?: number;
  isPrivate?: boolean;
  settings?: Partial<GameSettings>;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

// Performance & Monitoring Types
export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  checks: HealthCheck[];
  timestamp: Date;
}

export interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
  timestamp: Date;
}

export interface MetricsData {
  apiResponseTimeP50: number;
  apiResponseTimeP95: number;
  apiResponseTimeP99: number;
  requestsPerSecond: number;
  errorRate: number;
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  timestamp: Date;
}

// Cache Options
export interface CacheOptions {
  ttl?: number;
  useLocal?: boolean;
  localTtl?: number;
}

// WebSocket Events
export interface SocketEvent {
  type: string;
  payload: any;
  timestamp: Date;
}

export interface RoomJoinEvent extends SocketEvent {
  type: 'room:join';
  payload: {
    roomId: string;
    userId: string;
  };
}

export interface GameStartEvent extends SocketEvent {
  type: 'game:start';
  payload: {
    roomId: string;
    questions: Question[];
  };
}

export interface AnswerSubmitEvent extends SocketEvent {
  type: 'answer:submit';
  payload: GameAnswerDto;
}

// Environment Configuration
export interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl?: boolean;
  maxConnections?: number;
}

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  retryDelayOnFailover?: number;
  maxRetriesPerRequest?: number;
}

export interface JWTConfig {
  secret: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
}

export interface AIConfig {
  openai: {
    apiKey: string;
    model: string;
    maxTokens: number;
  };
  azure: {
    speechKey: string;
    speechRegion: string;
  };
}

export interface AppConfig {
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
  database: DatabaseConfig;
  redis: RedisConfig;
  jwt: JWTConfig;
  ai: AIConfig;
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
}

// Utility Types
export type Partial<T> = {
  [P in keyof T]?: T[P];
};

export type Required<T> = {
  [P in keyof T]-?: T[P];
};

export type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

// Error Types
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}
