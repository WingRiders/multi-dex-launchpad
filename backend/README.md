# Multi-DEX Launchpad Backend

This package contains the source code for the backend. The service can run either as an agent or a server, that's controlled my MODE env variable.

The agent is responsible for collecting on-chain data for the Launchpad, storing it in the database, and executing the Launchpad.
The server exposes API endpoints for the frontend.
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
