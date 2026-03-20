🔐 Authentication Backend
=========================

A secure, production-ready authentication system built with **Node.js**, **TypeScript**, **Prisma**, and **PostgreSQL**. Implements dual-token auth, session management, OTP email verification, and refresh token rotation.

📁 Folder Structure
-------------------

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   src/  ├── controller/  │   └── authController.ts     # req/res handling — login, register, logout, getMe  ├── routes/  │   └── authRoutes.ts         # Express route definitions  ├── services/  │   └── emailService.ts       # Nodemailer + Gmail OAuth2 email sending  ├── utils/  │   ├── types.ts              # Zod schemas for input validation  │   └── otp.ts                # OTP generator + HTML email template  ├── generated/  │   └── prisma/               # Auto-generated Prisma client  ├── db.ts                     # Prisma client singleton  └── server.ts                 # Express app entry point   `

🔑 Core Concepts
----------------

### Why Two Tokens? (AccessToken + RefreshToken)

Using a single token creates a dilemma:

Single Token ApproachProblemNever expiresIf stolen → attacker has permanent access ❌Expires in 15 minUser must login every 15 minutes ❌

**Solution — 2 Token System:**

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   AccessToken  (15 min)  →  sent in every API request header  RefreshToken (7 days)  →  only used to generate a new AccessToken   `

### Token Storage

TokenWhere StoredWhyaccessTokenJS memory (frontend)XSS-safe; lost on page refresh by designrefreshTokenHttpOnly CookieJS cannot access it — XSS saferefreshTokenHashDatabasePlain token never persisted — DB breach safe

🔄 Full Auth Flow
-----------------

### 1\. Register

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   POST /auth/register    → Validate input (Zod)    → Check if email already exists    → Hash password (bcrypt, salt rounds: 5)    → Create user (verified: false)    → Generate 6-digit OTP    → Hash OTP with SHA-256 → save to DB    → Send OTP via email (HTML template)    → Return user info   `

### 2\. Login

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   POST /auth/login    → Validate input (Zod)    → Find user by email    → Compare password (bcrypt.compare)    → Sign refreshToken (JWT, 7d) — contains { id }    → Hash refreshToken (SHA-256) → save to DB as session    → Sign accessToken (JWT, 15m) — contains { id, sessionId }    → Set refreshToken in HttpOnly cookie    → Return accessToken + user info   `

### 3\. GetMe (Protected Route)

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   GET /auth/me    Authorization: Bearer     → Extract token from header (split " ")[1]    → Verify JWT → decode { id, sessionId }    → Find session by sessionId WHERE revoked = false    → Session revoked? → 401    → Fetch user by id    → Return user info   `

### 4\. Refresh Token

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   POST /auth/refresh    (refreshToken sent automatically via cookie)    → Extract refreshToken from cookie    → Verify JWT → decode { id }    → Hash token (SHA-256) → find session in DB    → Session not found or revoked? → 401    → Generate new accessToken (15m)    → Generate new refreshToken (7d)         ← Rotation    → Hash new refreshToken → update DB      ← Old token now invalid    → Set new refreshToken in cookie    → Return new accessToken   `

### 5\. Logout

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   POST /auth/logout    → Extract refreshToken from cookie    → Hash it → find session in DB    → Set session.revoked = true             ← Backend logout    → Clear cookie                           ← Frontend logout   `

### 6\. Logout All Devices

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   POST /auth/logout-all    → Extract refreshToken from cookie    → Verify JWT → decode { id }    → updateMany sessions WHERE userId = id → revoked: true    → Clear cookie   `

🛡️ Security Decisions
----------------------

### Why Hash the RefreshToken Before Storing?

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   Scenario: Database gets leaked  Without hashing:    Attacker has valid refreshTokens → can impersonate any user ❌  With SHA-256 hash:    Attacker has only hashes → cannot reverse to original token ✅    Same concept as password hashing   `

**Why SHA-256 (not bcrypt) for tokens?**

*   RefreshTokens are already long random strings (JWT) — brute force is impossible
    
*   bcrypt is intentionally slow → unnecessary overhead for tokens
    
*   SHA-256 is fast and deterministic — same input always gives same hash (needed for lookup)
    

