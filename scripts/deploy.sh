#!/bin/bash

# EngGameHub 一键部署脚本
# 支持开发、测试、生产环境部署

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    cat << EOF
EngGameHub 部署脚本

用法: $0 [选项] <环境>

环境:
    dev         开发环境 (docker-compose)
    staging     测试环境 (kubernetes)
    prod        生产环境 (kubernetes)

选项:
    -h, --help      显示此帮助信息
    -v, --verbose   详细输出
    -c, --clean     清理现有部署
    --skip-build    跳过镜像构建
    --skip-migrate  跳过数据库迁移
    --dry-run       只显示将要执行的命令

示例:
    $0 dev                    # 部署开发环境
    $0 prod -c                # 清理并部署生产环境
    $0 staging --skip-build   # 部署测试环境但跳过构建
EOF
}

# 检查依赖
check_dependencies() {
    local missing_deps=()
    
    # 检查必需的命令
    command -v docker >/dev/null 2>&1 || missing_deps+=("docker")
    command -v docker-compose >/dev/null 2>&1 || missing_deps+=("docker-compose")
    
    if [[ "$ENVIRONMENT" == "staging" || "$ENVIRONMENT" == "prod" ]]; then
        command -v kubectl >/dev/null 2>&1 || missing_deps+=("kubectl")
        command -v helm >/dev/null 2>&1 || missing_deps+=("helm")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        log_error "缺少以下依赖: ${missing_deps[*]}"
        log_info "请安装缺少的依赖后重试"
        exit 1
    fi
    
    log_success "依赖检查通过"
}

# 检查环境变量
check_environment_variables() {
    log_info "检查环境变量..."
    
    local env_file=".env.${ENVIRONMENT}"
    
    if [[ ! -f "$env_file" ]]; then
        log_warning "环境文件 $env_file 不存在，创建示例文件..."
        create_env_template "$env_file"
        log_error "请编辑 $env_file 文件并重新运行部署脚本"
        exit 1
    fi
    
    # 加载环境变量
    set -a
    source "$env_file"
    set +a
    
    # 检查必需的环境变量
    local required_vars=(
        "POSTGRES_PASSWORD"
        "REDIS_PASSWORD"
        "JWT_SECRET"
        "OPENAI_API_KEY"
    )
    
    local missing_vars=()
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var}" ]]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "缺少以下环境变量: ${missing_vars[*]}"
        log_info "请在 $env_file 文件中设置这些变量"
        exit 1
    fi
    
    log_success "环境变量检查通过"
}

# 创建环境变量模板
create_env_template() {
    local env_file="$1"
    
    cat > "$env_file" << 'EOF'
# 数据库配置
POSTGRES_PASSWORD=your_secure_postgres_password
DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@localhost:5432/enggamehub

# Redis配置
REDIS_PASSWORD=your_secure_redis_password

# JWT配置
JWT_SECRET=your_super_secret_jwt_key_change_in_production

# AI服务配置
OPENAI_API_KEY=your_openai_api_key
AZURE_SPEECH_KEY=your_azure_speech_key
AZURE_SPEECH_REGION=eastus

# 邮件配置
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# 监控配置 (可选)
GRAFANA_PASSWORD=your_grafana_password
PGADMIN_PASSWORD=your_pgadmin_password
SENTRY_DSN=your_sentry_dsn

# 域名配置 (生产环境)
DOMAIN=enggamehub.com
API_DOMAIN=api.enggamehub.com

# SSL证书邮箱 (生产环境)
ACME_EMAIL=admin@enggamehub.com
EOF
    
    log_info "已创建环境变量模板文件: $env_file"
}

# 构建Docker镜像
build_images() {
    if [[ "$SKIP_BUILD" == "true" ]]; then
        log_info "跳过镜像构建"
        return
    fi
    
    log_info "构建Docker镜像..."
    
    # 构建标签
    local tag="latest"
    if [[ "$ENVIRONMENT" != "dev" ]]; then
        tag="${ENVIRONMENT}-$(date +%Y%m%d%H%M%S)"
    fi
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] docker build -t enggamehub:$tag ."
        return
    fi
    
    # 构建镜像
    docker build -t "enggamehub:$tag" .
    
    # 为不同环境打标签
    if [[ "$ENVIRONMENT" != "dev" ]]; then
        docker tag "enggamehub:$tag" "enggamehub:$ENVIRONMENT"
    fi
    
    log_success "镜像构建完成: enggamehub:$tag"
}

# 开发环境部署
deploy_development() {
    log_info "部署开发环境..."
    
    if [[ "$CLEAN" == "true" ]]; then
        log_info "清理现有开发环境..."
        if [[ "$DRY_RUN" != "true" ]]; then
            docker-compose -f docker-compose.dev.yml down -v --remove-orphans
        else
            log_info "[DRY RUN] docker-compose -f docker-compose.dev.yml down -v --remove-orphans"
        fi
    fi
    
    if [[ "$DRY_RUN" != "true" ]]; then
        docker-compose -f docker-compose.dev.yml up -d
    else
        log_info "[DRY RUN] docker-compose -f docker-compose.dev.yml up -d"
    fi
    
    # 等待服务启动
    if [[ "$DRY_RUN" != "true" ]]; then
        log_info "等待服务启动..."
        sleep 30
        
        # 健康检查
        check_service_health "http://localhost:4000/health" "Backend"
        check_service_health "http://localhost:3000" "Frontend"
    fi
    
    log_success "开发环境部署完成!"
    log_info "前端访问地址: http://localhost:3000"
    log_info "后端API地址: http://localhost:4000"
    log_info "API文档地址: http://localhost:4000/api/docs"
    log_info "pgAdmin地址: http://localhost:5050"
    log_info "Redis Commander: http://localhost:8081"
}

