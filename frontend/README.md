# Multi-Dex Launchpad — Frontend

Frontend application for the Multi-DEX Launchpad built with Next.js.

## User manual

See the [user manual](user-manual/user-manual.md) for how to contribute to launches and create new token launches.

## Run

### Setup environment variables

```bash
cp .env.example .env
```

You will need to adjust the values to match your environment (URL to the backend server and the agent's address).

### Development

```bash
bun run dev
```

### Production

```bash
bun run build
bun run start
```
