---
sidebar_position: 4
sidebar_label: Architectural Decision Records
slug: /architecture/04-architectural-decision-records
---

# Architectural Decision Records

This section records the significant architectural decisions using the MADR
format. Each decision lists its context, the options considered and the outcome.

## Hosting Decision

### Context and Problem Statement

We need a hosting approach that is cheap to operate, highly available and simple
to reproduce across environments. How should the documentation portal be hosted?

### Considered Options

- Static hosting behind a reverse proxy (Caddy)
- Managed platform-as-a-service
- Self-managed virtual machine

### Decision Outcome

Chosen option: **static hosting behind a reverse proxy**, because it minimises the
runtime attack surface, is inexpensive and integrates cleanly with the CI/CD
pipeline.

## Localization Requirements for Software System

### Context and Problem Statement

The documentation must be available in several languages without duplicating the
build infrastructure.

### Considered Options

- Built-in Docusaurus i18n
- External translation management system
- Manual per-language branches

### Decision Outcome

Chosen option: **built-in Docusaurus i18n**, as it keeps translations close to the
source and is supported out of the box.

## Availability Level for Application

### Context and Problem Statement

What availability target should the application meet, and how do we achieve it?

### Considered Options

- Best effort (no formal target)
- 99.9% availability
- 99.99% availability with multi-region delivery

### Decision Outcome

Chosen option: **99.9% availability**, achieved through static delivery and a
content delivery network, which balances cost against user expectations.