### Why Store SessionId Inside AccessToken?

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   Without sessionId in JWT:    User logs out → session.revoked = true    Attacker uses old accessToken (still valid for 14 min)    Server has no way to check — 401 never triggers ❌  With sessionId in JWT:    Every protected route checks session.revoked    Logout immediately invalidates accessToken too ✅   `

### Refresh Token Rotation

Every time /refresh is called:

*   A **new** refreshToken is generated and set in cookie
    
*   A **new** hash is saved in DB (old hash deleted)
    
*   Old refreshToken is now invalid
    

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   If attacker steals refreshToken_1:    User refreshes → hash updated to hash_2 in DB    Attacker uses refreshToken_1 → hash_1 not in DB → 401 ✅   `

📧 Email Service (Gmail OAuth2)
-------------------------------

Uses **Nodemailer** with **Gmail OAuth2** — more secure than App Passwords.

### Setup

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   GOOGLE_USER=your@gmail.com  GOOGLE_CLIENT_ID=your_client_id  GOOGLE_CLIENT_SECRET=your_client_secret  GOOGLE_REFRESH_TOKEN=your_oauth_refresh_token   `

### How It Works

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   nodemailer.createTransport({ OAuth2 credentials })      ↓  transporter.sendMail({ to, subject, text, html })      ↓  Gmail sends email on your behalf   `

### OTP Email

*   6-digit OTP generated with Math.floor(100000 + Math.random() \* 900000)
    
*   Hashed with SHA-256 before saving to DB — plain OTP never persisted
    
*   Styled HTML email template sent to user
    
*   Valid for **10 minutes**
    

🗄️ Database Schema (Prisma)
----------------------------

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   model User {    id        String    @id @default(uuid())    username  String    email     String    @unique    password  String    # bcrypt hash    verified  Boolean   @default(false)    otps      Otp[]    sessions  Session[]  }  model Session {    id               String   @id @default(uuid())    userId           String    user             User     @relation(fields: [userId], references: [id])    refreshTokenHash String   # SHA-256 hash — plain token never stored    ip               String    userAgent        String    revoked          Boolean  @default(false)    createdAt        DateTime @default(now())  }  model Otp {    id        String   @id @default(uuid())    otpHash   String   # SHA-256 hash    email     String    userId    String    user      User     @relation(fields: [userId], references: [id])    createdAt DateTime @default(now())    updatedAt DateTime @updatedAt  }   `

🧹 Session Cleanup (Cron Job)
-----------------------------

Sessions accumulate over time — revoked and expired sessions must be cleaned:

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   // Runs every night at 2 AM  cron.schedule("0 2 * * *", async () => {    await prismaClient.session.deleteMany({      where: {        OR: [          { revoked: true },          { createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }        ]      }    });  });   `

⚙️ Environment Variables
------------------------

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   DATABASE_URL=postgresql://user:password@localhost:5432/auth_db  JWT_SECRET=your_super_secret_key  GOOGLE_USER=your@gmail.com  GOOGLE_CLIENT_ID=xxx  GOOGLE_CLIENT_SECRET=xxx  GOOGLE_REFRESH_TOKEN=xxx   `

🚀 Getting Started
------------------

Plain textANTLR4BashCC#CSSCoffeeScriptCMakeDartDjangoDockerEJSErlangGitGoGraphQLGroovyHTMLJavaJavaScriptJSONJSXKotlinLaTeXLessLuaMakefileMarkdownMATLABMarkupObjective-CPerlPHPPowerShell.propertiesProtocol BuffersPythonRRubySass (Sass)Sass (Scss)SchemeSQLShellSwiftSVGTSXTypeScriptWebAssemblyYAMLXML`   # Install dependencies  pnpm install  # Generate Prisma client  pnpx prisma generate  # Run migrations  pnpx prisma migrate dev  # Start dev server  pnpm run dev   `

📡 API Endpoints
----------------

MethodEndpointAuth RequiredDescriptionPOST/auth/registerNoRegister new userPOST/auth/loginNoLogin, get tokensGET/auth/meBearer TokenGet current userPOST/auth/refreshCookieGet new access tokenPOST/auth/logoutCookieLogout current devicePOST/auth/logout-allCookieLogout all devicesPOST/auth/verify-emailNoVerify OTP