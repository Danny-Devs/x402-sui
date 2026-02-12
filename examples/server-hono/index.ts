/**
 * x402/sui — Hono Server Example (Standalone)
 *
 * Demonstrates a Hono API server that gates endpoints behind x402 payments.
 * When a client requests a protected route without payment, the server returns
 * HTTP 402 with payment requirements. The client signs a Sui transaction and
 * retries. The server verifies + settles via the facilitator, then returns data.
 *
 * COINBASE PR NOTE: For the monorepo, update examples/typescript/servers/hono/
 * to add Sui as an additional payment option in the route config, and register
 * ExactSuiScheme on the resource server. See COINBASE-PR.md for details.
 *
 * Usage:
 *   cp .env.example .env   # Set facilitator URL and pay-to address
 *   pnpm start
 */
import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactSuiScheme } from "@x402/sui/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";

// ─── Configuration ───────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || "4021");
const FACILITATOR_URL = process.env.FACILITATOR_URL || "http://localhost:4022";
const PAY_TO = process.env.SUI_PAY_TO_ADDRESS;
const NETWORK = (process.env.SUI_NETWORK || "sui:testnet") as `${string}:${string}`;

if (!PAY_TO) {
  console.error("Missing SUI_PAY_TO_ADDRESS in .env");
  console.error("This is the Sui address that receives payments.");
  process.exit(1);
}

// ─── App ─────────────────────────────────────────────────────────────────────

const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL });

const app = new Hono();

// Payment middleware — gates all matching routes behind x402
app.use(
  paymentMiddleware(
    {
      "GET /weather": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.001",
            network: NETWORK,
            payTo: PAY_TO,
          },
        ],
        description: "Weather forecast data",
        mimeType: "application/json",
      },
    },
    new x402ResourceServer(facilitatorClient).register(
      NETWORK,
      new ExactSuiScheme(),
    ),
  ),
);

// Protected route — only accessible after payment
app.get("/weather", (c) => {
  return c.json({
    report: {
      weather: "sunny",
      temperature: 72,
      humidity: 45,
      location: "San Francisco",
    },
  });
});

// Free route — no payment required
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Start ───────────────────────────────────────────────────────────────────

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`x402 Sui server listening on http://localhost:${info.port}`);
  console.log(`  Protected: GET /weather ($0.001 USDC on ${NETWORK})`);
  console.log(`  Free:      GET /health`);
  console.log(`  Pay to:    ${PAY_TO}`);
  console.log(`  Facilitator: ${FACILITATOR_URL}`);
});
