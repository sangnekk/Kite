import { Elysia } from "elysia";

const KITE_SERVICE_INTERNAL_URL = process.env.KITE_SERVICE_INTERNAL_URL ?? "http://localhost:8080";
const INTERNAL_SECRET = process.env.INTERNAL_SECRET ?? "";
const PORT = parseInt(process.env.PORT ?? "3002");

async function forwardToKiteService(
  integrationId: string,
  headers: Record<string, string>,
  rawPayload: unknown
): Promise<Response> {
  return fetch(`${KITE_SERVICE_INTERNAL_URL}/internal/v1/webhook-event`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Secret": INTERNAL_SECRET,
    },
    body: JSON.stringify({
      integration_id: integrationId,
      headers,
      raw_payload: rawPayload,
    }),
  });
}

function extractHeaders(request: Request, keys: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of keys) {
    const value = request.headers.get(key);
    if (value) result[key] = value;
  }
  return result;
}

const app = new Elysia()
  .get("/health", () => ({ ok: true }))

  // SePay webhooks
  .post("/webhook/:botId/sepay/:id", async ({ params, request, set, body }) => {
    const headers = extractHeaders(request, ["Authorization", "X-Secret-Key"]);
    const res = await forwardToKiteService(params.id, headers, body);
    if (!res.ok) {
      const data = await res.json();
      set.status = 403
      return {success: false, message: data.error.message};
    }
    return { success: true };
  })

  // ThueAPIBank webhooks
  .post("/webhook/:botId/thueapibank/:id", async ({ params, request, set, body }) => {
    const headers = extractHeaders(request, ["signature"]);
    const res = await forwardToKiteService(params.id, headers, body);
    if (!res.ok) {
      const data = await res.json();
      set.status = 403
      return {success: false, message: data.error.message};
    }
    return { success: true };
  })

  // Custom webhooks
  .post("/webhook/:botId/custom/:id", async ({ params, request, set, body }) => {
    const headers = extractHeaders(request, ["X-Sec-Key"]);
    const res = await forwardToKiteService(params.id, headers, body);
    if (!res.ok) {
      const data = await res.json();
      set.status = 403
      return {success: false, message: data.error.message};
    }
    return { success: true };
  })

  .listen(PORT);

console.log(`kite-webhook running at ${app.server?.hostname}:${app.server?.port}`);
