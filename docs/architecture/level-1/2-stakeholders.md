# Stakeholders

### Main stakeholders

The EU Delegations Guide serves the following key stakeholder groups:

- **European External Action Service (EEAS)**:
    - ISPD (Information Systems and Privacy Division)
    - SECDEFPOL (Security and Defence Policy)
    - EUMS/MPCC (European Union Military Committee / Military Committee and Permanent structures)
    - CPCC (Civil Planning and Capability Committee)
    - SIAC (Security Intelligence and Analysis Cell)
    - GEOs (Geographical Officers)

- **European Commission Services**:
    - NEAR (Neighbourhood and Enlargement Negotiations)
    - INTPA (International Partnerships)
    - ECHO (European Civil Protection and Humanitarian Aid Operations)
    - CLIMA (Climate Action)
    - JRC FPI (Joint Research Centre - Foreign Policy Instruments)
    - HOME (Home Affairs)

- **CSDP (Common Security and Defence Policy)**:
    - Civilian and military missions and operations

- **Member States Representatives**:
    - On a needs basis or upon request
    - Access granted for specific policy areas

- **EU Institutions** (future expansion):
    - Council of the European Union
    - European Parliament
    - EU Agencies

---

### List of User Types that will need to interact with the system

| User Type         | Stakeholder     | Description                                                                                                                  |
|-------------------|-----------------|------------------------------------------------------------------------------------------------------------------------------|
| Admin             | EEAS/COM        | Giga Super Admin, Super Admin or Webmaster. Can perform all operations, remove or grant access, add users, topics, documents |
| Local Contributor | EEAS            | User who can upload documents, create, access and export lessons and access and export news                                  |
| EEAS User         | EEAS            | User who can access and export lessons and access news and documents                                                         |
| Advanced User     | EEAS            | EEAS Internal User who can access lessons, news and documents and download                                                   |
| Policy Follower   | EEAS/COM        | User who can only consult the policies and receive notifications                                                             |
| External Expert   | EXT             | External expert with limited access for specific policy areas                                                                |
| Observer          | MS/Institutions | Member State or EU institution observer with read-only access                                                                |

---

### Role permissions

