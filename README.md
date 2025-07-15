# URL Shortener - Arquitetura de Microsserviços

Este projeto demonstra a implementação de um encurtador de URLs utilizando arquitetura de microsserviços, aplicando padrões modernos e melhores práticas para sistemas distribuídos.

## 🏗️ Visão Geral da Arquitetura

O sistema é composto por três microsserviços independentes que se comunicam de forma assíncrona:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Auth Service    │     │ URL Shortener   │     │ Analytics       │
│ (Port 3002)     │     │ (Port 3000)     │     │ (Port 3001)     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                         │
         └───────────┬───────────┴─────────────┬───────────┘
                     │                         │
              ┌──────▼──────┐          ┌───────▼────────┐
              │ Kong Gateway│          │ Apache Kafka   │
              │ (Port 8000) │          │ (Port 9092)    │
              └─────────────┘          └────────────────┘
```

## 🎯 Padrões de Microsserviços Implementados

### 1. **API Gateway Pattern**
- Ponto único de entrada via Kong Gateway
- Roteamento inteligente e load balancing
- Autenticação centralizada com JWT
- [Documentação completa →](docs/04-api-gateway.md)

### 2. **Database per Service**
- Cada serviço possui seu próprio banco PostgreSQL
- Isolamento completo de dados
- Schema evolution independente
- [Documentação completa →](docs/02-persistencia-distribuida.md)

### 3. **Event-Driven Architecture**
- Comunicação assíncrona via Apache Kafka
- Publish-Subscribe pattern
- Baixo acoplamento entre serviços
- [Documentação completa →](docs/03-comunicacao-assincrona.md)

### 4. **Token-Based Authentication**
- Autenticação centralizada com JWT
- Validação stateless via JWKS
- Context injection nos serviços downstream
- [Documentação completa →](docs/01-autenticacao.md)

### 5. **Distributed Tracing**
- OpenTelemetry para observabilidade
- Jaeger para visualização de traces
- Correlação automática entre serviços
- [Documentação completa →](docs/05-rastreamento-distribuido.md)

### 6. **Idempotent Consumer**
- Processamento exactly-once de eventos
- Deduplicação automática
- Resiliência a falhas e retries
- [Documentação completa →](docs/06-idempotencia.md)

## 🚀 Tecnologias Utilizadas

- **Runtime**: Node.js 22 com TypeScript nativo
- **Framework**: Fastify com validação Zod
- **Banco de Dados**: PostgreSQL com Drizzle ORM
- **Mensageria**: Apache Kafka
- **API Gateway**: Kong
- **Observabilidade**: OpenTelemetry + Jaeger
- **Containerização**: Docker & Docker Compose

## 📦 Estrutura do Projeto

```
.
├── apps/
│   ├── auth/                    # Serviço de autenticação
│   ├── url-shortener/           # Serviço principal
│   └── analytics/               # Serviço de analytics
├── shared/                      # Código compartilhado
├── contracts/                   # Contratos de eventos
├── kong/                        # Configuração do gateway
├── docs/                        # Documentação detalhada
└── docker-compose.yml           # Infraestrutura
```

## 🏃 Quick Start

### Pré-requisitos
- Node.js 22 LTS
- Docker & Docker Compose
- Git

### Instalação e Execução

1. **Clone o repositório**
```bash
git clone <repository-url>
cd 09-fundamentos-microsservicos
```

2. **Configure as variáveis de ambiente**
```bash
cp apps/auth/.env.example apps/auth/.env
cp apps/url-shortener/.env.example apps/url-shortener/.env
cp apps/analytics/.env.example apps/analytics/.env
```

3. **Inicie a infraestrutura**
```bash
docker-compose up -d
```

4. **Instale as dependências**
```bash
cd apps/auth && npm install
cd ../url-shortener && npm install
cd ../analytics && npm install
```

5. **Execute as migrações**
```bash
cd apps/auth && npm run db:push
cd ../url-shortener && npm run db:push
cd ../analytics && npm run db:push
```

6. **Inicie os serviços**
```bash
# Terminal 1
cd apps/auth && npm run dev

# Terminal 2
cd apps/url-shortener && npm run dev

# Terminal 3
cd apps/analytics && npm run dev
```

## 🔍 Principais Endpoints

### Autenticação
- `POST /auth/register` - Registro de usuário
- `POST /auth/login` - Login
- `POST /auth/refresh` - Renovar token
- `GET /auth/profile` - Perfil do usuário

### URL Shortener
- `POST /api/urls` - Criar URL curta
- `GET /api/urls` - Listar URLs do usuário
- `GET /:shortCode` - Redirecionar URL

### Analytics
- `GET /api/analytics/overview` - Visão geral
- `GET /api/analytics/urls/:shortCode` - Analytics por URL
- `GET /api/analytics/realtime` - Dados em tempo real

## 🏗️ Benefícios da Arquitetura

### Escalabilidade
- Serviços podem ser escalados independentemente
- Load balancing automático via Kong
- Processamento assíncrono via Kafka

### Resiliência
- Falhas isoladas por serviço
- Circuit breaker no gateway
- Retry automático com idempotência

### Manutenibilidade
- Deploy independente por serviço
- Versionamento de APIs
- Observabilidade completa

### Flexibilidade
- Tecnologias podem variar por serviço
- Schema evolution independente
- Novos serviços facilmente adicionados

## 📊 Monitoramento

### Jaeger UI
Acesse `http://localhost:16686` para visualizar traces distribuídos

### Kong Manager
Acesse `http://localhost:8002` para gerenciar o API Gateway

### Logs
Todos os serviços produzem logs estruturados com correlation IDs

## 🧪 Desenvolvimento

### Scripts Disponíveis

```bash
npm run dev        # Inicia em modo watch
npm run test       # Executa testes
npm run lint       # Linting com Biome
npm run db:push    # Aplica migrações
npm run db:studio  # Drizzle Studio
```

### Convenções
- TypeScript com experimental stripping
- Validação com Zod em todos endpoints
- Arquivos `.ts` para imports locais
- Biome para formatação e linting

## 📚 Documentação Detalhada

Para entender profundamente cada padrão implementado:

1. [Autenticação Centralizada](docs/01-autenticacao.md)
2. [Persistência Distribuída](docs/02-persistencia-distribuida.md)
3. [Comunicação Assíncrona](docs/03-comunicacao-assincrona.md)
4. [API Gateway](docs/04-api-gateway.md)
5. [Rastreamento Distribuído](docs/05-rastreamento-distribuido.md)
6. [Idempotência](docs/06-idempotencia.md)

## 🤝 Contribuindo

Este projeto foi criado para fins educacionais sobre arquitetura de microsserviços. Contribuições são bem-vindas!

## 📝 Licença

MIT License - veja o arquivo LICENSE para detalhes.