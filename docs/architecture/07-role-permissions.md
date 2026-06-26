---
sidebar_position: 7
sidebar_label: Role Permissions
slug: /architecture/07-role-permissions
---

# Role permissions

This matrix maps every application permission to the roles that can use it. It is
the authoritative reference for the authorisation model and is exported as part
of the architecture PDF.

The legend for each cell is:

| Symbol | Meaning |
| :----: | :--- |
| **I**  | Permission **granted** (inherited / allowed) |
| **D**  | Permission granted by **delegation** only |
| **-**  | Permission **not granted** |

:::note

The table below is intentionally wide (eight role columns). It is a plain
Markdown table — the PDF exporter detects wide tables automatically and adapts
the layout so they paginate and fit the page. See the
[PDF rendering](#pdf-rendering) note at the end of this page.

:::

| Permission                                    | ADMIN | LOCAL_CONTRIBUTOR | EEAS_USER | ADVANCED_USER | POLICY_FOLLOWER | EXTERNAL_EXPERT | OBSERVER |
|:----------------------------------------------|:-----:|:-----------------:|:---------:|:-------------:|:---------------:|:---------------:|:--------:|
| **General Access**                            |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/APPLICATION_ACCESS`                         |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| **DOCUMENTS**                                 |       |                   |           |               |                 |                 |          |
| `/DOCUMENT/VIEW`                              |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/DOCUMENT/CREATE`                            |   I   |         D         |     -     |       -       |        -        |        -        |    -     |
| `/DOCUMENT/EDIT`                              |   I   |         D         |     -     |       -       |        -        |        -        |    -     |
| `/DOCUMENT/ARCHIVE`                           |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/DOCUMENT/DELETE`                            |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/DOCUMENT/SHARE`                             |   I   |         I         |     I     |       I       |        I        |        I        |    -     |
| `/DOCUMENT/PRIVATE_COMMENT`                   |   I   |         I         |     I     |       I       |        I        |        I        |    -     |
| `/DOCUMENT/GROUP_COMMENT_EDIT`                |   I   |         D         |     -     |       -       |        -        |        -        |    -     |
| `/DOCUMENT/GROUP_COMMENT_VIEW`                |   I   |         D         |     -     |       -       |        -        |        -        |    -     |
| **POLICIES**                                  |       |                   |           |               |                 |                 |          |
| `/POLICY/VIEW`                                |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/POLICY/CREATE`                              |   I   |         D         |     -     |       -       |        -        |        -        |    -     |
| `/POLICY/EDIT`                                |   I   |         D         |     -     |       -       |        -        |        -        |    -     |
| `/POLICY/ARCHIVE`                             |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/POLICY/DELETE`                              |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/POLICY/EXPORT`                              |   I   |         I         |     I     |       I       |        I        |        I        |    -     |
| `/POLICY/PRIVATE_COMMENT`                     |   I   |         I         |     I     |       I       |        I        |        I        |    -     |
| `/POLICY/GROUP_COMMENT_EDIT`                  |   I   |         D         |     -     |       -       |        -        |        -        |    -     |
| `/POLICY/GROUP_COMMENT_VIEW`                  |   I   |         D         |     -     |       -       |        -        |        -        |    -     |
| `/POLICY/VERIFY`                              |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| `/POLICY/PUBLISH`                             |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| `/POLICY/REQUEST_FEEDBACK`                    |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| `/POLICY/REJECT_CHANGE`                       |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| **POLICY EXCEPTIONS**                         |       |                   |           |               |                 |                 |          |
| `/EXCEPTION/CREATE`                           |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| `/EXCEPTION/EDIT`                             |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| `/EXCEPTION/VALIDATE`                         |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| `/EXCEPTION/APPROVE`                          |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| `/EXCEPTION/PUBLISH`                          |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| `/EXCEPTION/REJECT`                           |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| `/EXCEPTION/WITHDRAW`                         |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| `/EXCEPTION/FINISH_REVIEW`                    |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| **THEME / SECTION**                           |       |                   |           |               |                 |                 |          |
| `/SECTION/VIEW`                               |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/SECTION/EDIT`                               |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/SECTION/ADD_SUBSECTION`                     |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/SECTION/DELETE_SUBSECTION`                  |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/SECTION/ADD_LINK`                           |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/SECTION/REMOVE_LINK`                        |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/SECTION/KEY_DOCUMENTS_EDIT`                 |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| **RULE MANAGEMENT**                           |       |                   |           |               |                 |                 |          |
| `/RULE/VIEW`                                  |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/RULE/EDIT`                                  |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| `/RULE/ORDER`                                 |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| `/RULE/LOCATION`                              |   I   |         I         |     -     |       -       |        -        |        -        |    -     |
| **COMMENTERS**                                |       |                   |           |               |                 |                 |          |
| `/COMMENTER/VIEW`                             |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/COMMENTER/ADD`                              |   I   |         D         |     -     |       -       |        -        |        -        |    -     |
| `/COMMENTER/REMOVE`                           |   I   |         D         |     -     |       -       |        -        |        -        |    -     |
| `/COMMENTER/EDIT`                             |   I   |         D         |     -     |       -       |        -        |        -        |    -     |
| **ADMINISTRATION**                            |       |                   |           |               |                 |                 |          |
| `/ADMIN/AREA`                                 |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_SECTIONS`                      |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_RULE_ORDER`                    |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_RULE_LOCATION`                 |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_COMMENTERS`                    |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_ASSIGNMENTS`                   |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_PARAMETERS`                    |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_USERS_ACCESS`                  |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_ACCESS_ADMIN`                  |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_ACCESS_CONTRIBUTOR`            |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_ACCESS_USER`                   |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_ACCESS_ADVANCED`               |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_ACCESS_FOLLOWER`               |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_ACCESS_EXTERNAL`               |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_ACCESS_OBSERVER`               |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_POLICY_ARCHIVE`                |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/ADMIN/MANAGE_COMMENT_ARCHIVE`               |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| **SEARCH**                                    |       |                   |           |               |                 |                 |          |
| `/SEARCH/SEARCH`                              |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/SEARCH/EDIT_MY_QUERY`                       |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/SEARCH/REMOVE_MY_QUERY`                     |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/SEARCH/EDIT_THEME_QUERY`                    |   I   |         -         |     -     |       -       |        -        |        -        |    -     |
| `/SEARCH/EXPORT_LIST`                         |   I   |         I         |     I     |       I       |        I        |        I        |    -     |
| **STATISTICS**                                |       |                   |           |               |                 |                 |          |
| `/STATISTICS/VIEW`                            |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/STATISTICS/EXPORT`                          |   I   |         I         |     I     |       I       |        I        |        I        |    -     |
| **AI CHAT**                                   |       |                   |           |               |                 |                 |          |
| `/AI/ACCESS`                                  |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/AI/MODEL_SELECT`                            |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| **USER MANAGEMENT**                           |       |                   |           |               |                 |                 |          |
| `/USER/GROUP_VIEW`                            |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/USER/PROFILE_VIEW`                          |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/USER/PROFILE_EDIT`                          |   I   |         -         |     D     |       -       |        -        |        -        |    -     |
| **ON BEHALF OF**                              |       |                   |           |               |                 |                 |          |
| `/OBO/ACT_ON_BEHALF`                          |   I   |         I         |     -     |       I       |        -        |        -        |    -     |
| `/OBO/SWITCH_BACK`                            |   I   |         I         |     I     |       I       |        I        |        I        |    I     |
| `/OBO/MANAGE_SESSIONS`                        |   I   |         -         |     -     |       -       |        -        |        -        |    -     |

## Permission Path Convention

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

## Role Assignment Process

### User Registration

1. User registers via ECAS authentication
2. System checks user's ECAS group membership
3. Default role assigned based on group:
   - EEAS users → `EEAS_USER`
   - Commission users → `EEAS_USER`
   - External users → `EXTERNAL_EXPERT` (pending admin approval)

### Role Enhancement

1. User requests role change via admin
2. Admin reviews request (justification required)
3. Admin assigns appropriate role
4. User notified of role change

### Temporary Access

1. Admin grants temporary role for specific period
2. System automatically reverts role after expiration
3. Audit trail maintained for all temporary access

## Special Permissions

### Super Admin (GIGA_SUPER_ADMIN)

- Full system access
- Can manage all other admin accounts
- Access to all permissions regardless of org
- Can configure system-wide settings

### Webmaster

- Section and chapter management
- User management within assigned orgs
- Content management
- Cannot manage admin accounts

### Local Contributor

- Create and edit documents
- Upload annexes and supporting files
- Submit policies for review
- View and export content within org

## PDF rendering {#pdf-rendering}

The exporter (`docker/weasyprint/generate_pdf.py` + `docker/weasyprint/report.css`)
handles these generically — **no special markup is needed in the Markdown**. Any
page that hits the same cases is fixed automatically:

1. **Wide tables** — the exporter counts each table's columns; any table past a
   threshold (currently seven) is tagged `wide-table` and its chapter is rendered
   in **landscape**, so every column fits. Infima renders wide tables as a
   horizontally scrolling `display: block` element; since a PDF cannot scroll,
   wide tables are also forced into a fixed `table` layout instead of being
   clipped on the right.
2. **Pagination & repeating header** — long tables break across pages and their
   header row repeats on each one (this applies to every table). Wide-table
   headers are sized to stay on a single line, which avoids a WeasyPrint quirk
   where a *wrapped* header cell under a fixed layout overflows into its
   neighbour on continuation pages.
3. **Code-block overflow** — Docusaurus wraps every code block in flex /
   relative containers sized for an on-screen scroll box. WeasyPrint mis-measured
   those, computing a box shorter than the code it held, so the following section
   was painted on top of the overflow. The chrome is now flattened to plain,
   auto-height blocks, and tall code blocks are allowed to paginate.

None of this is specific to this page — it keys off the table's shape, not a
hand-added class.