| Permission                         | ADMIN | LOCAL_CONTRIBUTOR | EEAS_USER | ADVANCED_USER | POLICY_FOLLOWER | EXTERNAL_EXPERT | OBSERVER |
|:-----------------------------------|:-----:|:-----------------:|:---------:|:-------------:|:---------------:|:---------------:|:--------:|
| **General Access**                 |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/APPLICATION_ACCESS`              |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| **DOCUMENTS**                      |       |                   |           |               |                 |                 |          |
| `/DOCUMENT/VIEW`                   |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/DOCUMENT/CREATE`                 |   I   |         D         |     -     |       -       |        -        |        -        |    -     |
| `/DOCUMENT/EDIT`                   |   I   |         D         |     -     |       -       |        -        |        -        |    -     |
| `/DOCUMENT/ARCHIVE`                |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/DOCUMENT/DELETE`                 |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/DOCUMENT/SHARE`                  |   I   |         I         |     I     |       I       |        I        |        I        |    -     |
| `/DOCUMENT/PRIVATE_COMMENT`        |   I   |         I         |     I     |       I       |        I        |        I        |    -     |
| `/DOCUMENT/GROUP_COMMENT_EDIT`     |   I   |         D         |     -     |       -       |        -        |        -        |    -     |
| `/DOCUMENT/GROUP_COMMENT_VIEW`     |   I   |         D         |     -     |       -       |        -        |        -        |    -     |
| **POLICIES**                       |       |                   |           |               |                 |                 |          |
| `/POLICY/VIEW`                     |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/POLICY/CREATE`                   |   I   |         D         |     -     |       -       |        -        |        -        |    -     |
| `/POLICY/EDIT`                     |   I   |         D         |     -     |       -       |        -        |        -        |    -     |
| `/POLICY/ARCHIVE`                  |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/POLICY/DELETE`                   |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/POLICY/EXPORT`                   |   I   |         I         |     I     |       I       |        I        |        I        |    -     |
| `/POLICY/PRIVATE_COMMENT`          |   I   |         I         |     I     |       I       |        I        |        I        |    -     |
| `/POLICY/GROUP_COMMENT_EDIT`       |   I   |         D         |     -     |       -       |        -        |        -        |    -     |
| `/POLICY/GROUP_COMMENT_VIEW`       |   I   |         D         |     -     |       -       |        -        |        -        |    -     |
| `/POLICY/VERIFY`                   |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| `/POLICY/PUBLISH`                  |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| `/POLICY/REQUEST_FEEDBACK`         |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| `/POLICY/REJECT_CHANGE`            |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| **POLICY EXCEPTIONS**              |       |                   |           |               |                 |                 |          |
| `/EXCEPTION/CREATE`                |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| `/EXCEPTION/EDIT`                  |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| `/EXCEPTION/VALIDATE`              |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| `/EXCEPTION/APPROVE`               |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| `/EXCEPTION/PUBLISH`               |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| `/EXCEPTION/REJECT`                |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| `/EXCEPTION/WITHDRAW`              |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| `/EXCEPTION/FINISH_REVIEW`         |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| **THEME / SECTION**                |       |                   |           |               |                 |                 |          |
| `/SECTION/VIEW`                    |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/SECTION/EDIT`                    |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/SECTION/ADD_SUBSECTION`          |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/SECTION/DELETE_SUBSECTION`       |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/SECTION/ADD_LINK`                |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/SECTION/REMOVE_LINK`             |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/SECTION/KEY_DOCUMENTS_EDIT`      |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| **RULE MANAGEMENT**                |       |                   |           |               |                 |                 |          |
| `/RULE/VIEW`                       |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/RULE/EDIT`                       |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| `/RULE/ORDER`                      |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| `/RULE/LOCATION`                   |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| **COMMENTERS**                     |       |                   |           |               |                 |                 |          |
| `/COMMENTER/VIEW`                  |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/COMMENTER/ADD`                   |   I   |         D         |     -     |       -       |        -        |        -        |    -     |
| `/COMMENTER/REMOVE`                |   I   |         D         |     -     |       -       |        -        |        -        |    -     |
| `/COMMENTER/EDIT`                  |   I   |         D         |     -     |       -       |        -        |        -        |    -     |
| **ADMINISTRATION**                 |       |                   |           |               |                 |                 |          |
| `/ADMIN/AREA`                      |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_SECTIONS`           |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_RULE_ORDER`         |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_RULE_LOCATION`      |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_COMMENTERS`         |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_ASSIGNMENTS`        |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_PARAMETERS`         |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_USERS_ACCESS`       |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_ACCESS_ADMIN`       |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_ACCESS_CONTRIBUTOR` |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_ACCESS_USER`        |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_ACCESS_ADVANCED`    |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_ACCESS_FOLLOWER`    |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_ACCESS_EXTERNAL`    |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_ACCESS_OBSERVER`    |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_POLICY_ARCHIVE`     |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_COMMENT_ARCHIVE`    |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| **SEARCH**                         |       |                   |           |               |                 |                 |          |
| `/SEARCH/SEARCH`                   |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/SEARCH/EDIT_MY_QUERY`            |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/SEARCH/REMOVE_MY_QUERY`          |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/SEARCH/EDIT_THEME_QUERY`         |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/SEARCH/EXPORT_LIST`              |   I   |         I         |     I     |       I       |        I        |        I        |    -     |
| **STATISTICS**                     |       |                   |           |               |                 |                 |          |
| `/STATISTICS/VIEW`                 |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/STATISTICS/EXPORT`               |   I   |         I         |     I     |       I       |        I        |        I        |    -     |
| **AI CHAT**                        |       |                   |           |               |                 |                 |          |
| `/AI/ACCESS`                       |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/AI/MODEL_SELECT`                 |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| **USER MANAGEMENT**                |       |                   |           |               |                 |                 |          |
| `/USER/GROUP_VIEW`                 |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/USER/PROFILE_VIEW`               |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/USER/PROFILE_EDIT`               |   I   |         -         |     D     |       -       |        -        |        -        |    -     |
| **ON BEHALF OF**                   |       |                   |           |               |                 |                 |          |
| `/OBO/ACT_ON_BEHALF`               |   I   |         I         |     -     |       I       |        -        |        -        |    -     |
| `/OBO/SWITCH_BACK`                 |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/OBO/MANAGE_SESSIONS`             |   I   |         -         |     -     |       -       |        -        |        -        |    -     |

