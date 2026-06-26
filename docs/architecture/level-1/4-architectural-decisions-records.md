## Architectural Records

The sections below include all the Architectural decisions relevant to Level 1 architecture for EU Delegations Guide

### Hosting Decision

**Context**:
The application needs to be hosted in a secure, reliable environment that meets EEAS security requirements while providing good performance for users across Europe.

**Considered Options**:
- **Internal EEAS Network**: Host on EEAS internal infrastructure with full control but limited scalability
- **Testa DMZ**: EEAS Testa hosting in DMZ with good security but higher costs
- **Internet DMZ**: Public cloud hosting with best performance but highest security concerns

**Decision Outcome**:
- **Current Option**: DMZ VM (Dedicated virtual machine in EEAS DMZ)
- **Rationale**: Balances security requirements with performance and cost-effectiveness
- **Hosting Provider**: EEAS infrastructure team
- **Compliance**: Meets all EEAS security and data protection requirements

**Implications**:
- ✅ Good performance for EU-based users
- ✅ Meets data sovereignty requirements
- ✅ Controlled environment with EEAS security policies
- ⚠️ Limited scalability compared to cloud options
- ⚠️ Responsibility for infrastructure maintenance

---

### Localization Requirements for Software System

**Context**:
The European Union is a multilingual organization, and policies may need to be available in multiple official EU languages. The application must support multilingual content while maintaining a consistent user experience.

**Current Options**:
- **Only English supported** (current implementation)
- **Multiple languages supported** (with translation infrastructure)

**Decision Outcome**:
- **Current Option**: English only (with multilingual policy content)
- **Rationale**: 
  - EEAS primarily operates in English
  - Policy documents can be multilingual (each version in its own language)
  - UI localization adds complexity without clear user demand
  - Future expansion can add language support when needed

**Implementation Details**:
- Policy versions are language-specific (T_RULE_VERSIONS.language_id)
- Each rule can have multiple versions in different languages
- Language selector in the UI allows switching between versions
- Backend supports multiple languages via configuration

**Future Considerations**:
- Frontend UI can be localized using Laravel translation files
- Language detection based on user profile or browser preferences
- Translation workflow for policy content
- Support for RTL languages if needed

---

### Availability Level for Application

**Context**:
The application is a critical business system for EEAS operations. The availability target must balance business needs with development and operational constraints.

**Considered Options**:
- **24/7 High Availability**: Minimal downtime, redundant infrastructure, complex failover
- **Business Hours Availability**: Available during EEAS business hours (08:00-20:00 CET)
- **Best Effort**: Reasonable efforts to maintain availability,容忍 scheduled maintenance windows

**Decision Outcome**:
- **Current Option**: Business Hours Availability (Target: 99.5% uptime)
- **Rationale**:
  - Most critical operations occur during business hours
  - Non-critical maintenance can be scheduled outside business hours
  - Balances cost with business needs
  - Aligns with EEAS IT service management policies

**Availability Targets**:
- **Monthly Uptime Target**: 99.5% (allowing ~36 minutes downtime per month)
- **Scheduled Maintenance**: Weekly maintenance window (Sunday 02:00-06:00 CET)
- **Emergency Downtime**: Maximum 4 hours per month for critical issues

**Implementation**:
- Single server deployment (cost-optimized)
- Automated backups every 24 hours
- Disaster recovery plan with 4-hour RTO
- Monitoring and alerting for availability issues

---

### Authentication Strategy

**Context**:
The application serves EU institution staff who require secure, centralized authentication with fine-grained access control.

**Considered Options**:
- **ECAS Only**: European Commission Authentication Service (current)
- **Local Database**: Internal user database with LDAP integration
- **Multi-Provider**: Support ECAS + other authentication methods

**Decision Outcome**:
- **Current Option**: ECAS with CAS Protocol (Apereo/phpCAS)
- **Rationale**:
  - EEAS standard authentication method
  - Single sign-on across EU systems
  - Centralized user lifecycle management
  - Already integrated with permission system

**Implementation Details**:
- Authentication middleware: `eulogin.auth`
- Proxy validation for backend-to-backend authentication
- Session management with Laravel sessions
- Two-way SSL support for enhanced security
- Proxy chain support for load-balanced deployments

**Future Enhancements**:
- Support for other EU authentication systems (e.g., other Member State systems)
- OAuth2/OpenID Connect support for third-party integrations
- Two-factor authentication via ECAS assurance levels

---

### Permission System Architecture

**Context**:
The application requires a sophisticated permission system to control access to policies, sections, and administrative functions based on user roles and organizational units.

