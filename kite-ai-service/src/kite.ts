import { config } from "./config";

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
};

// kiteFetch calls the Go kite-service API, forwarding the user's session cookie
// so Go authenticates + authorizes as that user.
export async function kiteFetch(
  pathname: string,
  cookie: string,
  init: RequestInit = {}
): Promise<Response> {
  return fetch(`${config.kiteApiBaseUrl}${pathname}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      cookie,
      ...(init.headers ?? {}),
    },
  });
}

async function kiteJSON<T>(
  pathname: string,
  cookie: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  // Never throw: a network error / timeout (aborted signal) must surface as
  // ok:false so callers (e.g. the credit gate/charge) handle it deterministically
  // instead of rejecting. A rejecting consumeCredit in onFinish would otherwise
  // become an unhandled rejection and could leave the per-app concurrency slot
  // held until the abort eventually propagates.
  let res: Response;
  try {
    res = await kiteFetch(pathname, cookie, init);
  } catch (err) {
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : "request failed",
    };
  }
  const json = (await res.json().catch(() => null)) as ApiResponse<T> | null;
  if (!res.ok || !json?.success) {
    return {
      ok: false,
      status: res.status,
      error: json?.error?.message ?? `request failed (${res.status})`,
    };
  }
  return { ok: true, status: res.status, data: json.data };
}

// In-band calls to the Go service (credit gate + charge) run on the request /
// stream-finish path, so a hung kite-service must not hang the request or hold a
// per-app concurrency slot open indefinitely. Bound them with a timeout.
const CREDIT_API_TIMEOUT_MS = 15_000;

// checkCredit gates one AI turn server-side (plan ai_included + daily budget)
// WITHOUT charging. Call this before streaming so a turn that later errors out
// is never charged. Returns ok=false with a message when denied.
export async function checkCredit(
  appId: string,
  model: string,
  cookie: string
): Promise<{ ok: boolean; remaining?: number; message?: string }> {
  const r = await kiteJSON<{ charged: number; remaining: number }>(
    `/v1/apps/${appId}/ai/credits/check`,
    cookie,
    {
      method: "POST",
      body: JSON.stringify({ model }),
      signal: AbortSignal.timeout(CREDIT_API_TIMEOUT_MS),
    }
  );
  if (!r.ok) return { ok: false, message: r.error };
  return { ok: true, remaining: r.data?.remaining };
}

// consumeCredit charges one AI turn. Call this only AFTER a turn completes
// successfully, so failed/errored turns are not charged.
export async function consumeCredit(
  appId: string,
  model: string,
  cookie: string
): Promise<{ ok: boolean; remaining?: number; message?: string }> {
  const r = await kiteJSON<{ charged: number; remaining: number }>(
    `/v1/apps/${appId}/ai/credits/consume`,
    cookie,
    {
      method: "POST",
      body: JSON.stringify({ model }),
      signal: AbortSignal.timeout(CREDIT_API_TIMEOUT_MS),
    }
  );
  if (!r.ok) return { ok: false, message: r.error };
  return { ok: true, remaining: r.data?.remaining };
}

export async function createVariable(
  appId: string,
  cookie: string,
  body: { name: string; scoped?: boolean }
) {
  return kiteJSON<{ id: string; name: string }>(
    `/v1/apps/${appId}/variables`,
    cookie,
    { method: "POST", body: JSON.stringify({ name: body.name, scoped: !!body.scoped }) }
  );
}

export async function createMessage(
  appId: string,
  cookie: string,
  body: { name: string; data: unknown; flowSources?: Record<string, unknown> }
) {
  return kiteJSON<{ id: string; name: string }>(
    `/v1/apps/${appId}/messages`,
    cookie,
    {
      method: "POST",
      body: JSON.stringify({
        name: body.name,
        data: body.data,
        flow_sources: body.flowSources ?? {},
      }),
    }
  );
}

export async function createEventListener(
  appId: string,
  cookie: string,
  flow: unknown
) {
  return kiteJSON<{ id: string; type: string }>(
    `/v1/apps/${appId}/event-listeners`,
    cookie,
    {
      method: "POST",
      body: JSON.stringify({ source: "discord", flow_source: flow, enabled: true }),
    }
  );
}

export async function validateFlow(appId: string, cookie: string, flow: unknown) {
  return kiteJSON<{ valid: boolean; error?: string }>(
    `/v1/apps/${appId}/flows/validate`,
    cookie,
    { method: "POST", body: JSON.stringify({ flow }) }
  );
}
