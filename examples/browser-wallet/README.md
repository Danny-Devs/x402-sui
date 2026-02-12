# Browser Wallet Example (Dual-Chain: Sui + EVM)

Demonstrates x402 payments from a browser using real wallet extensions.
Supports both **Sui wallets** (via [@mysten/dapp-kit](https://sdk.mystenlabs.com/dapp-kit))
and **EVM wallets** (via [wagmi](https://wagmi.sh)).

## How It Works

```
Browser (this app)                    Server (server-hono example)
     │                                       │
     │── GET /weather ─────────────────────> │
     │<──────── 402 + PAYMENT-REQUIRED ──────│
     │                                       │
     │ Wallet popup: "Sign transaction?"     │
     │ (Sui Wallet / MetaMask / etc.)        │
     │                                       │
     │── Retry + PAYMENT-SIGNATURE ────────> │
     │                                  ┌────┤
     │                                  │ Verify via facilitator
     │                                  └────┤
     │<───────── 200 + weather data ─────────│
```

## Prerequisites

Run the facilitator and server examples first (in separate terminals):

```bash
# Terminal 1: Facilitator (port 4022)
cd ../facilitator && pnpm install && pnpm start

# Terminal 2: API Server (port 4021)
cd ../server-hono && pnpm install && pnpm start
```

## Setup

```bash
pnpm install
cp .env.example .env    # Optional: configure resource URL
pnpm dev                # Opens http://localhost:5173
```

## Wallet Setup

### Sui
Install [Sui Wallet](https://chromewebstore.google.com/detail/sui-wallet/opcgpfmipidbgpenhmajoajpbobppdil)
or any Sui-compatible wallet. Switch to **testnet** in wallet settings.
Fund your wallet from the [Sui testnet faucet](https://faucet.testnet.sui.io/).

### EVM
Install [MetaMask](https://metamask.io/) or any injected EVM wallet.
Switch to **Base Sepolia** testnet. Fund from a Base Sepolia faucet.

## Usage

1. Open http://localhost:5173
2. Connect a Sui wallet, EVM wallet, or both
3. Click **"Fetch /weather"** — your wallet will prompt to sign
4. After signing, the server verifies payment and returns data

## Architecture

| Layer | Sui | EVM |
|-------|-----|-----|
| **Wallet** | @mysten/dapp-kit `ConnectButton` | wagmi `useConnect` |
| **Signer** | dapp-kit `useSignTransaction` → `ClientSuiSigner` | wagmi `useWalletClient` → viem `WalletClient` |
| **Scheme** | `@x402/sui/exact/client` | `@x402/evm/exact/client` |
| **Payment** | `wrapFetchWithPayment` (shared) | `wrapFetchWithPayment` (shared) |

The `x402Client` registers both schemes. When the server returns 402 with payment
requirements specifying a network (e.g., `sui:testnet` or `eip155:84532`), the
client automatically selects the matching scheme and wallet to sign the payment.

## COINBASE PR NOTE

For the monorepo, this example demonstrates how to integrate `@x402/sui` alongside
`@x402/evm` in a browser dApp. The pattern for creating a `ClientSuiSigner` from
dapp-kit is the key integration point:

```typescript
import { useCurrentAccount, useSignTransaction } from "@mysten/dapp-kit";
import { registerExactSuiScheme } from "@x402/sui/exact/client";
import type { ClientSuiSigner } from "@x402/sui";

const account = useCurrentAccount();
const { mutateAsync: signTransaction } = useSignTransaction();

const signer: ClientSuiSigner = {
  address: account.address,
  signTransaction: async (tx) => {
    const { bytes, signature } = await signTransaction({ transaction: tx });
    return { signature, bytes };
  },
};

registerExactSuiScheme(client, { signer });
```