**Considered Options**:
- **Laravel Permissions**: Spatie Laravel Permission package
- **Custom Database**: Internal permission table with complex queries
- **External System**: EEAS Sentry API integration

**Decision Outcome**:
- **Current Option**: EEAS Sentry API Integration
- **Rationale**:
  - Centralized permission management across EEAS systems
  - Single source of truth for user permissions
  - Supports organization-specific permissions
  - Aligns with EEAS enterprise architecture

**Implementation Details**:
- Permission table schema:
  - `permission`: Path-like permission string (e.g., `/ADMINISTRATION`, `/RULES/EUDELGUIDE_VALIDATE`)
  - `org_id`: Optional organization ID for org-specific permissions
  - `access_mode`: Access mode (D=Draft, I=Inform, U=Update, *=All)
  - `system_id`: Target system identifier
- Middleware: `access_mode` and `hasPermissions`
- Caching: Permission results cached to reduce API calls
- Bypass mode: Development/testing mode to disable permission checks

**Permission Examples**:
```php
// Admin access to all sections
'access_mode' => '/ADMINISTRATION::null'

// Update permission for specific organization
'access_mode' => '/RULES/EDIT:D:15478'

// Multiple permissions (OR logic)
'access_mode' => '/RULES/EUDELGUIDE_VALIDATE::null|/ADMINISTRATION::null'
```

---

### Database Architecture

**Context**:
The application needs to integrate with existing EEAS Oracle database for business data while using modern Laravel features that work better with MySQL.

**Considered Options**:
- **Single Database**: Migrate all data to MySQL (high effort, breaks existing integration)
- **Dual Database**: Oracle for business data, MySQL for Laravel (current)
- **Database Replication**: Single database with read replicas

**Decision Outcome**:
- **Current Option**: Dual Database Architecture
- **Rationale**:
  - Oracle contains critical business data (T_RULES, T_CHAPTERS, T_PERMISSIONS)
  - Migration would require significant effort and risk
  - Laravel works well with MySQL for application tables
  - Separate databases allow different optimization strategies

**Implementation**:
- **Oracle Connection**: Used for business data models (TRule, TChapter, etc.)
- **MySQL Connection**: Used for Laravel tables (users, sessions, audits)
- **Model-level connection specification**: Each model defines its connection
- **Cross-database queries**: Avoided through careful design

**Migration Strategy**:
- New features use MySQL where possible
- Existing Oracle data remains unchanged
- Sync processes keep data consistent
- Future: Consider Oracle migration when business stakeholders approve

**Database Connections**:
```php
// config/database.php
'oracle' => [
    'driver' => 'oci8',
    'host' => env('DB_ORACLE_HOST'),
    'port' => env('DB_ORACLE_PORT'),
    'database' => env('DB_ORACLE_DATABASE'),
    'username' => env('DB_ORACLE_USERNAME'),
    'password' => env('DB_ORACLE_PASSWORD'),
],

'mysql' => [
    'driver' => 'mysql',
    'host' => env('DB_HOST'),
    'port' => env('DB_PORT'),
    'database' => env('DB_DATABASE'),
    'username' => env('DB_USERNAME'),
    'password' => env('DB_PASSWORD'),
],
```

---

### PDF Generation Strategy

**Context**:
Policies need to be exported as PDF documents for distribution, archival, and external sharing. The system must support multiple languages, annexes, and formatting.

**Considered Options**:
- **Server-side PDF libraries** (mPDF, TCPDF)
- **Client-side PDF generation** (jsPDF, PDFKit)
- **Cloud PDF service** (PDFShift, PDFCrowd)

**Decision Outcome**:
- **Current Option**: mPDF (Server-side)
- **Rationale**:
  - Excellent HTML/CSS support including complex layouts
  - Supports multiple languages and Unicode
  - No client-side JavaScript required
  - Works in Docker container
  - Good performance for batch generation

**Implementation**:
- Service: `PdfGeneratorService`
- Template: Blade views rendered to HTML
- Conversion: mPDF library converts HTML to PDF
- Features:
  - Multi-page documents
  - Headers/footers
  - Table of contents
  - Page numbers
  - Embedded images and annexes
  - Language-specific fonts

**Usage Examples**:
```php
// Generate policy PDF
$pdf = $pdfService->generatePolicyPdf($ruleVersionId, $languageId);

// Generate section PDF
$pdf = $pdfService->generateSectionsPdf($sectionIds);

// Download
return response()->streamDownload($pdf->output(), 'policy.pdf');
```

