/**
 * x402/sui — Facilitator Example (Standalone)
 *
 * Standalone facilitator service that verifies and settles x402 payments on Sui.
 *
 * The facilitator is a trusted intermediary in the x402 protocol:
 *   POST /verify  — Validates a signed payment (signature + dry-run simulation)
 *   POST /settle  — Broadcasts the pre-signed transaction to Sui
 *   GET  /supported — Returns supported schemes and networks
 *
 * Sign-first model: The facilitator does NOT need its own wallet for standard
 * payments. It submits the client's pre-signed transaction directly.
 *
 * COINBASE PR NOTE: For the monorepo, update examples/typescript/facilitator/basic/
 * to add registerExactSuiScheme alongside the existing EVM/SVM registrations.
 * See COINBASE-PR.md for details.
 *
 * Usage:
 *   cp .env.example .env   # Optional: set custom RPC URLs
 *   pnpm start
 */
import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { x402Facilitator } from "@x402/core/facilitator";
import { toFacilitatorSuiSigner } from "@x402/sui";
import { registerExactSuiScheme } from "@x402/sui/exact/facilitator";

// ─── Configuration ───────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "4022");
const SUI_TESTNET_RPC = process.env.SUI_TESTNET_RPC;
const SUI_MAINNET_RPC = process.env.SUI_MAINNET_RPC;

// ─── Facilitator Setup ───────────────────────────────────────────────────────

const facilitator = new x402Facilitator();

// Optional: custom RPC URLs for better reliability
const rpcUrls: Record<string, string> = {};
if (SUI_TESTNET_RPC) rpcUrls["sui:testnet"] = SUI_TESTNET_RPC;
if (SUI_MAINNET_RPC) rpcUrls["sui:mainnet"] = SUI_MAINNET_RPC;

// No keypair needed — facilitator submits client's pre-signed transactions
const signer = toFacilitatorSuiSigner(
  Object.keys(rpcUrls).length > 0 ? { rpcUrls } : undefined,
);

registerExactSuiScheme(facilitator, {
  signer,
  networks: ["sui:testnet", "sui:mainnet"],
});

// Lifecycle hooks for observability
facilitator.onBeforeVerify(async (ctx) => {
  console.log(`[verify] Checking payment on ${ctx.requirements.network}`);
});

facilitator.onAfterSettle(async (ctx) => {
  console.log(`[settle] TX ${ctx.result.transaction} on ${ctx.result.network}`);
});

// ─── HTTP Server ─────────────────────────────────────────────────────────────

const app = new Hono();

app.get("/supported", (c) => {
  return c.json(facilitator.getSupported());
});

app.post("/verify", async (c) => {
  const { paymentPayload, paymentRequirements } = await c.req.json();
  const result = await facilitator.verify(paymentPayload, paymentRequirements);
  return c.json(result);
});

app.post("/settle", async (c) => {
  const { paymentPayload, paymentRequirements } = await c.req.json();
  const result = await facilitator.settle(paymentPayload, paymentRequirements);
  return c.json(result);
});

app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Start ───────────────────────────────────────────────────────────────────

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`x402 Sui facilitator listening on http://localhost:${info.port}`);
  console.log("  POST /verify   — Verify a signed payment");
  console.log("  POST /settle   — Broadcast to Sui");
  console.log("  GET  /supported — Supported schemes");
  console.log("  GET  /health   — Health check");
});
