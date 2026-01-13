# Multi-DEX Launchpad Backend

This package contains the source code for the backend services. They share the same codebase and are differentiated with a MODE env variable.

The Aggregator service is responsible for collecting on-chain data for the Launchpad, storing it in the database, and exposing API endpoints for the frontend.

The Agent service is responsible for executing the Launchpad.

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

TODO