# Kubernetes部署
deploy_kubernetes() {
    log_info "部署到Kubernetes ($ENVIRONMENT)..."
    
    # 检查kubectl连接
    if [[ "$DRY_RUN" != "true" ]]; then
        kubectl cluster-info >/dev/null 2>&1 || {
            log_error "无法连接到Kubernetes集群"
            exit 1
        }
    fi
    
    # 创建命名空间
    if [[ "$DRY_RUN" != "true" ]]; then
        kubectl create namespace enggamehub --dry-run=client -o yaml | kubectl apply -f -
    else
        log_info "[DRY RUN] kubectl create namespace enggamehub"
    fi
    
    # 清理现有部署
    if [[ "$CLEAN" == "true" ]]; then
        log_info "清理现有Kubernetes部署..."
        if [[ "$DRY_RUN" != "true" ]]; then
            kubectl delete -f k8s/ --ignore-not-found=true
        else
            log_info "[DRY RUN] kubectl delete -f k8s/"
        fi
    fi
    
    # 创建secrets
    create_kubernetes_secrets
    
    # 应用配置
    if [[ "$DRY_RUN" != "true" ]]; then
        kubectl apply -f k8s/
    else
        log_info "[DRY RUN] kubectl apply -f k8s/"
    fi
    
    # 等待部署完成
    if [[ "$DRY_RUN" != "true" ]]; then
        log_info "等待部署完成..."
        kubectl wait --for=condition=ready pod -l app=enggamehub-backend -n enggamehub --timeout=300s
        kubectl wait --for=condition=ready pod -l app=enggamehub-frontend -n enggamehub --timeout=300s
    fi
    
    log_success "Kubernetes部署完成!"
    
    # 显示访问信息
    show_kubernetes_info
}

# 创建Kubernetes secrets
create_kubernetes_secrets() {
    log_info "创建Kubernetes secrets..."
    
    if [[ "$DRY_RUN" == "true" ]]; then
        log_info "[DRY RUN] 创建secrets"
        return
    fi
    
    # 从环境变量创建secret
    kubectl create secret generic enggamehub-secrets \
        --from-literal=DATABASE_URL="$DATABASE_URL" \
        --from-literal=POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
        --from-literal=REDIS_PASSWORD="$REDIS_PASSWORD" \
        --from-literal=JWT_SECRET="$JWT_SECRET" \
        --from-literal=OPENAI_API_KEY="$OPENAI_API_KEY" \
        --from-literal=AZURE_SPEECH_KEY="$AZURE_SPEECH_KEY" \
        --from-literal=AZURE_SPEECH_REGION="$AZURE_SPEECH_REGION" \
        --from-literal=ENCRYPTION_KEY="$(openssl rand -base64 32)" \
        --from-literal=SMTP_USER="$SMTP_USER" \
        --from-literal=SMTP_PASS="$SMTP_PASS" \
        -n enggamehub \
        --dry-run=client -o yaml | kubectl apply -f -
    
    log_success "Secrets创建完成"
}

# 数据库迁移
run_database_migration() {
    if [[ "$SKIP_MIGRATE" == "true" ]]; then
        log_info "跳过数据库迁移"
        return
    fi
    
    log_info "运行数据库迁移..."
    
    if [[ "$ENVIRONMENT" == "dev" ]]; then
        if [[ "$DRY_RUN" != "true" ]]; then
            docker-compose -f docker-compose.dev.yml exec backend npm run db:migrate
        else
            log_info "[DRY RUN] docker-compose exec backend npm run db:migrate"
        fi
    else
        if [[ "$DRY_RUN" != "true" ]]; then
            kubectl exec -n enggamehub deployment/enggamehub-backend -- npm run db:migrate
        else
            log_info "[DRY RUN] kubectl exec deployment/enggamehub-backend -- npm run db:migrate"
        fi
    fi
    
    log_success "数据库迁移完成"
}

# 服务健康检查
check_service_health() {
    local url="$1"
    local service_name="$2"
    local max_attempts=30
    local attempt=1
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$url" >/dev/null 2>&1; then
            log_success "$service_name 健康检查通过"
            return 0
        fi
        
        log_info "等待 $service_name 启动... ($attempt/$max_attempts)"
        sleep 5
        ((attempt++))
    done
    
    log_error "$service_name 健康检查失败"
    return 1
}

# 显示Kubernetes信息
show_kubernetes_info() {
    if [[ "$DRY_RUN" == "true" ]]; then
        return
    fi
    
    log_info "获取服务信息..."
    
    # 获取外部IP
    local external_ip=$(kubectl get ingress enggamehub-ingress -n enggamehub -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
    
    if [[ "$external_ip" != "
