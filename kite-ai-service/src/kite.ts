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
  const res = await kiteFetch(pathname, cookie, init);
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
    { method: "POST", body: JSON.stringify({ model }) }
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
    { method: "POST", body: JSON.stringify({ model }) }
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
