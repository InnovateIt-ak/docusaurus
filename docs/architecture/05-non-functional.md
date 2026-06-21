---
sidebar_position: 5
sidebar_label: Non Functional Architecture elements
slug: /architecture/05-non-functional
---

# Non Functional Architecture elements

This section summarises the most important non functional aspects of the system.

## System Availability

The system targets **99.9%** availability. Availability is supported by static
content delivery, stateless serving and automated, repeatable deployments. Health
checks and monitoring detect incidents early, and rollbacks are performed by
redeploying a previous immutable build.

## Overview of application security

Security is addressed at several levels:

- **Build integrity** — dependencies are pinned and builds run in isolated CI jobs.
- **Runtime hardening** — the runtime image is minimal and runs with least privilege.
- **Transport security** — all traffic is served over HTTPS.
- **Content security** — no server-side execution, which keeps the attack surface small.