---

### Permission Level Descriptions

| Level | Description                                                             |
|-------|-------------------------------------------------------------------------|
| **I** | **Inherited** - Automatically granted through higher-level permissions  |
| **D** | **Direct** - Explicitly granted permission (requires direct assignment) |
| **-** | **Denied** - Permission not available for this user type                |

---

### Permission Path Convention

Permission paths follow a hierarchical structure:

```
/<CATEGORY>/<SUBCATEGORY>:<ACCESS_MODE>:<ORG_ID>

Categories:
- ADMINISTRATION: System administration
- SECTIONS: Section and chapter management
- RULES: Policy and rule management
- COMMENTERS: Comment group management
- ASSIGNMENTS: Assignment management
- PARAMETERS: System parameters
- SETTINGS: General settings
- SEARCH: Search functionality
- STATISTICS: Reporting and analytics
- AI: AI chat features

Access Modes:
- * : All access (full permissions)
- D : Draft (create, edit)
- I : Inform (read-only, view)
- U : Update (edit existing)
- * : All operations

Examples:
- /ADMINISTRATION::null              - Full admin access to all
- /SECTIONS/EDIT:D:15478             - Edit sections for org 15478
- /RULES/VIEW:*                      - View all rules
- /COMMENTER/ADD:D:15478             - Add commenters for org 15478
```

---

### Role Assignment Process

#### User Registration

1. User registers via ECAS authentication
2. System checks user's ECAS group membership
3. Default role assigned based on group:
    - EEAS users → `EEAS_USER`
    - Commission users → `EEAS_USER`
    - External users → `EXTERNAL_EXPERT` (pending admin approval)

##### Role Enhancement

1. User requests role change via admin
2. Admin reviews request (justification required)
3. Admin assigns appropriate role
4. User notified of role change

##### Temporary Access

1. Admin grants temporary role for specific period
2. System automatically reverts role after expiration
3. Audit trail maintained for all temporary access

---

#### Special Permissions

##### Super Admin (GIGA_SUPER_ADMIN)

- Full system access
- Can manage all other admin accounts
- Access to all permissions regardless of org
- Can configure system-wide settings

##### Webmaster

- Section and chapter management
- User management within assigned orgs
- Content management
- Cannot manage admin accounts

##### Local Contributor

- Create and edit documents
- Upload annexes and supporting files
- Submit policies for review
- View and export content within org

---

#### Audit and Compliance

##### Audit Logging

All permission changes are logged:

- User who made the change
- User whose permissions changed
- Old permissions
- New permissions
- Timestamp
- Reason (if provided)

##### Compliance Requirements

- GDPR: Right to access, rectify, and delete personal data
- Data Minimization: Only necessary permissions granted
- Accountability: Full audit trail for all permission operations
- Access Reviews: Regular permission reviews required

---

#### Future Enhancements

##### Planned Features

1. **Self-Service Role Requests**: Users can request roles with justification
2. **Role Templates**: Pre-defined role combinations for common scenarios
3. **Automatic Role Assignment**: Based on HR data or ECAS group membership
4. **Permission Expiration**: Time-limited permissions with automatic revocation
5. **Delegation**: Temporary permission delegation within same org
6. **Multi-Org Permissions**: Support for users in multiple organizations

##### Technical Improvements

1. Permission caching for performance
2. Bulk permission management
3. Permission inheritance from groups
4. Dynamic permission calculation
5. Permission analytics and reporting