---

### Knowledge Base Synchronization

**Context**:
Published policies need to be available in the Open WebUI knowledge base for AI-powered search and retrieval. The system must keep the knowledge base in sync with policy changes.

**Considered Options**:
- **Manual sync**: Admin manually uploads PDFs
- **Real-time sync**: Upload immediately on policy publish
- **Scheduled batch sync**: Periodic batch processing (current)

**Decision Outcome**:
- **Current Option**: Scheduled Batch Sync (Daily at 02:00)
- **Rationale**:
  - Reduces API calls to Open WebUI
  - Batch processing is more efficient
  - Allows time for policy stabilization before sync
  - Lower risk of sync failures affecting business hours
  - Idempotent operation (safe to run multiple times)

**Implementation**:
- Command: `SyncKnowledgeBase` (artisan command)
- Content hashing: MD5 hash of rendered HTML
- Status tracking: `knowledge_sync_files` table
- KB routing: Section-based routing to 5 knowledge bases

**Synchronization Logic**:
```
1. Scan all published policies
2. For each policy:
   a. Compute content hash
   b. Check existing sync record
   c. If no record: Generate PDF → Upload to KB → Save record
   d. If hash changed: Delete old → Generate PDF → Upload → Update record
   e. If hash unchanged: Skip
3. Update sync timestamps
```

**Scheduled Execution**:
```bash
php artisan knowledge:sync --lang=en
```

**Configuration**:
```php
'openwebui' => [
    'base_url' => env('OPENWEBUI_BASE_URL'),
    'api_key' => env('OPENWEBUI_API_KEY'),
],
```

---

### AI Chat Integration

**Context**:
Users need an intelligent way to search and understand policies. An AI-powered conversational assistant can provide quick answers to policy-related questions.

**Considered Options**:
- **Internal NLP**: Build in-house AI/ML models
- **Third-party API**: OpenAI, Google Cloud NLP
- **Self-hosted AI**: Open WebUI with open-source models

**Decision Outcome**:
- **Current Option**: Open WebUI (Self-hosted)
- **Rationale**:
  - Open-source and self-hosted (data control)
  - Multiple AI models supported
  - Built-in knowledge base integration
  - No per-request costs
  - Can run in EEAS infrastructure

**Implementation**:
- Backend-for-Frontend (BFF) pattern
- Controller: `AiChatController`
- Service: `AiService` (Guzzle HTTP client)
- Routes: `/api/ai-chat-proxy/*`
- Frontend: React component (floating chat button)

**Features**:
- Conversational interface
- Threaded message history
- Model selection
- API key security (not exposed to frontend)
- Request cancellation for performance

---

### Session Management

**Context**:
User sessions need to securely store authentication state and user preferences while being efficient and scalable.

**Considered Options**:
- **File-based sessions**: Laravel default
- **Database sessions**: Store in MySQL
- **Cache-based sessions**: Redis/Memcached

**Decision Outcome**:
- **Current Option**: Cache-based sessions (configurable)
- **Rationale**:
  - Better performance for concurrent users
  - Supports distributed deployments
  - Automatic expiration
  - Configurable driver via `.env`

**Configuration**:
```env
SESSION_DRIVER=redis  # or file, database, memcached
SESSION_LIFETIME=120  # minutes
SESSION_ENCRYPT=true  # encrypt session data
```

**Session Data**:
- User authentication state
- ECAS ticket validation
- User details (encrypted)
- Permission cache
- Language preference
- OBO (on behalf of) state

---

### Asset Management

**Context**:
The application needs to manage CSS, JavaScript, images, and other static assets efficiently.

**Considered Options**:
- **Manual bundling**: Hand-written CSS/JS
- **Task runners**: Grunt, Gulp
- **Build tools**: Webpack, Vite

