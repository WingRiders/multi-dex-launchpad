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

# Architecture

## Launch flow

Users creates and signs a transaction:
  - Sends funds to the agent
  - Creates the first project tokens holder
  - Creates the head node
  - Submits the launch config in the metadata
The starter is the first input of the transaction

Then the agent has to:
  - Generate and deploy the reference scripts
  - Insert separator nodes <- ! has to happen before the start

After that the initialization is done and the launch starts.
Users make contributions.
The commit fold happens.
The rewards fold happens and rewards holders are created.
The pools are created.
The pool proofs are created.
The users retrieve the rewards.

## What do we need to keep track of?

- the launches with their config and status
  they are initiated by users, we can aggregate them from on-chain activity
  we only track launches with valid configurations
  since the contracts are generated, we can prefilter by tx metadata

- the agent utxos

- all the launch-related utxos

- the reference script holder utxos, both the constant and the launch ones

- the Wr & Sundae pool utxos
