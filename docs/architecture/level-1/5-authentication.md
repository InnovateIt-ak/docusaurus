---
sidebar_position: 5
#sidebar_label: Authentication
#slug: /architecture/05-authentication
---

# Authentication

## The overall authentication system landscape

![diagram](../../plantuml/authentication-landscape-diagram.puml)

### Authentication Overview

The EU Delegations Guide uses a **multi-layered authentication system** that integrates with European Commission
authentication services while maintaining its own session and permission management.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Authentication Flow                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  1. User accesses app → Redirect to ECAS                                │
│  2. ECAS validates credentials → Return proxy ticket                    │
│  3. CAS callback validates ticket with ECAS                             │
│  4. User details fetched from EASREFN service                          │
│  5. Session created with encrypted user data                           │
│  6. Permissions fetched from SENTRY API                                │
│  7. User redirected to application                                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Authentication Layers

#### Primary Authentication: ECAS (European Commission Authentication Service)

**Description**:
European Commission's centralized authentication service that provides single sign-on (SSO) across EU institutions.

**Features**:

- Centralized user management
- Single sign-on capability
- Standardized security policies
- Audit trail for all logins

**Integration Method**:

- Protocol: CAS (Central Authentication Service) protocol
- Library: Apereo/phpCAS (Laravel wrapper)
- Validation: Proxy validation for backend-to-backend authentication
- Certificate: SSL/TLS with optional two-way SSL

**Configuration**:

```php
// config/cas.php
'cas_domain' => env('CAS_HOSTNAME', 'ecas.ec.europa.eu'),
'cas_port' => env('CAS_PORT', 443),
'cas_uri' => env('CAS_URI', '/cas'),
'service_validate_uri' => '/laxValidate',
'proxy_validate_uri' => '/interinstitutionalValidate',
'user_groups' => '*', // Accept users from all groups
'user_assurance_level' => 'HIGH',
```

**User Groups**:

- **EEAS**: European External Action Service staff
- **COM**: European Commission staff
- **EXT**: External users (contractors, experts)

**Configuration**:

```php
// config/eeas.php
'allowed_user_groups_login' => env('LOGIN_GROUPS', 'EEAS'),
```

#### Session Management

**Storage**:

- Laravel session driver (configurable: file, database, redis, memcached)
- Session lifetime: 120 minutes (configurable)
- Session encryption: Enabled (AES encryption)

**Session Data**:

```php
// Encrypted user details
'EEAS_user_details' => [
    'uid' => 'user_identifier',
    'firstName' => 'John',
    'lastName' => 'Doe',
    'email' => 'john.doe@eeas.europa.eu',
    'employeeNumber' => '123456',
    'ins_cd' => 'EEAS',  // Institution code
    'display_name' => 'John Doe',
    'api_token' => 'encrypted_api_token', // For external API calls
],

// User permissions (from SENTRY)
'EEAS_user_permissions' => [
    'system_id' => 123,
    'permissions' => ['/ADMINISTRATION', '/RULES/EDIT'],
],

// CAS-specific data
'cas_user' => 'ec123456',  // ECAS username
'user_moniker' => 'JD123456',  // User moniker
```

#### Second-Level Validation

**Description**:
In addition to ECAS authentication, the application implements **application-level permission validation** via the EEAS
Sentry system.

**Purpose**:

- Fine-grained access control within the application
- Organizational unit-specific permissions
- Feature access control

**Implementation**:

- Permissions fetched from Sentry API on login
- Cached in session to reduce API calls
- Validated on each request via middleware
- Support for organization-specific permissions

**Permission Structure**:

```
Permission Path: /<CATEGORY>/<SUBCATEGORY>:<ACCESS_MODE>:<ORG_ID>

Examples:
- /ADMINISTRATION::null          // Admin access to all
- /RULES/EDIT:D:15478            // Edit draft for org 15478
- /RULES/EUDELGUIDE_VALIDATE:*   // Validate all orgs
```

**Middleware**:

- `eulogin.auth`: Primary authentication (ECAS)
- `access_mode`: Application permission validation
- `hasPermissions`: System permission validation

#### On Behalf Of (OBO) Impersonation

