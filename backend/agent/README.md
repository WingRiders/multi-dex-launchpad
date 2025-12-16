# Multi-DEX Launchpad Aggregator

The Agent service is responsible for executing the Launchpad.

The database schema and Prisma client are shared across backend services and live in [backend/common](../common/README.md).
However, this service only reads from the database.

## Run server

```bash
bun dev
```

## Query healthcheck
```bash
curl http://localhost:3360/healthcheck
```
