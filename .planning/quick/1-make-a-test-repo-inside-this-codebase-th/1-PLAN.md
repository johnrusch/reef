---
phase: quick
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - test-repos/sample-app/package.json
  - test-repos/sample-app/tsconfig.json
  - test-repos/sample-app/src/index.ts
  - test-repos/sample-app/src/server.ts
  - test-repos/sample-app/src/config/database.ts
  - test-repos/sample-app/src/config/env.ts
  - test-repos/sample-app/src/controllers/userController.ts
  - test-repos/sample-app/src/controllers/orderController.ts
  - test-repos/sample-app/src/services/userService.ts
  - test-repos/sample-app/src/services/orderService.ts
  - test-repos/sample-app/src/services/emailService.ts
  - test-repos/sample-app/src/services/paymentService.ts
  - test-repos/sample-app/src/models/User.ts
  - test-repos/sample-app/src/models/Order.ts
  - test-repos/sample-app/src/models/Product.ts
  - test-repos/sample-app/src/middleware/authMiddleware.ts
  - test-repos/sample-app/src/middleware/rateLimiter.ts
  - test-repos/sample-app/src/routes/userRoutes.ts
  - test-repos/sample-app/src/routes/orderRoutes.ts
  - test-repos/sample-app/src/types/index.ts
  - test-repos/sample-app/src/utils/logger.ts
  - test-repos/sample-app/src/utils/validators.ts
  - .gitignore
autonomous: true
requirements: []

must_haves:
  truths:
    - "test-repos/sample-app/ is a valid git repository (git init)"
    - "Context extractor detects it as a 'node' type with high confidence"
    - "The repo has files matching critical, important, and optional patterns for all C4 levels"
    - "The codebase has real TypeScript with classes, interfaces, imports, and exports — not stubs"
  artifacts:
    - path: "test-repos/sample-app/package.json"
      provides: "Node.js project with express, mongoose dependencies for type detection"
      contains: "express"
    - path: "test-repos/sample-app/src/index.ts"
      provides: "Entry point (critical file pattern)"
      min_lines: 10
    - path: "test-repos/sample-app/src/controllers/userController.ts"
      provides: "Controller layer (critical for node type, C4 component level)"
      min_lines: 30
    - path: "test-repos/sample-app/src/services/userService.ts"
      provides: "Service layer (important for node type, C4 component level)"
      min_lines: 30
    - path: "test-repos/sample-app/src/models/User.ts"
      provides: "Data model layer (important for node type, C4 code level)"
      min_lines: 20
    - path: "test-repos/sample-app/src/routes/userRoutes.ts"
      provides: "Route definitions (critical for node type)"
      min_lines: 15
    - path: "test-repos/sample-app/src/middleware/authMiddleware.ts"
      provides: "Middleware layer (critical for node type)"
      min_lines: 15
    - path: "test-repos/sample-app/src/types/index.ts"
      provides: "Type definitions (important for all types)"
      min_lines: 20
  key_links:
    - from: "src/index.ts"
      to: "src/server.ts"
      via: "import and bootstrap"
      pattern: "import.*server"
    - from: "src/routes/userRoutes.ts"
      to: "src/controllers/userController.ts"
      via: "router handler wiring"
      pattern: "import.*userController"
    - from: "src/controllers/userController.ts"
      to: "src/services/userService.ts"
      via: "service injection/import"
      pattern: "import.*userService"
    - from: "src/services/userService.ts"
      to: "src/models/User.ts"
      via: "data access"
      pattern: "import.*User"
    - from: "src/services/paymentService.ts"
      to: "external Stripe API"
      via: "HTTP client call"
      pattern: "stripe"
    - from: "src/services/emailService.ts"
      to: "external SendGrid API"
      via: "HTTP client call"
      pattern: "sendgrid"
---

<objective>
Create a realistic test repository at `test-repos/sample-app/` that exercises all 4 C4 diagram levels and triggers the context extractor's node-type detection patterns.

Purpose: Provide a local, self-contained repo for manual and automated testing of Reef's diagram generation without needing external repositories.

Output: A git-initialized TypeScript Express API project with controllers, services, models, middleware, routes, types, and external service integrations — enough structure for meaningful C4 Context, Container, Component, and Code level diagrams.
</objective>

