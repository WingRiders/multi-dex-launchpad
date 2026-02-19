# Backend API Documentation

The backend API is built with **tRPC**. Clients typically call procedures by name (e.g. `launches`, `launch`, `healthcheck`). The server uses the tRPC standalone HTTP adapter; queries use GET or POST and mutations use POST. Data is serialized with SuperJSON (supports `Date`, `BigInt`, etc.).

---

## Endpoints

### healthcheck

**Path:** `healthcheck` · **Method:** `GET` (tRPC query)

Server health check. Verifies DB connectivity and TxSubmission client. Returns 500 if unhealthy.

**Inputs**

- None.

**Output**

- `healthy` (boolean)
- `isDbConnected` (boolean)
- `isTxSubmissionClientInitialized` (boolean)
- `uptime` (number)

**Sample payload (output)**

```json
{
  "healthy": true,
  "isDbConnected": true,
  "isTxSubmissionClientInitialized": true,
  "uptime": 123.45
}
```

---

### tokensMetadata

**Path:** `tokensMetadata` · **Method:** `POST` (tRPC mutation; used for large input)

Returns token metadata for multiple token subjects (policyId + assetName). Uses mutation to support large request bodies.

**Inputs**

- `subjects` (string[]) — Array of token unit strings (e.g. policyId + assetName).

**Output**

- Record (object) — Map of subject to metadata. Each value has: `subject`, `name`, `ticker?`, `decimals?`, etc. (`logo` omitted).

**Sample payload (input)**

```json
["abc123def456", "789abc012def"]
```

**Sample payload (output)**

```json
{
  "abc123def456": {
    "subject": "abc123def456",
    "name": "My Token",
    "ticker": "MTK",
    "decimals": 6
  },
  "789abc012def": {
    "subject": "789abc012def",
    "name": "Other Token",
    "decimals": 0
  }
}
```

---

### tokenMetadata

**Path:** `tokenMetadata` · **Method:** `GET` (tRPC query)

Returns token metadata for a single token subject.

**Inputs**

- `subject` (string) — Token unit (policyId + assetName).

**Output**

- Object or null — Metadata (`subject`, `name`, `ticker?`, `decimals?`, etc.; `logo` omitted), or null if not found.

**Sample payload (input)**

```json
"abc123def456"
```

**Sample payload (output)**

```json
{
  "subject": "abc123def456",
  "name": "My Token",
  "ticker": "MTK",
  "decimals": 6
}
```

---

### launches

**Path:** `launches` · **Method:** `GET` (tRPC query)

Lists launches, optionally filtered by time status (upcoming, active, past).

**Inputs**

- `timeStatus` (optional) — `'past'` \| `'active'` \| `'upcoming'`. Omit for all launches.

**Output**

- Array of objects, each with:
  - `txHash` (string)
  - `title` (string)
  - `description` (string)
  - `logoIpfsUrl` (string)
  - `startTime` (Date)
  - `defaultStartTime` (Date)
  - `endTime` (Date)

**Sample payload (input)**

```json
{}
```

or with filter:

```json
{
  "timeStatus": "active"
}
```

**Sample payload (output)**

```json
[
  {
    "txHash": "abc123...",
    "title": "My Launch",
    "description": "A great project",
    "logoIpfsUrl": "ipfs://Qm...",
    "startTime": "2025-01-01T00:00:00.000Z",
    "defaultStartTime": "2025-01-01T00:00:00.000Z",
    "endTime": "2025-02-01T00:00:00.000Z"
  }
]
```

---

### launch

**Path:** `launch` · **Method:** `GET` (tRPC query)

Returns full launch details and config for a given launch transaction hash.

**Inputs**

- `txHash` (string) — Launch creation transaction hash.

**Output**

- `projectInfo` (object) — Title, description, url, logoUrl, etc.
- `config` (object) — Full launch config (LaunchConfig).
- `totalCommitted` (bigint, serialized as string)
- `isCancelled` (boolean)

**Sample payload (input)**

```json
{
  "txHash": "abc123..."
}
```

**Sample payload (output)**

```json
{
  "projectInfo": {
    "title": "My Launch",
    "description": "...",
    "url": "https://...",
    "logoUrl": "https://..."
  },
  "config": { ... },
  "totalCommitted": "1000000",
  "isCancelled": false
}
```

---

### launchesOwnedBy

**Path:** `launchesOwnedBy` · **Method:** `GET` (tRPC query)

Lists launches created by a given owner address.

**Inputs**

- `ownerBech32Address` (string) — Bech32 address of the launch owner.

**Output**

- Array of objects, each with:
  - `txHash` (string)
  - `title` (string)
  - `projectToken` (string)
  - `totalTokens` (bigint, serialized as string)
  - `isCancelled` (boolean)

**Sample payload (input)**

```json
{
  "ownerBech32Address": "addr1qx2..."
}
```

