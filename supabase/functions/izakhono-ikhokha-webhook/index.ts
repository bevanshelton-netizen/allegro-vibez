import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = (() => {
  try {
    const parsed = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    if (parsed.default) return String(parsed.default);
  } catch {}
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
})();
const IKHOKHA_APP_ID = (Deno.env.get("IKHOKHA_APP_ID") ?? "").trim();
const IKHOKHA_APP_SECRET = (Deno.env.get("IKHOKHA_APP_SECRET") ?? "").trim();

const encoder = new TextEncoder();

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function escapeForSignature(value: string) {
  return value.replace(/[\\\"']/g, "\\$&").replace(/\u0000/g, "\\0");
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return mismatch === 0;
}

function faisOfferFromReference(reference: string) {
  const ref = reference.toLowerCase();
  if (ref.startsWith("fais-re5-")) return { platform: "faisready", offer: "fais-re5", amount: 29900 };
  if (ref.startsWith("fais-bundle-")) return { platform: "faisready", offer: "fais-bundle", amount: 54900 };
  if (ref.startsWith("fais-re1-")) return { platform: "faisready", offer: "fais-re1", amount: 39900 };
  return null;
}

async function rest(path: string, init: RequestInit = {}) {
  if (!SERVICE_KEY) throw new Error("service_role_unavailable");
  const response = await fetch(SUPABASE_URL + "/rest/v1/" + path, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      authorization: "Bearer " + SERVICE_KEY,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  return response;
}

async function readMerchOrder(externalTransactionID: string) {
  const r = await rest(
    "allegro_merch_orders?select=id,order_ref,reservation_ref,sku,size,quantity,amount_cents,currency,payment_status,status&external_transaction_id=eq." +
      encodeURIComponent(externalTransactionID) +
      "&limit=1",
  );
  if (!r.ok) throw new Error("merch_order_lookup_failed");
  const rows = await r.json().catch(() => []);
  return Array.isArray(rows) ? rows[0] ?? null : null;
}

async function updateMerchOrder(
  orderId: string,
  successful: boolean,
  paylinkID: string,
  responseCode: string,
  body: Record<string, unknown>,
) {
  const now = new Date().toISOString();
  const patch = successful
    ? {
        status: "paid",
        payment_status: "paid",
        paylink_id: paylinkID,
        provider_response_code: responseCode,
        provider_payload: body,
        paid_at: now,
        updated_at: now,
      }
    : {
        status: "payment_failed",
        payment_status: "failed",
        paylink_id: paylinkID,
        provider_response_code: responseCode,
        provider_payload: body,
        updated_at: now,
      };

  const r = await rest("allegro_merch_orders?id=eq." + encodeURIComponent(orderId), {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error("merch_order_update_failed");
}

async function updateReservationFromOrder(reservationRef: string | null, successful: boolean) {
  if (!reservationRef) return;
  const patch = {
    status: successful ? "paid" : "awaiting_payment",
    updated_at: new Date().toISOString(),
  };
  const r = await rest("allegro_merch_reservations?reservation_ref=eq." + encodeURIComponent(reservationRef), {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error("merch_reservation_update_failed");
}

Deno.serve(async (req: Request) => {
  if (req.method === "GET") {
    return json({
      ok: true,
      service: "IZAKHONO iKhokha webhook",
      version: 3,
      configured: Boolean(IKHOKHA_APP_ID && IKHOKHA_APP_SECRET && SERVICE_KEY),
      verification: "HMAC-SHA256",
      supported_platforms: ["faisready", "allegro-vibez"],
    });
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!IKHOKHA_APP_ID || !IKHOKHA_APP_SECRET || !SERVICE_KEY) {
    return json({ error: "payment_verification_not_configured" }, 503);
  }

  const appId = (req.headers.get("ik-appid") ?? "").trim();
  const suppliedSignature = (req.headers.get("ik-sign") ?? "").trim().toLowerCase();
  if (!appId || appId !== IKHOKHA_APP_ID || !/^[a-f0-9]{64}$/.test(suppliedSignature)) {
    return json({ error: "invalid_signature_headers" }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  delete body.text;
  const externalTransactionID = String(body.externalTransactionID ?? "").trim().slice(0, 180);
  const paylinkID = String(body.paylinkID ?? "").trim().slice(0, 180);
  const statusRaw = String(body.status ?? "").trim().toUpperCase();
  const responseCode = String(body.responseCode ?? "").trim().slice(0, 40);
  if (!externalTransactionID || !paylinkID || !["SUCCESS", "FAILURE"].includes(statusRaw)) {
    return json({ error: "invalid_callback_body" }, 400);
  }

  const pathname = new URL(req.url).pathname;
  const canonicalBody = JSON.stringify(body);
  const expectedSignature = await hmacSha256(
    escapeForSignature(pathname + canonicalBody),
    IKHOKHA_APP_SECRET,
  );
  if (!constantTimeEqual(expectedSignature, suppliedSignature)) {
    return json({ error: "signature_mismatch" }, 403);
  }

  const payloadHash = hex(await crypto.subtle.digest("SHA-256", encoder.encode(canonicalBody)));
  const successful = statusRaw === "SUCCESS" && responseCode === "00";

  let platform = "unknown";
  let offerCode: string | null = null;
  let amountCents: number | null = null;
  let currency = "ZAR";
  let growthMetadata: Record<string, unknown> = {
    provider: "ikhokha",
    paylink_id: paylinkID,
    response_code: responseCode,
    signature_verified: true,
  };

  const fais = faisOfferFromReference(externalTransactionID);
  if (fais) {
    platform = fais.platform;
    offerCode = fais.offer;
    amountCents = fais.amount;
  } else if (externalTransactionID.toLowerCase().startsWith("allegro-merch-")) {
    const order = await readMerchOrder(externalTransactionID).catch((error) => {
      console.error("ALLEGRO order lookup failed", error);
      return null;
    });
    if (!order) return json({ error: "allegro_merch_order_not_found" }, 404);

    platform = "allegro-vibez";
    offerCode = String(order.sku ?? "").slice(0, 120) || null;
    amountCents = Number(order.amount_cents);
    currency = String(order.currency || "ZAR").slice(0, 12);

    try {
      await updateMerchOrder(order.id, successful, paylinkID, responseCode, body);
      await updateReservationFromOrder(order.reservation_ref || null, successful);
    } catch (error) {
      console.error("ALLEGRO order/reservation update failed", error);
      return json({ error: "merch_order_update_failed" }, 500);
    }

    growthMetadata = {
      ...growthMetadata,
      order_id: order.id,
      order_ref: order.order_ref,
      reservation_ref: order.reservation_ref || null,
      sku: order.sku,
      size: order.size,
      quantity: order.quantity,
    };
  }

  const receipt = {
    provider: "ikhokha",
    platform_slug: platform,
    offer_code: offerCode,
    external_transaction_id: externalTransactionID,
    paylink_id: paylinkID,
    status: successful ? "success" : "failure",
    response_code: responseCode,
    amount_cents: amountCents,
    currency,
    signature_valid: true,
    verified: successful,
    payload_hash: payloadHash,
    raw_payload: body,
    updated_at: new Date().toISOString(),
  };

  const saved = await rest(
    "iz_payment_receipts?on_conflict=provider,external_transaction_id",
    {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(receipt),
    },
  );
  if (!saved.ok) {
    console.error("receipt save failed", saved.status, await saved.text());
    return json({ error: "receipt_save_failed" }, 500);
  }

  if (successful) {
    const event = {
      platform_slug: platform,
      event_name: "purchase",
      amount_cents: amountCents,
      currency,
      payment_ref: externalTransactionID,
      trust_level: "server",
      metadata: {
        ...growthMetadata,
        offer_code: offerCode,
      },
    };
    const eventSaved = await rest(
      "iz_portfolio_growth_events?on_conflict=event_name,payment_ref",
      {
        method: "POST",
        headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify(event),
      },
    );
    if (!eventSaved.ok) {
      console.error("growth event save failed", eventSaved.status, await eventSaved.text());
    }
  }

  return json({ ok: true });
});
