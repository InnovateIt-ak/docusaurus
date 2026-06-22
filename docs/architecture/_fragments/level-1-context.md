## Level 1 — System Context

The system exposes a public documentation portal and an internal editing API.
The main external actors are:

| Actor | Responsibility |
|---|---|
| End user | Browses the published documentation |
| Identity provider | Authenticates internal editors |
| CI pipeline | Builds, tests and deploys the site |

The context boundary is intentionally small: everything user-facing is static.
