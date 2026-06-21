---
sidebar_position: 1
sidebar_label: Executive Summary
slug: /architecture/01-executive-summary
---

# Executive Summary

This document describes the software architecture of the **My Site** platform.
It follows an [arc42](https://arc42.org/) inspired structure and records the main
architectural decisions using the [MADR](https://adr.github.io/madr/) template.

The platform is a static documentation portal generated with Docusaurus, served
behind a reverse proxy and continuously delivered through a CI/CD pipeline. Its
primary quality goals are **availability**, **maintainability** and **security**.

| Aspect | Summary |
| --- | --- |
| Purpose | Public documentation and architecture portal |
| Architecture style | Static site generation (Jamstack) |
| Delivery | Containerised build, deployed via GitHub Actions |
| Key qualities | Availability, maintainability, security |
