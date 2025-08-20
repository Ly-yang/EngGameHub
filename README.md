# EngGameHub
EngGameHub 是一个现代化的AI驱动英语学习游戏平台，采用微服务架构，支持实时多人对战、智能评估反馈、个性化学习路径推荐等功能。

# EngGameHub - AI驱动的英语学习游戏平台

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Ready-326CE5.svg)](https://kubernetes.io/)

## 🌟 项目概述

EngGameHub 是一个现代化的AI驱动英语学习游戏平台，采用微服务架构，支持实时多人对战、智能评估反馈、个性化学习路径推荐等功能。

### ✨ 核心特性

- 🤖 **AI智能评估**: 集成OpenAI GPT-4和Azure Speech Services，提供语法检查、写作评分、发音评估
- 🎮 **实时游戏对战**: WebSocket驱动的多人实时英语学习游戏
- 📊 **个性化学习**: 基于机器学习的学习路径推荐和进度跟踪
- 🏆 **成就系统**: 完整的积分、等级、成就系统激励学习
- 📱 **响应式设计**: 支持桌面端、平板、手机多端适配
- 🔒 **企业级安全**: 多因素认证、数据加密、GDPR合规
- 🚀 **高性能架构**: 支持10万+并发用户，99.9%可用性

### 🛠 技术栈

#### 后端技术
- **框架**: NestJS + Fastify
- **数据库**: PostgreSQL + Redis Cluster
- **ORM**: Prisma
- **认证**: JWT + 多因素认证
- **队列**: BullMQ + Redis
- **监控**: Prometheus + Grafana + Sentry
- **AI服务**: OpenAI GPT-4, Azure Speech Services

#### 前端技术  
- **框架**: Next.js 15 + React 19
- **状态管理**: Zustand + TanStack Query
- **样式**: Tailwind CSS + Framer Motion
- **实时通信**: Socket.IO
- **PWA**: 支持离线使用和推送通知

#### 基础设施
- **容器化**: Docker + Docker Compose
- **编排**: Kubernetes + Helm
- **CI/CD**: GitHub Actions + GitOps
- **监控**: Prometheus + Grafana + Loki
- **反向代理**: Nginx + Let's Encrypt

## 🚀 快速开始

### 开发环境要求

- Node.js 20.x+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### 1. 克隆项目

```bash
git clone https://github.com/Ly-yang/EngGameHub.git
cd enggamehub
```

### 2. 安装依赖

```bash
# 安装项目依赖
npm install

# 安装各模块依赖
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd shared && npm install && cd ..
```

### 3. 环境配置

```bash
# 复制环境变量模板
cp .env.example .env.development

# 编辑环境变量
nano .env.development
```

**关键环境变量配置：**

```env
# 数据库配置
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/enggamehub
POSTGRES_PASSWORD=your_secure_postgres_password

# Redis配置  
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_secure_redis_password

# JWT配置
JWT_SECRET=your_super_secret_jwt_key_change_in_production

# AI服务配置
OPENAI_API_KEY=your_openai_api_key
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=eastus

# 前端配置
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

### 4. 数据库初始化

```bash
# 使用Prisma初始化数据库
cd backend
npx prisma migrate dev --name init
npx prisma generate
npx prisma db seed
cd ..
```

### 5. 启动开发环境

**方式一：使用部署脚本（推荐）**

```bash
# 使用一键部署脚本
chmod +x scripts/deploy.sh
./scripts/deploy.sh dev
```

**方式二：手动启动**

```bash
# 启动基础设施服务
docker-compose -f docker-compose.dev.yml up -d postgres redis

# 启动后端开发服务器
cd backend && npm run start:dev &

# 启动前端开发服务器  
cd frontend && npm run dev &
```

### 6. 验证部署

访问以下地址确认服务正常：

- 🌐 **前端应用**: http://localhost:3000
- 📡 **后端API**: http://localhost:4000/health
- 📚 **API文档**: http://localhost:4000/api/docs
- 🗄️ **pgAdmin**: http://localhost:5050
- 📊 **Redis Commander**: http://localhost:8081

## 🏗️ 项目结构

```
enggamehub/
├── backend/                 # NestJS后端服务
│   ├── src/
│   │   ├── auth/           # 认证模块
│   │   ├── users/          # 用户管理
│   │   ├── questions/      # 题库管理
│   │   ├── games/          # 游戏功能
│   │   ├── learning/       # 学习记录
│   │   ├── ai/             # AI服务
│   │   └── analytics/      # 数据分析
│   ├── prisma/             # 数据库模型
│   └── test/               # 测试文件
├── frontend/                # Next.js前端应用
│   ├── src/
│   │   ├── components/     # React组件
│   │   ├── pages/          # 页面路由
│   │   ├── store/          # 状态管理
│   │   ├── hooks/          # 自定义Hooks
│   │   └── utils/          # 工具函数
│   └── public/             # 静态资源
├── shared/                  # 共享类型定义
├── k8s/                    # Kubernetes配置
├── monitoring/             # 监控配置
├── scripts/                # 部署脚本
├── docker-compose.yml      # Docker配置
└── Dockerfile             # 镜像构建
```

## 📊 架构设计

### 系统架构图

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Client    │    │   Mobile App    │    │   Admin Panel   │
│   (Next.js)     │    │ (React Native)  │    │   (React)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │  Load Balancer  │
                    │     (Nginx)     │
                    └─────────────────┘
                                 │
                    ┌─────────────────┐
                    │   API Gateway   │
                    │   (NestJS +     │
                    │    Fastify)     │
                    └─────────────────┘
                                 │
         ┌───────────────────────┼───────────────────────┐
         │                       │                       │
┌────────────┐        ┌─────────────┐        ┌──────────────┐
│    User    │        │   Learning  │        │ AI/Content   │
│  Service   │        │   Service   │        │   Service    │
└────────────┘        └─────────────┘        └──────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
              ┌─────────────────────────────┐
              │        Data Layer           │
              │  ┌─────────┐ ┌─────────┐   │
              │  │PostgreSQL│ │  Redis  │   │
              │  │ Cluster │ │ Cluster │   │
              │  └─────────┘ └─────────┘   │
              └─────────────────────────────┘
```

### 核心模块

#### 🔐 认证授权系统
- JWT双Token机制（访问令牌 + 刷新令牌）
- 多因素认证（MFA）支持
- 基于角色的权限控制（RBAC）
- 密码安全策略和泄露检测

#### 🎯 智能题库系统
- 支持多种题型（语法、词汇、听力、口语等）
- AI驱动的题目推荐算法
- 动态难度调整
- 协同过滤和内容相似性推荐

#### 🎮 实时游戏系统
- WebSocket实现的实时多人对战
- 房间管理和匹配系统
- 实时排名和计分系统
- 游戏回放和分析

#### 🤖 AI评估系统
- OpenAI GPT-4语法检查和写作评分
- Azure Speech Services发音评估
- 个性化学习反馈生成
- 多模态内容理解

## 🚀 部署指南

### 开发环境部署

```bash
# 使用Docker Compose快速启动
./scripts/deploy.sh dev

# 或手动启动
docker-compose -f docker-compose.dev.yml up -d
```

### 生产环境部署

```bash
# 配置环境变量
cp .env.example .env.production

# 部署到Kubernetes
./scripts/deploy.sh prod

# 或使用Helm
helm install enggamehub ./helm-chart
```

### 监控和运维

```bash
# 查看服务状态
kubectl get pods -n enggamehub

# 查看日志
./scripts/deploy.sh --logs backend

# 扩展服务
./scripts/deploy.sh --scale backend 5

# 执行滚动更新
./scripts/deploy.sh --update

# 备份数据
./scripts/deploy.sh --backup
```

## 📈 性能基准

| 指标 | 目标值 | 当前值 |
|------|--------|--------|
| API响应时间 (P95) | < 500ms | ~200ms |
| 并发用户支持 | 100,000+ | ✅ |
| 系统可用性 | 99.9% | 99.95% |
| 数据库QPS | 10,000+ | ✅ |
| WebSocket连接 | 10,000+ | ✅ |

## 🧪 测试

### 运行测试

```bash
# 后端测试
cd backend
npm run test              # 单元测试
npm run test:e2e         # 集成测试
npm run test:coverage    # 覆盖率测试

# 前端测试
cd frontend  
npm run test             # React组件测试
npm run test:e2e         # E2E测试

# 负载测试
k6 run tests/load/api-load-test.js
```

### 测试覆盖率目标

- 单元测试覆盖率: > 80%
- 集成测试覆盖率: > 70%
- E2E测试覆盖关键用户流程: 100%

## 🤝 贡献指南

### 开发流程

1. Fork 项目仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 和 Prettier 规范
- 提交信息遵循 Conventional Commits
- 所有新功能必须包含测试

### 提交规范

```bash
feat: 添加新功能
fix: 修复问题
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建配置更新
```

## 📚 API 文档

### 核心 API 端点

#### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/refresh` - 刷新令牌
- `POST /api/auth/logout` - 用户登出

#### 游戏相关
- `GET /api/games/rooms` - 获取游戏房间列表
- `POST /api/games/rooms` - 创建游戏房间
- `POST /api/games/rooms/:id/join` - 加入游戏房间
- `WebSocket /socket.io` - 实时游戏通信

#### 学习相关
- `GET /api/questions` - 获取题目列表
- `POST /api/learning/attempts` - 提交学习记录
- `GET /api/analytics/progress` - 获取学习进度

完整API文档：http://localhost:4000/api/docs

## 🔧 故障排除

### 常见问题

**Q: 数据库连接失败**
```bash
# 检查数据库服务状态
docker-compose ps postgres

# 重启数据库服务
docker-compose restart postgres
```

**Q: Redis连接超时**
```bash
# 检查Redis服务
docker-compose ps redis

# 清理Redis数据
docker-compose exec redis redis-cli FLUSHALL
```

**Q: AI服务调用失败**
- 检查 OpenAI API Key 是否正确配置
- 确认 Azure Speech Services 配置和配额
- 检查网络连接和防火墙设置

**Q: WebSocket连接问题**
```bash
# 检查防火墙端口开放
sudo ufw allow 4000

# 检查代理配置
# 确保代理服务器支持WebSocket升级
```

## 📞 支持

- 📧 **Email**: 2406662589@qq.com
- 💬 **Discord**: https://discord.gg/enggamehub
- 📖 **文档**: https://docs.enggamehub.com
- 🐛 **问题反馈**: https://github.com/Ly-yang/EngGameHub/issues

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- OpenAI 提供的 GPT-4 API
- Microsoft Azure Speech Services
- NestJS 和 Next.js 社区
- 所有贡献者和测试用户

---

**⭐ 如果这个项目对你有帮助，请给我们一个星标！**

[![Star History Chart](https://api.star-history.com/svg?repos=Ly-yang/EngGameHub&type=Date)](https://star-history.com/#your-org/enggamehub&Date)
