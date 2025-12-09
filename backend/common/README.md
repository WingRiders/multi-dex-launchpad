# Multi-DEX Launchpad Backend / Common

This package contains the **Prisma schema**, **generated Prisma client** and common types / helpers used by both the agent and aggregator services.

---

## Note for development in IntelliJ

- Since Prisma 7 the package `@prisma/language-server` may be required to be installed due to plugin issue:  
  [WEB-75800: Prisma Plugin incorrectly requires URL in datasource block](https://youtrack.jetbrains.com/issue/WEB-75800)

---

## Setup & Usage

### 1. Generate the Prisma client

```bash
bun prisma:generate
```

Note: Migrations are run in [backend/aggregator](../aggregator/README.md#run-pending-migrations) workspace.
