# Coinbase x402 PR — Integration Guide

This standalone repo (`@x402/sui`) is the mechanism implementation for Sui.
When submitting as a PR to [`coinbase/x402`](https://github.com/coinbase/x402),
the code needs to be adapted to the monorepo structure.

## What Goes Into the PR

### 1. Mechanism Package

**Source:** This repo's `src/` directory
**Destination:** `typescript/packages/mechanisms/sui/`

```
typescript/packages/mechanisms/sui/
├── package.json        ← Change deps from npm to workspace:~
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
├── vitest.integration.config.ts
├── CHANGELOG.md
├── src/
│   ├── index.ts
│   ├── signer.ts
│   ├── constants.ts
│   ├── types.ts
│   ├── utils.ts
│   └── exact/
│       ├── index.ts
│       ├── client/     (scheme.ts, register.ts, index.ts)
│       ├── server/     (scheme.ts, register.ts, index.ts)
│       └── facilitator/(scheme.ts, register.ts, index.ts)
└── test/
    └── unit/
        └── index.test.ts
```

**Key changes for monorepo:**
```json
// package.json — swap npm deps to workspace refs
{
  "dependencies": {
    "@x402/core": "workspace:~",        // was "^2.3.0"
    "@mysten/sui": "^1.20.0"            // stays the same (external)
  }
}
```

### 2. Example Updates (DONE — already applied)

These changes have already been applied to the monorepo examples in
`external/x402/examples/typescript/`. The code below shows what was added.

#### `examples/typescript/clients/fetch/index.ts`
Add Sui registration:
```typescript
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { toClientSuiSigner } from "@x402/sui";
import { registerExactSuiScheme } from "@x402/sui/exact/client";

// ... existing EVM + SVM setup ...

// Add Sui
const suiKeypair = Ed25519Keypair.fromSecretKey(process.env.SUI_PRIVATE_KEY!);
const suiClient = new SuiClient({ url: getFullnodeUrl("testnet") });
const suiSigner = toClientSuiSigner(suiKeypair, suiClient);
registerExactSuiScheme(client, { signer: suiSigner });
```

#### `examples/typescript/servers/express/index.ts` (and `hono/`)
Add Sui to route accepts + register scheme:
```typescript
import { ExactSuiScheme } from "@x402/sui/exact/server";

// In route config, add Sui as a payment option:
"GET /weather": {
  accepts: [
    { scheme: "exact", price: "$0.001", network: "eip155:84532", payTo: evmAddress },
    { scheme: "exact", price: "$0.001", network: "sui:testnet", payTo: suiAddress },
  ],
}

// Register Sui scheme on resource server:
server.register("sui:testnet", new ExactSuiScheme());
```

#### `examples/typescript/facilitator/basic/index.ts`
Add Sui facilitator registration:
```typescript
import { toFacilitatorSuiSigner } from "@x402/sui";
import { registerExactSuiScheme } from "@x402/sui/exact/facilitator";

const suiSigner = toFacilitatorSuiSigner(); // No keypair needed
registerExactSuiScheme(facilitator, {
  signer: suiSigner,
  networks: ["sui:testnet", "sui:mainnet"],
});
```

### 3. Spec Reference

The PR implements the v2 Exact scheme spec for Sui:
`specs/schemes/exact/scheme_exact_sui.md` (already merged by @bmwill)

### 4. Monorepo Config

Add to `typescript/pnpm-workspace.yaml`:
```yaml
packages:
  - "packages/mechanisms/sui"
```

Add to `typescript/turbo.json` if not auto-discovered.

### 5. Tests

- Unit tests: `test/unit/index.test.ts` (54 passing) — copy as-is
- Integration tests: Set up with `vitest.integration.config.ts`
- Consider adding Sui to the monorepo's CI matrix

## What Does NOT Go Into the PR

- `examples/` directory from this repo (standalone-format, Sui-only)
- `COINBASE-PR.md` (this file)
- `pnpm-lock.yaml` (monorepo has its own)
- Any `file:` dependency references

## PR Description Template

```markdown
## Add Sui support (v2 Exact scheme)

Implements the [Sui exact scheme spec](specs/schemes/exact/scheme_exact_sui.md)
defined by @bmwill, following the same architecture as the existing EVM and SVM
implementations.

### Sign-first model
- Client builds PTB with `coinWithBalance()`, signs without executing
- Facilitator verifies via signature recovery + dry-run simulation (parallel)
- Facilitator broadcasts the pre-signed transaction — no facilitator wallet needed

### What's included
- `packages/mechanisms/sui/` — Full mechanism (client, server, facilitator)
- Updated examples with Sui registration alongside EVM/SVM
- 54 unit tests, all passing

### Key design decisions
- `coinWithBalance()` for automatic coin selection (idiomatic Sui)
- Balance change validation from dry-run (more robust than instruction parsing)
- Browser-compatible: `toBase64`/`fromBase64` from `@mysten/sui/utils`, no Buffer
- Defense-in-depth: settle re-verifies before broadcasting

### Testing
- [x] `pnpm test` — 54 unit tests pass
- [x] `pnpm typecheck` — clean
- [x] `pnpm build` — clean
- [ ] Integration test against Sui testnet

### Related
- Spec: #[PR number for bmwill's spec]
- Prior V1 work: #340 (hayes-mysten, wbbradley)
- Standalone repo: https://github.com/Danny-Devs/x402-sui
```
