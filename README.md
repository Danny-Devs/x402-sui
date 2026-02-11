# @x402/sui

x402 Payment Protocol implementation for the Sui blockchain. Implements the [v2 Exact scheme specification](https://github.com/coinbase/x402/blob/main/specs/schemes/exact/scheme_exact_sui.md) defined by [@bmwill](https://github.com/bmwill).

## Overview

This package implements the **sign-first model** for x402 payments on Sui:

1. **Client** builds a PTB with `coinWithBalance()`, signs it without executing
2. **Facilitator** verifies via signature recovery + dry-run simulation (in parallel)
3. **Facilitator** broadcasts the pre-signed transaction during settlement

No facilitator wallet is needed for standard payments — the facilitator submits the client's pre-signed transaction directly.

## Architecture

Three-role separation matching the existing [EVM](https://github.com/coinbase/x402/tree/main/typescript/packages/mechanisms/evm) and [SVM](https://github.com/coinbase/x402/tree/main/typescript/packages/mechanisms/svm) implementations:

| Role | Import Path | Purpose |
|------|-------------|---------|
| **Client** | `@x402/sui/exact/client` | Creates signed payment transactions |
| **Server** | `@x402/sui/exact/server` | Parses prices, builds payment requirements |
| **Facilitator** | `@x402/sui/exact/facilitator` | Verifies and settles payments on-chain |

## Installation

```bash
npm install @x402/sui @x402/core @mysten/sui
```

## Quick Start

### Client — Sign a Payment

```typescript
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
import { toClientSuiSigner } from '@x402/sui';
import { ExactSuiScheme } from '@x402/sui/exact/client';

const keypair = Ed25519Keypair.generate();
const client = new SuiClient({ url: getFullnodeUrl('testnet') });
const signer = toClientSuiSigner(keypair, client);
const scheme = new ExactSuiScheme(signer);

// Create a signed payment payload (does NOT execute on-chain)
const payload = await scheme.createPaymentPayload(2, {
  scheme: 'exact',
  network: 'sui:testnet',
  asset: '0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC',
  amount: '1000', // 0.001 USDC (6 decimals)
  payTo: '0x...recipient',
  maxTimeoutSeconds: 30,
  extra: {},
});
```

### Facilitator — Verify and Settle

```typescript
import { toFacilitatorSuiSigner } from '@x402/sui';
import { registerExactSuiScheme } from '@x402/sui/exact/facilitator';
import { x402Facilitator } from '@x402/core/facilitator';

const facilitator = new x402Facilitator();
const signer = toFacilitatorSuiSigner(); // No keypair needed for standard payments

registerExactSuiScheme(facilitator, {
  signer,
  networks: ['sui:testnet', 'sui:mainnet'],
});

// Verify a payment payload
const verifyResult = await facilitator.verify(paymentPayload, paymentRequirements);

// Settle (broadcast on-chain)
const settleResult = await facilitator.settle(paymentPayload, paymentRequirements);
```

### Server — Parse Prices

```typescript
import { registerExactSuiScheme } from '@x402/sui/exact/server';
import { x402ResourceServer } from '@x402/core/server';

const server = new x402ResourceServer();
registerExactSuiScheme(server);

// Prices can be "$0.10", "0.10 USDC", 0.10, or explicit AssetAmount
const requirements = await server.buildPaymentRequirements({
  scheme: 'exact',
  network: 'sui:testnet',
  price: '$0.001',
  payTo: '0x...merchant',
});
```

## Key Design Decisions

- **`coinWithBalance()`** for automatic coin selection/merge/split — idiomatic Sui pattern, no manual UTXO management
- **Parallel verification** — signature recovery and dry-run simulation run concurrently for low latency
- **Balance change validation** — verifies recipient, asset type, and amount from dry-run results (more robust than instruction-level parsing)
- **Browser-compatible** — uses `toBase64`/`fromBase64` from `@mysten/sui/utils`, no Node.js `Buffer` dependency
- **Defense-in-depth** — settle re-verifies before broadcasting

## Supported Assets

| Network | Asset | Address |
|---------|-------|---------|
| `sui:mainnet` | Circle USDC | `0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC` |
| `sui:testnet` | Circle USDC | `0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC` |

## Prior Art

This implementation builds on:
- [Exact scheme spec for Sui](https://github.com/coinbase/x402/blob/main/specs/schemes/exact/scheme_exact_sui.md) by [@bmwill](https://github.com/bmwill) (merged June 2025)
- [V1 Sui implementation](https://github.com/coinbase/x402/pull/340) by [@hayes-mysten](https://github.com/hayes-mysten) and [@wbbradley](https://github.com/wbbradley) (closed when v2 landed)

## License

Apache-2.0