<execution_context>
@/Users/johnrusch/.claude/get-shit-done/workflows/execute-plan.md
@/Users/johnrusch/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

The Reef context extractor (contextExtractorServiceV2.ts) detects repo types by:
1. Reading package.json for dependencies (express/fastify/koa = node-server, mongoose/sequelize/prisma = database)
2. Checking file structure for /controllers/, /routes/, /middleware/, /api/ (backend-structure)
3. Checking for /models/, /services/, /schemas/, /database/ (important for node type)
4. Looking for /types/, /interfaces/, /constants/ (important for all types)
5. Classifying files as critical/important/optional based on type-specific patterns

The diagram generator supports these C4 levels:
- c4-context: System + external systems + users
- c4-container: Apps, databases, services (deployable units)
- c4-component: Logical groupings within a container
- c4-code: Class-level implementation details

The test repo must be designed so each C4 level has distinct, meaningful content:
- Context: Express API system + PostgreSQL DB + Redis Cache + Stripe (payments) + SendGrid (email) + End Users
- Container: API Server (Express) + Database (PostgreSQL via Sequelize) + Cache (Redis) + Background Worker
- Component: Controllers, Services, Middleware, Routes, Models within the API Server container
- Code: Class hierarchies, interfaces, method signatures within services and models
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create project scaffold with package.json, tsconfig, types, and utility files</name>
  <files>
    test-repos/sample-app/package.json
    test-repos/sample-app/tsconfig.json
    test-repos/sample-app/src/types/index.ts
    test-repos/sample-app/src/config/database.ts
    test-repos/sample-app/src/config/env.ts
    test-repos/sample-app/src/utils/logger.ts
    test-repos/sample-app/src/utils/validators.ts
    .gitignore
  </files>
  <action>
    Create the foundational files for the test repository.

    **package.json**: A realistic Node.js project with these dependencies (version numbers are fine, we won't install):
    - express, cors, helmet (server)
    - sequelize, pg (database — triggers "database" characteristic)
    - redis, ioredis (cache)
    - stripe (external payment — for C4 context)
    - @sendgrid/mail (external email — for C4 context)
    - jsonwebtoken, bcrypt (auth)
    - winston (logging)
    - typescript, @types/express, @types/node, ts-node (devDeps)
    Scripts: "start": "node dist/index.js", "dev": "ts-node src/index.ts", "build": "tsc"

    **tsconfig.json**: Standard Node.js TypeScript config with strict mode, outDir: dist, rootDir: src, esModuleInterop: true.

    **src/types/index.ts**: Core type definitions and interfaces used throughout the app:
    - `interface IUser { id: string; email: string; username: string; passwordHash: string; role: UserRole; createdAt: Date; updatedAt: Date; }`
    - `enum UserRole { ADMIN = 'admin', USER = 'user', MODERATOR = 'moderator' }`
    - `interface IOrder { id: string; userId: string; items: IOrderItem[]; status: OrderStatus; totalAmount: number; paymentIntentId?: string; createdAt: Date; }`
    - `interface IOrderItem { productId: string; quantity: number; unitPrice: number; }`
    - `enum OrderStatus { PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED }`
    - `interface IProduct { id: string; name: string; description: string; price: number; stock: number; category: string; }`
    - `interface ApiResponse<T> { success: boolean; data?: T; error?: string; meta?: { page: number; total: number; }; }`
    - `interface PaginationOptions { page: number; limit: number; sortBy?: string; sortOrder?: 'asc' | 'desc'; }`
    - `interface AuthPayload { userId: string; role: UserRole; iat: number; exp: number; }`

    **src/config/database.ts**: Database configuration class:
    - `class DatabaseConfig` with Sequelize initialization, connection pool settings, retry logic
    - Method `connect()` that initializes Sequelize with PostgreSQL dialect
    - Method `disconnect()` for graceful shutdown
    - Uses env.ts for connection string
    - Export singleton instance

    **src/config/env.ts**: Environment configuration:
    - `const config = { port, databaseUrl, redisUrl, stripeSecretKey, sendgridApiKey, jwtSecret, jwtExpiresIn, nodeEnv }`
    - All read from process.env with sensible defaults
    - Export the config object

    **src/utils/logger.ts**: Logger utility class:
    - `class Logger` with methods: info, warn, error, debug
    - Formats log entries with timestamp and level
    - Constructor takes a `context` string for namespacing
    - Export factory function `createLogger(context: string): Logger`

    **src/utils/validators.ts**: Validation utility functions:
    - `validateEmail(email: string): boolean`
    - `validatePassword(password: string): { valid: boolean; errors: string[] }`
    - `validatePagination(options: PaginationOptions): PaginationOptions` (clamps values)
    - Export all as named exports

    **.gitignore update**: Add `test-repos/sample-app/node_modules/` to the project's .gitignore so the test repo's hypothetical node_modules are excluded but the source files are tracked.
  </action>
  <verify>
    <automated>ls -la test-repos/sample-app/package.json test-repos/sample-app/tsconfig.json test-repos/sample-app/src/types/index.ts test-repos/sample-app/src/config/database.ts test-repos/sample-app/src/config/env.ts test-repos/sample-app/src/utils/logger.ts test-repos/sample-app/src/utils/validators.ts && grep "express" test-repos/sample-app/package.json && grep "sequelize" test-repos/sample-app/package.json && grep "stripe" test-repos/sample-app/package.json</automated>
  </verify>
  <done>All scaffold files exist. package.json lists express, sequelize, stripe, sendgrid, redis deps. tsconfig.json has strict TypeScript config. Types file exports IUser, IOrder, IProduct interfaces and enums. Config files provide database and env setup. Utils provide logger and validators.</done>
</task>

<task type="auto">
  <name>Task 2: Create models, services, and external integrations (C4 Code + Component layers)</name>
  <files>
    test-repos/sample-app/src/models/User.ts
    test-repos/sample-app/src/models/Order.ts
    test-repos/sample-app/src/models/Product.ts
    test-repos/sample-app/src/services/userService.ts
    test-repos/sample-app/src/services/orderService.ts
    test-repos/sample-app/src/services/emailService.ts
    test-repos/sample-app/src/services/paymentService.ts
  </files>
  <action>
    Create model and service layers with real class hierarchies and cross-references for rich C4 diagrams.

    **Models** — These use Sequelize-style class patterns so the C4 code-level diagram has classes with methods:

    **src/models/User.ts**:
    - `class User` extending a base Model class (define locally)
    - Static methods: `findByEmail(email: string)`, `findByRole(role: UserRole)`
    - Instance methods: `comparePassword(password: string): Promise<boolean>`, `toSafeJSON(): Omit<IUser, 'passwordHash'>`
    - Properties matching IUser interface
    - Associations: `static associate(models: any)` defining hasMany Orders
    - Import from types/index and config/database

    **src/models/Order.ts**:
    - `class Order` extending base Model
    - Static methods: `findByUser(userId: string)`, `findByStatus(status: OrderStatus)`
    - Instance methods: `calculateTotal(): number`, `canCancel(): boolean`, `updateStatus(status: OrderStatus): Promise<void>`
    - Associations: belongsTo User, hasMany OrderItems (via Product)
    - Import from types/index

    **src/models/Product.ts**:
    - `class Product` extending base Model
    - Static methods: `findByCategory(category: string)`, `searchByName(query: string)`
    - Instance methods: `isInStock(): boolean`, `reserveStock(quantity: number): Promise<boolean>`
    - Import from types/index

    **Services** — Business logic layer with dependencies on models and external services:

    **src/services/userService.ts**:
    - `class UserService` with constructor taking no args (uses model directly)
    - Methods: `register(email, username, password): Promise<IUser>`, `authenticate(email, password): Promise<{ user: IUser; token: string }>`, `getProfile(userId): Promise<IUser>`, `updateProfile(userId, data): Promise<IUser>`, `listUsers(options: PaginationOptions): Promise<ApiResponse<IUser[]>>`
    - Imports: User model, EmailService (sends welcome email), Logger, validators, jwt and bcrypt references
    - Export singleton: `export default new UserService()`

    **src/services/orderService.ts**:
    - `class OrderService`
    - Methods: `createOrder(userId, items): Promise<IOrder>`, `processPayment(orderId): Promise<void>`, `getOrderHistory(userId, options: PaginationOptions): Promise<ApiResponse<IOrder[]>>`, `cancelOrder(orderId, userId): Promise<void>`, `updateOrderStatus(orderId, status): Promise<void>`
    - Imports: Order model, Product model, PaymentService (for Stripe), EmailService (for order confirmation), Logger
    - Demonstrates cross-service dependencies ideal for C4 component diagrams
    - Export singleton: `export default new OrderService()`

    **src/services/emailService.ts**:
    - `class EmailService` wrapping SendGrid
    - Methods: `sendWelcomeEmail(user: IUser): Promise<void>`, `sendOrderConfirmation(order: IOrder, user: IUser): Promise<void>`, `sendPasswordReset(user: IUser, resetToken: string): Promise<void>`, `sendShippingNotification(order: IOrder): Promise<void>`
    - Private method: `send(to: string, subject: string, html: string): Promise<void>`
    - Imports: config/env for API key, Logger
    - This represents an external system boundary for C4 context level
    - Export singleton: `export default new EmailService()`

    **src/services/paymentService.ts**:
    - `class PaymentService` wrapping Stripe
    - Methods: `createPaymentIntent(amount: number, currency: string, metadata: Record<string, string>): Promise<{ clientSecret: string; paymentIntentId: string }>`, `confirmPayment(paymentIntentId: string): Promise<boolean>`, `refundPayment(paymentIntentId: string, amount?: number): Promise<void>`, `createCustomer(user: IUser): Promise<string>`
    - Imports: config/env for Stripe key, Logger
    - This represents another external system boundary for C4 context level
    - Export singleton: `export default new PaymentService()`

    All files should have real TypeScript implementations (not just type stubs). Methods should have realistic bodies with try/catch, logging, validation, and appropriate return types. Use `// TODO: implement` comments sparingly — most logic should be fleshed out with realistic code paths even if the external calls are simulated.
  </action>
  <verify>
    <automated>find test-repos/sample-app/src/models -name "*.ts" | wc -l && find test-repos/sample-app/src/services -name "*.ts" | wc -l && grep -l "class.*Service" test-repos/sample-app/src/services/*.ts && grep -l "class.*extends" test-repos/sample-app/src/models/*.ts</automated>
  </verify>
  <done>3 model files with class hierarchies and association methods. 4 service files with cross-dependencies (orderService imports paymentService and emailService, userService imports emailService). Each class has 3+ methods with real implementations. Models import from types/index. Services import from models and other services.</done>
</task>

<task type="auto">
  <name>Task 3: Create controllers, middleware, routes, server entry point, and initialize git repo</name>
  <files>
    test-repos/sample-app/src/controllers/userController.ts
    test-repos/sample-app/src/controllers/orderController.ts
    test-repos/sample-app/src/middleware/authMiddleware.ts
    test-repos/sample-app/src/middleware/rateLimiter.ts
    test-repos/sample-app/src/routes/userRoutes.ts
    test-repos/sample-app/src/routes/orderRoutes.ts
    test-repos/sample-app/src/server.ts
    test-repos/sample-app/src/index.ts
  </files>
  <action>
    Create the HTTP layer (controllers, middleware, routes) and wire everything together. Then git init the repo.

    **src/controllers/userController.ts**:
    - `class UserController`
    - Methods (Express request handlers): `register(req, res)`, `login(req, res)`, `getProfile(req, res)`, `updateProfile(req, res)`, `listUsers(req, res)`
    - Each method: validates input, calls userService, formats ApiResponse, handles errors
    - Import: userService, types, validators, Logger
    - Export singleton: `export default new UserController()`

    **src/controllers/orderController.ts**:
    - `class OrderController`
    - Methods: `createOrder(req, res)`, `getOrder(req, res)`, `getOrderHistory(req, res)`, `cancelOrder(req, res)`, `processPayment(req, res)`
    - Each method: validates input, calls orderService, formats ApiResponse, handles errors
    - Import: orderService, types, Logger
    - Export singleton: `export default new OrderController()`

    **src/middleware/authMiddleware.ts**:
    - `class AuthMiddleware`
    - Methods: `authenticate(req, res, next)` — extracts JWT from Authorization header, verifies, attaches user to req
    - Methods: `authorize(...roles: UserRole[])` — returns middleware that checks req.user.role
    - Methods: `optionalAuth(req, res, next)` — like authenticate but doesn't fail if no token
    - Import: types (AuthPayload, UserRole), config/env, Logger
    - Export singleton: `export default new AuthMiddleware()`

    **src/middleware/rateLimiter.ts**:
    - `class RateLimiter`
    - Uses in-memory Map (references Redis in comments for production)
    - Methods: `limit(windowMs: number, maxRequests: number)` — returns Express middleware
    - Methods: `resetLimit(key: string): void`
    - Import: Logger
    - Export singleton: `export default new RateLimiter()`

    **src/routes/userRoutes.ts**:
    - Creates Express Router
    - Wires routes: POST /register, POST /login, GET /profile (auth required), PUT /profile (auth required), GET /users (admin only)
    - Import: userController, authMiddleware, rateLimiter
    - Export the router

    **src/routes/orderRoutes.ts**:
    - Creates Express Router
    - Wires routes: POST /orders (auth), GET /orders (auth), GET /orders/:id (auth), POST /orders/:id/pay (auth), DELETE /orders/:id (auth)
    - Import: orderController, authMiddleware
    - Export the router

    **src/server.ts**:
    - `class Server`
    - Constructor initializes Express app with cors, helmet, json parsing
    - Method `configureRoutes()` — mounts userRoutes at /api/users, orderRoutes at /api/orders
    - Method `configureMiddleware()` — sets up global middleware
    - Method `start(port: number)` — starts listening, connects database
    - Method `stop()` — graceful shutdown
    - Import: express, routes, database config, Logger

    **src/index.ts**:
    - Import Server from server.ts
    - Import config from config/env
    - Create server instance, call start(config.port)
    - Handle SIGTERM/SIGINT for graceful shutdown
    - This is the application entry point

    **Git initialization**:
    After creating all files, run:
    1. `cd test-repos/sample-app && git init`
    2. `cd test-repos/sample-app && git add .`
    3. `cd test-repos/sample-app && git commit -m "Initial commit: Express API with user and order management"`

    This makes it a valid git repo that Reef can operate on (GitService requires .git).
  </action>
  <verify>
    <automated>cd test-repos/sample-app && git log --oneline && git status && echo "---" && find src -name "*.ts" | sort | wc -l && echo "---" && grep -r "import.*from" src/routes/ | head -10</automated>
  </verify>
  <done>
    All 20+ TypeScript files exist across controllers/, services/, models/, middleware/, routes/, types/, config/, utils/ directories. The repo is a valid git repository with at least one commit. Routes import controllers and middleware. Controllers import services. Services import models and other services. Models import types. Entry point (index.ts) imports server.ts. The full import graph creates meaningful content at all 4 C4 levels:
    - Context: Express API + PostgreSQL + Redis + Stripe + SendGrid + Users
    - Container: API Server + Database + Cache
    - Component: Controllers, Services, Middleware, Routes, Models
    - Code: Class hierarchies with methods, interfaces, enums
  </done>
</task>

</tasks>

<verification>
After all tasks complete, verify the test repo is viable for Reef's diagram generation:

1. `cd test-repos/sample-app && git log --oneline` — has at least one commit
2. `ls test-repos/sample-app/src/{controllers,services,models,middleware,routes,types,config,utils}` — all directories exist
3. `find test-repos/sample-app/src -name "*.ts" | wc -l` — at least 18 TypeScript files
4. `grep -r "import.*from" test-repos/sample-app/src/ | wc -l` — substantial import graph (30+ import statements)
5. `grep -c "class " test-repos/sample-app/src/**/*.ts` — at least 10 classes defined
</verification>

<success_criteria>
- test-repos/sample-app/ is a git repository with committed TypeScript source
- Context extractor would detect type "node" with characteristics: node-server, database, backend-structure
- All 4 C4 levels have distinct content: external systems (context), deployable units (container), logical groupings (component), class details (code)
- Files match the extractor's critical patterns: /controllers/, /routes/, /middleware/ (node critical); /models/, /services/ (node important); /types/ (all important); /utils/ (optional)
- Cross-file import graph is realistic — no orphan files, services depend on models, controllers depend on services, routes depend on controllers
</success_criteria>

<output>
After completion, create `.planning/quick/1-make-a-test-repo-inside-this-codebase-th/1-SUMMARY.md`
</output>