**Decision Outcome**:
- **Current Option**: Webpack Mix (Laravel's build tool)
- **Rationale**:
  - Integrated with Laravel ecosystem
  - Supports modern JavaScript (ES6+)
  - CSS preprocessing (Sass)
  - Asset versioning for cache busting
  - Production optimization (minification, tree shaking)

**Asset Pipeline**:
```
resources/react/src/     →  Webpack Mix  →  public/react/
resources/assets/        →  Webpack Mix  →  public/
```

**Build Commands**:
```bash
npm run dev        # Development build (no minification)
npm run production # Production build (minified, optimized)
npm run watch      # Watch mode for development
```

---

### Testing Strategy

**Context**:
The application requires testing to ensure code quality and prevent regressions.

**Considered Options**:
- **Unit tests only**: Fast, limited coverage
- **Integration tests**: Comprehensive but slow
- **E2E tests**: Real user scenarios, very slow

**Decision Outcome**:
- **Current Option**: Mixed testing approach (unit + integration + Dusk)
- **Rationale**:
  - Unit tests for business logic
  - Integration tests for database and API interactions
  - Dusk for browser-based UI testing
  - Coverage target: 80% minimum

**Testing Frameworks**:
- **PHPUnit**: Unit and integration tests
- **Laravel Dusk**: Browser testing
- **Codeception**: Optional, for acceptance tests

**Test Commands**:
```bash
phpunit             # Run all tests
phpunit --coverage  # Run with coverage report
php artisan test    # Laravel test runner
```

---

### CI/CD Pipeline

**Context**:
Automated testing and deployment ensure code quality and reduce manual errors.

**Considered Options**:
- **GitHub Actions**: Cloud-hosted CI/CD
- **GitLab CI**: Integrated with GitLab
- **Jenkins**: Self-hosted CI server

**Decision Outcome**:
- **Current Option**: GitHub Actions (based on repo location)
- **Rationale**:
  - Native GitHub integration
  - Free for public repositories
  - Flexible workflow configuration
  - Docker support

**Pipeline Stages**:
1. **Build**: Install dependencies, compile assets
2. **Test**: Run unit and integration tests
3. **Security**: Static analysis (PHPStan, PHP CS Fixer)
4. **Quality**: Code quality checks (SonarQube)
5. **Deploy**: Docker build and push to registry

**Workflow Files**:
- `.github/workflows/build.yml`: Main build workflow
- `.github/workflows/composer-cache-build.yml`: Dependency caching
- `.github/workflows/public-cache-build.yml`: Public cache build
- `.github/workflows/build-doc.yaml`: Documentation build

---

### Documentation Strategy

**Context**:
Good documentation is essential for onboarding new developers and maintaining the system.

**Considered Options**:
- **Inline documentation**: PHPDoc comments only
- **Wiki**: Internal wiki (e.g., Confluence)
- **Documentation as Code**: Markdown files in repo

**Decision Outcome**:
- **Current Option**: Documentation as Code (Markdown in `/docs/`)
- **Rationale**:
  - Versioned with code
  - Easy to contribute (pull requests)
  - Can be deployed to GitHub Pages
  - Supports structured documentation (Architecture, Features)

**Documentation Structure**:
```
/docs/
├── architecture/          # Architecture documentation
│   └── Level 1/          # Current architecture level
├── eeas-ai-fe-widget/    # AI Chat feature docs
├── eeas-ai-search-scheduler/  # Knowledge sync docs
├── example/              # Documentation templates
├── releases/             # Release notes
└── index.md              # Documentation home
```

**Documentation Standards**:
- Markdown format (GitHub-flavored)
- Clear structure with headings
- Code examples where applicable
- Diagrams (Mermaid, ASCII art)
- Links between related documents

---

### Security Hardening

**Context**:
The application handles sensitive policy data and must implement security best practices.

**Considered Options**:
- **Basic security**: Default Laravel security
- **Strict security**: Additional hardening measures

**Decision Outcome**:
- **Current Option**: Strict security with additional hardening
- **Rationale**:
  - Enterprise environment requires higher security
  - Compliance with EU data protection requirements
  - Defense in depth approach

**Security Measures**:
- **HTTPS**: All traffic encrypted
- **Headers**: Security headers middleware
- **Input validation**: Laravel validation rules
- **Output escaping**: Blade automatic escaping
- **CSRF protection**: Token-based protection
- **SQL injection**: Parameterized queries (Eloquent)
- **XSS protection**: Input sanitization, output escaping
- **Clickjacking**: X-Frame-Options header
- **MIME sniffing**: X-Content-Type-Options header
- **CORS**: Controlled cross-origin requests

**Configuration**:
```php
// config/app.php
'security' => [
    'force_https' => env('FORCE_HTTPS', true),
    'secure_cookies' => env('SECURE_COOKIES', true),
    'same_site' => 'Lax',  // or Strict
],
```

---

## Summary

This document outlines the key architectural decisions for the EU Delegations Guide application. Each decision was made after considering multiple alternatives and evaluating trade-offs based on:

- **Business requirements**
- **Technical constraints**
- **Enterprise architecture alignment**
- **Security and compliance**
- **Long-term maintainability**

Decisions are documented here for future reference and to guide new development work.