**Sample payload (output)**

```json
[
  {
    "txHash": "abc...",
    "title": "My Launch",
    "projectToken": "policyIdassetName",
    "totalTokens": "1000000",
    "isCancelled": false
  }
]
```

---

### nodeToSpend

**Path:** `nodeToSpend` · **Method:** `GET` (tRPC query)

Finds the next unspent node UTxO to use for a contribution (by launch and owner pub key hash).

**Inputs**

- `launchTxHash` (string)
- `ownerPubKeyHash` (string)

**Output**

- `input` (object) — `txHash`, `outputIndex`.
- `output` (object) — Full UTxO output (value, address, datum, etc.).

**Sample payload (input)**

```json
{
  "launchTxHash": "abc...",
  "ownerPubKeyHash": "a1b2c3..."
}
```

**Sample payload (output)**

```json
{
  "input": {
    "txHash": "def...",
    "outputIndex": 0
  },
  "output": {
    "address": "addr1...",
    "value": { ... },
    "datum": "..."
  }
}
```

---

### userNodes

**Path:** `userNodes` · **Method:** `GET` (tRPC query)

Returns all contribution nodes for a user in a launch (for display/withdraw).

**Inputs**

- `launchTxHash` (string)
- `ownerPubKeyHash` (string)

**Output**

- Array of objects, each with:
  - `txHash` (string)
  - `outputIndex` (number)
  - `keyHash` (string)
  - `keyIndex` (number)
  - `committed` (bigint, serialized as string)
  - `overCommitted` (bigint, serialized as string)
  - `createdTime` (Date)
  - `isSpent` (boolean)
  - `presaleTierUnit` (string, optional)

**Sample payload (input)**

```json
{
  "launchTxHash": "abc...",
  "ownerPubKeyHash": "a1b2c3..."
}
```

**Sample payload (output)**

```json
[
  {
    "txHash": "def...",
    "outputIndex": 1,
    "keyHash": "a1b2...",
    "keyIndex": 0,
    "committed": "100",
    "overCommitted": "0",
    "createdTime": "2025-01-15T12:00:00.000Z",
    "isSpent": false,
    "presaleTierUnit": "policyIdassetName"
  }
]
```

---

### previousNodeUTxO

**Path:** `previousNodeUTxO` · **Method:** `GET` (tRPC query)

Returns the previous node UTxO in the chain for a given key (for remove-commitment / chain traversal).

**Inputs**

- `launchTxHash` (string)
- `keyHash` (string)
- `keyIndex` (number)

**Output**

- `input` (object) — `txHash`, `outputIndex`.
- `output` (object) — Full UTxO output.

**Sample payload (input)**

```json
{
  "launchTxHash": "abc...",
  "keyHash": "a1b2...",
  "keyIndex": 0
}
```

**Sample payload (output)**

```json
{
  "input": {
    "txHash": "def...",
    "outputIndex": 0
  },
  "output": {
    "address": "addr1...",
    "value": { ... }
  }
}
```

---

### userRewardsHolders

**Path:** `userRewardsHolders` · **Method:** `GET` (tRPC query)

Returns reward holder UTxOs for a user in a launch (to claim rewards).

**Inputs**

- `launchTxHash` (string)
- `ownerPubKeyHash` (string)

**Output**

- Array of objects, each with:
  - `txHash` (string)
  - `outputIndex` (number)
  - `rewards` (bigint, serialized as string)
  - `isSpent` (boolean)

**Sample payload (input)**

```json
{
  "launchTxHash": "abc...",
  "ownerPubKeyHash": "a1b2c3..."
}
```

**Sample payload (output)**

```json
[
  {
    "txHash": "def...",
    "outputIndex": 2,
    "rewards": "500",
    "isSpent": false
  }
]
```

---

### utxo

**Path:** `utxo` · **Method:** `GET` (tRPC query)

Returns a single unspent transaction output by tx hash and output index.

**Inputs**

- `txHash` (string)
- `outputIndex` (number)

**Output**

- `input` (object) — `txHash`, `outputIndex`.
- `output` (object) — Full UTxO output.

**Sample payload (input)**

```json
{
  "txHash": "abc...",
  "outputIndex": 0
}
```

**Sample payload (output)**

```json
{
  "input": {
    "txHash": "abc...",
    "outputIndex": 0
  },
  "output": {
    "address": "addr1...",
    "value": { ... }
  }
}
```

---

### utxos

**Path:** `utxos` · **Method:** `GET` (tRPC query)

Returns multiple unspent transaction outputs by array of tx hash + output index.

**Inputs**

- Array of objects, each with:
  - `txHash` (string)
  - `outputIndex` (number)

**Output**

- Array of UTxO objects (each with `input` and `output`).

**Sample payload (input)**

```json
[
  { "txHash": "abc...", "outputIndex": 0 },
  { "txHash": "def...", "outputIndex": 1 }
]
```

