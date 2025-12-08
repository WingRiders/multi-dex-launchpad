# Multi-DEX Launchpad

Multi-DEX Launchpad enables token issuers on Cardano to deploy liquidity across multiple decentralized exchanges in a single, trustless launch. Built on the upgraded WingRiders Launchpad architecture, it provides an open-source framework of smart contracts, backend services, and a modern UI that streamlines token launches, improves market efficiency, and enhances accessibility across the Cardano DeFi ecosystem.

## Development

### Bun

This project uses [Bun](https://bun.sh/) as both the package manager and runtime. If you don't have Bun installed, you can follow the installation guide on their website.

This monorepo consists of the following workspaces:

- `common` - Common code shared between backend and frontend
- `backend/common` - Common code shared between aggregator and agent
- `backend/aggregator` - A Bun application that aggregates blockchain data, stores it in a database, and provides endpoints via tRPC
- `backend/agent` - A Bun application that executes the launches
- `frontend` - A Next.js application that provides the user interface for Multi-DEX Launchpad

### Development

#### Install dependencies

```
bun install
```

#### Run lint

```
bun run check
```

#### Run tests

```
bun run test
```

#### Build all applications

```
bun run build
```

#### Run the application

To run the application locally, you need to run both the [backend/aggregator](./backend/aggregator/README.md) and [frontend](./frontend/README.md). You can follow the instructions in their respective README files to see how to run each application.
