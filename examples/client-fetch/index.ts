/**
 * x402/sui — Fetch Client Example (Standalone)
 *
 * Demonstrates a paying HTTP client that automatically handles 402 responses
 * by signing Sui transactions. Uses the sign-first model: the client builds
 * and signs a PTB with coinWithBalance(), but does NOT execute it. The
 * facilitator verifies and broadcasts.
 *
 * COINBASE PR NOTE: For the monorepo, don't copy this file. Instead, update
 * examples/typescript/clients/fetch/index.ts to add Sui registration alongside
 * EVM/SVM. See COINBASE-PR.md for details.
 *
 * Usage:
 *   cp .env.example .env   # Add your testnet keypair
 *   pnpm start
 */
import "dotenv/config";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { SuiClient, getFullnodeUrl } from "@mysten/sui/client";
import { toClientSuiSigner } from "@x402/sui";
import { ExactSuiScheme } from "@x402/sui/exact/client";
import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";

// ─── Configuration ───────────────────────────────────────────────────────────

const SUI_PRIVATE_KEY = process.env.SUI_PRIVATE_KEY;
const RESOURCE_URL = process.env.RESOURCE_SERVER_URL || "http://localhost:4021";
const ENDPOINT = process.env.ENDPOINT_PATH || "/weather";
const NETWORK = (process.env.SUI_NETWORK || "testnet") as "testnet" | "mainnet";

if (!SUI_PRIVATE_KEY) {
  console.error("Missing SUI_PRIVATE_KEY in .env");
  console.error("Generate one: npx @mysten/sui keytool generate ed25519");
  process.exit(1);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // 1. Create Sui wallet from private key
  const keypair = Ed25519Keypair.fromSecretKey(SUI_PRIVATE_KEY);
  const suiClient = new SuiClient({ url: getFullnodeUrl(NETWORK) });
  const signer = toClientSuiSigner(keypair, suiClient);

  console.log(`Wallet: ${signer.address}`);
  console.log(`Network: sui:${NETWORK}`);
  console.log(`Target: ${RESOURCE_URL}${ENDPOINT}`);
  console.log();

  // 2. Create x402 client with Sui scheme
  const client = new x402Client();
  client.register(`sui:${NETWORK}`, new ExactSuiScheme(signer));

  // 3. Wrap fetch with automatic 402 payment handling
  const fetchWithPayment = wrapFetchWithPayment(fetch, client);

  // 4. Make request — if 402, auto-signs payment and retries
  console.log("Making request...");
  const response = await fetchWithPayment(`${RESOURCE_URL}${ENDPOINT}`, {
    method: "GET",
  });

  console.log(`Status: ${response.status}`);

  if (response.ok) {
    const data = await response.json();
    console.log("Response:", JSON.stringify(data, null, 2));

    // 5. Extract settlement confirmation from response headers
    const httpClient = new x402HTTPClient(client);
    const settlement = httpClient.getPaymentSettleResponse(
      (name) => response.headers.get(name),
    );
    if (settlement) {
      console.log("\nPayment settled:");
      console.log(`  Transaction: ${settlement.transaction}`);
      console.log(`  Network: ${settlement.network}`);
      console.log(`  Payer: ${settlement.payer}`);
    }
  } else {
    const text = await response.text();
    console.error("Request failed:", text);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