**Description**:
Allows authorized users to act on behalf of other users (e.g., team leaders managing their team's policies).

**Features**:

- Temporary user impersonation
- Full audit trail of OBO actions
- Optional hiding of OBO user's real ID
- Easy switch back to original user

**Implementation**:

- Library: lab404/laravel-impersonate
- Session flag: `impersonate` state
- User methods: `isActingOnBehalf()`, `oboRealUserId()`

**Usage**:

```php
// Enter OBO mode
Auth::user()->impersonate($targetUser);

// Check if in OBO mode
if (Auth::user()->isActingOnBehalf()) {
    $realUser = Auth::user()->oboRealUserId();
}

// Leave OBO mode
Auth::user()->leaveImpersonating();
```

#### Authentication Middleware

#### Core Middleware

**`eulogin.auth`**:

- Validates ECAS authentication
- Fetches user details from EASREFN
- Initializes session data
- Redirects to ECAS if not authenticated

**`access_mode`**:

- Validates application permissions
- Checks permission path, access mode, and org ID
- Supports multiple permissions (OR logic with `|`)

**`hasPermissions`**:

- Validates system permissions
- Checks if user has specific permission
- Caches permission checks for performance

**`obo.no`**:

- Prevents OBO mode (e.g., for OBO settings page)
- Redirects if user is acting on behalf

**`oboOnly`**:

- Only allows OBO mode
- Redirects if user is not acting on behalf

#### Middleware Chain Example

```php
// Web routes
Route::group(['middleware' => ['eulogin.auth']], function () {
    
    // Admin routes with multiple permissions
    Route::get('/admin/policy', function() {
        // Must be authenticated AND have admin or policy validation permission
    })->middleware('access_mode:/ADMINISTRATION::null|/RULES/EUDELGUIDE_VALIDATE::null');

    // OBO management routes
    Route::get('/on_behalf_of', 'OnBehalfOfController@index')
        ->middleware('eulogin.auth', 'obo.no');  // Cannot be in OBO mode
});
```

#### Authentication Flow Details

#### Login Flow

```
User Request
    │
    ├─ Not Authenticated
    │   └─ Redirect to ECAS
    │       │
    │       └─ ECAS Login
    │           │
    │           └─ Proxy Ticket Generated
    │               │
    │               └─ CAS Callback
    │                   │
    │                   ├─ Validate Ticket with ECAS
    │                   │
    │                   ├─ Fetch User Details (EASREFN)
    │                   │   ├─ User exists in local DB?
    │                   │   │   ├─ Yes → Update details
    │                   │   │   └─ No → Create new user
    │                   │
    │                   ├─ Fetch Permissions (SENTRY)
    │                   │
    │                   ├─ Create Session
    │                   │   ├─ Encrypt user details
    │                   │   ├─ Store permissions
    │                   │   └─ Set session cookie
    │                   │
    │                   └─ Redirect to Application
    │
    └─ Already Authenticated
        └─ Proceed to requested page
```

#### Permission Check Flow

```
Request with Permission Check
    │
    ├─ Check Bypass Flag
    │   └─ BYPASS_PERMISSIONS=1 → Allow (development only)
    │
    ├─ Extract Permission(s)
    │   └─ Parse: /PATH:MODE:ORG_ID (pipe-delimited for OR)
    │
    ├─ Build Cache Key
    │   └─ MD5(user_id + session + system_id + permission + mode + org_id)
    │
    ├─ Check Cache
    │   └─ Hit → Return cached result
    │
    ├─ Query Sentry API
    │   ├─ POST /sentry/permissions/check
    │   │   ├─ user_id
    │   │   ├─ system_id
    │   │   ├─ permission
    │   │   ├─ access_mode
    │   │   └─ org_id
    │   │
    │   └─ Receive: { "allowed": true/false }
    │
    ├─ Cache Result
    │   └─ TTL: Session lifetime
    │
    └─ Return Result
        ├─ Allowed → Continue request
        └─ Denied → 403 Forbidden
```

#### Security Considerations

#### Credential Security

- **Passwords**: Not stored in application (handled by ECAS)
- **API Tokens**: Encrypted in session using Laravel encryption
- **CAS Certificates**: Stored securely, never in version control
- **Two-Way SSL**: Optional enhanced security for backend services

#### Session Security

- **Session Lifetime**: 120 minutes (configurable)
- **Session Encryption**: AES encryption of session data
- **Session Regeneration**: On login and privilege change
- **Secure Cookies**: HTTPS-only cookies (configurable)
- **SameSite**: Lax or Strict (configurable)

#### Proxy Chain Support

**Description**:
Supports load-balanced deployments where requests pass through multiple proxies.

**Configuration**:

```php
'allowed_proxy_chain' => [
    '/^https?:\/\/[^\/]*\.europa\.eu\//',
],
```

**Headers Tracked**:

- `X-Forwarded-For`: Client IP chain
- `X-Forwarded-Host`: Original host
- `X-Forwarded-Port`: Original port
- `X-Forwarded-Proto`: Original protocol

#### Troubleshooting

#### Common Issues

**"Ticket not recognized"**:

- Verify CAS hostname and port
- Check SSL certificates
- Ensure proxy configuration matches infrastructure

**"Permission denied"**:

- Verify user has permission in Sentry
- Check system_id configuration
- Verify permission path format

**Session expires too quickly**:

- Increase `SESSION_LIFETIME` in `.env`
- Check session driver configuration
- Verify Redis/Memcached connectivity (if used)

#### Debug Commands

```bash
# Clear all sessions
php artisan session:flush

# Clear cache (including permission cache)
php artisan cache:clear

# Test CAS connectivity
php artisan tinker
>>> $cas = app('phpcas');
>>> $cas->client()->get('/cas/protocol/1.0');
```

#### Future Enhancements

#### Short-term

- Enhanced session logging for audit
- Session activity tracking
- Concurrent session management
- Automated session cleanup

#### Long-term

- OAuth2/OpenID Connect support
- Multi-factor authentication via ECAS
- API key authentication for service-to-service
- JWT-based authentication for stateless operations
- Federated identity with other EU institutions

### References

- [ECAS Documentation](https://ecas.ec.europa.eu)
- [CAS Protocol Specification](https://apereo.github.io/cas/6.6.x/protocol/CAS-Protocol-Specification.html)
- [Apereo/phpCAS](https://github.com/apereo/phpCAS)
- [Laravel Session Documentation](https://laravel.com/docs/6.x/session)