**Sample payload (output)**

```json
[
  {
    "input": { "txHash": "abc...", "outputIndex": 0 },
    "output": { "address": "addr1...", "value": { ... } }
  },
  {
    "input": { "txHash": "def...", "outputIndex": 1 },
    "output": { "address": "addr1...", "value": { ... } }
  }
]
```

---

### nodeValidatorRef

**Path:** `nodeValidatorRef` · **Method:** `GET` (tRPC query)

Returns the node validator reference script UTxO for a launch.

**Inputs**

- `launchTxHash` (string)

**Output**

- `input` (object) — `txHash`, `outputIndex`.
- `output` (object) — UTxO output including `scriptRef`, `scriptHash`.
- `scriptSize` (number)

**Sample payload (input)**

```json
{
  "launchTxHash": "abc..."
}
```

**Sample payload (output)**

```json
{
  "input": {
    "txHash": "def...",
    "outputIndex": 0
  },
  "output": {
    "address": "addr1...",
    "scriptRef": "...",
    "scriptHash": "..."
  },
  "scriptSize": 1234
}
```

---

### nodePolicyRef

**Path:** `nodePolicyRef` · **Method:** `GET` (tRPC query)

Returns the node policy reference script UTxO for a launch.

**Inputs**

- `launchTxHash` (string)

**Output**

- `input` (object)
- `output` (object) — with `scriptRef`, `scriptHash`.
- `scriptSize` (number)

**Sample payload (input)**

```json
{
  "launchTxHash": "abc..."
}
```

**Sample payload (output)**

```json
{
  "input": { "txHash": "def...", "outputIndex": 0 },
  "output": { "address": "addr1...", "scriptRef": "...", "scriptHash": "..." },
  "scriptSize": 567
}
```

---

### firstProjectTokensHolderValidatorRef

**Path:** `firstProjectTokensHolderValidatorRef` · **Method:** `GET` (tRPC query)

Returns the first project tokens holder validator reference script UTxO for a launch.

**Inputs**

- `launchTxHash` (string)

**Output**

- `input` (object)
- `output` (object) — with `scriptRef`, `scriptHash`.
- `scriptSize` (number)

**Sample payload (input)**

```json
{
  "launchTxHash": "abc..."
}
```

**Sample payload (output)**

```json
{
  "input": { "txHash": "def...", "outputIndex": 0 },
  "output": { "address": "addr1...", "scriptRef": "...", "scriptHash": "..." },
  "scriptSize": 890
}
```

---

### projectTokensHolderPolicyRef

**Path:** `projectTokensHolderPolicyRef` · **Method:** `GET` (tRPC query)

Returns the project tokens holder policy reference script UTxO for a launch.

**Inputs**

- `launchTxHash` (string)

**Output**

- `input` (object)
- `output` (object) — with `scriptRef`, `scriptHash`.
- `scriptSize` (number)

**Sample payload (input)**

```json
{
  "launchTxHash": "abc..."
}
```

**Sample payload (output)**

```json
{
  "input": { "txHash": "def...", "outputIndex": 0 },
  "output": { "address": "addr1...", "scriptRef": "...", "scriptHash": "..." },
  "scriptSize": 234
}
```

---

### firstProjectTokensHolderUTxO

**Path:** `firstProjectTokensHolderUTxO` · **Method:** `GET` (tRPC query)

Returns the current (unspent) first project tokens holder UTxO for a launch.

**Inputs**

- `launchTxHash` (string)

**Output**

- `input` (object) — `txHash`, `outputIndex`.
- `output` (object) — Full UTxO output.

**Sample payload (input)**

```json
{
  "launchTxHash": "abc..."
}
```

**Sample payload (output)**

```json
{
  "input": {
    "txHash": "def...",
    "outputIndex": 0
  },
  "output": {
    "address": "addr1...",
    "value": { ... }
  }
}
```

---

### poolProofInput

**Path:** `poolProofInput` · **Method:** `GET` (tRPC query)

Returns an unspent pool proof input for a launch (to unlock rewards).

**Inputs**

- `launchTxHash` (string)

**Output**

- Object with `txHash`, `outputIndex` — or `null` if none available.

**Sample payload (input)**

```json
{
  "launchTxHash": "abc..."
}
```

**Sample payload (output)**

```json
{
  "txHash": "def...",
  "outputIndex": 0
}
```

or `null`.

---

### failProofInput

**Path:** `failProofInput` · **Method:** `GET` (tRPC query)

Returns an unspent fail proof input for a launch.

**Inputs**

- `launchTxHash` (string)

**Output**

- Object with `txHash`, `outputIndex` — or `null`.

**Sample payload (input)**

```json
{
  "launchTxHash": "abc..."
}
```

**Sample payload (output)**

```json
{
  "txHash": "def...",
  "outputIndex": 0
}
```

or `null`.
