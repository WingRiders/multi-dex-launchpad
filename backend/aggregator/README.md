# Multi-DEX Launchpad Aggregator

The Aggregator service is responsible for collecting on-chain data for the Launchpad, storing it in the database, and exposing API endpoints for the frontend.

The database schema and Prisma client are shared across backend services and live in [backend/common](../common/README.md).
However, migrations are executed exclusively by this service.

## Run pending migrations

```bash
bun prisma:dev
```

## Run server

```bash
bun dev
```

## Query healthcheck
```bash
curl http://localhost:3350/healthcheck
```
