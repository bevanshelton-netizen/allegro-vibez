import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = (() => {
  try {
    const parsed = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    if (parsed.default) return String(parsed.default);
  } catch {}
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
})();
const APP_ID = (Deno.env.get("IKHOKHA_APP_ID") ?? "").trim();
const APP_SECRET = (Deno.env.get("IKHOKHA_APP_SECRET") ?? "").trim();
const ENTITY_ID = (Deno.env.get("IKHOKHA_ENTITY_ID") ?? APP_ID).trim();
const IK_MODE = (Deno.env.get("IKHOKHA_MODE") ?? "test").trim().toLowerCase();
const API = "https://api.ikhokha.com/public-api/v1/api/payment";
const BASE = SUPABASE_URL + "/functions/v1";

const ALLEGRO_AUTH_URL = "https://zoolsumifdtanycjryje.supabase.co";
const ALLEGRO_PUBLIC_KEY = "sb_publishable_8LBaWtgMxlewODl4STQ9YA_jMMEt5Gt";
const TARGET = "https://deploy-preview-117--allegro-vibez.netlify.app/merch";
const MERCH_GATEWAY = BASE + "/allegro-vibez-live/merch";
const EXPECTED_RELEASE_ID = "ALLEGRO-DROP01-R100K-20260925";

const PRODUCTS: Record<string, { sku: string; name: string; colour: string; unit: number }> = {
  "movement-black": { sku: "AV-TEE-MOV-BLK", name: "The Movement Oversized Tee", colour: "Black", unit: 54900 },
  "african-born-cream": { sku: "AV-TEE-AFR-CRM", name: "African-Born Oversized Tee", colour: "Cream", unit: 59900 },
  "creators-burgundy": { sku: "AV-TEE-CCS-BRG", name: "Creators. Culture. Sound. Tee", colour: "Burgundy", unit: 59900 },
  "creator-economy-white": { sku: "AV-TEE-ECO-WHT", name: "Creator Economy Oversized Tee", colour: "White", unit: 54900 },
};
const SIZES = new Set(["XS","S","M","L","XL","2XL","3XL","4XL","5XL"]);
const encoder = new TextEncoder();

type Probe = {
  ok: boolean;
  target: string;
  status: number | null;
  final_url: string | null;
  root_marker: boolean;
  markers: Record<string, boolean>;
  checked_at: string;
  error?: string;
};

function safe(v: unknown, max = 500) {
  return String(v ?? "").trim().slice(0, max);
}

function baseHeaders(extra: HeadersInit = {}) {
  return {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    ...extra,
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: baseHeaders({
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "authorization, content-type",
      "access-control-allow-methods": "GET, HEAD, POST, OPTIONS",
    }),
  });
}

function escapeSign(value: string) {
  return value.replace(/[\\\"']/g, "\\$&").replace(/\u0000/g, "\\0");
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

async function service(path: string, init: RequestInit = {}) {
  if (!SERVICE_KEY) throw new Error("service_role_unavailable");
  const r = await fetch(SUPABASE_URL + "/rest/v1/" + path, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      authorization: "Bearer " + SERVICE_KEY,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await r.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!r.ok) throw new Error(typeof data === "object" ? (data?.message || JSON.stringify(data)) : String(data));
  return data;
}

async function verifyAllegroUser(req: Request) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const r = await fetch(ALLEGRO_AUTH_URL + "/auth/v1/user", {
    headers: {
      apikey: ALLEGRO_PUBLIC_KEY,
      authorization: auth,
      accept: "application/json",
    },
  });
  if (!r.ok) return null;
  const user = await r.json().catch(() => null);
  if (!user?.id || !user?.email) return null;
  return user;
}

async function recordGrowth(event: Record<string, unknown>) {
  try {
    await service("iz_portfolio_growth_events", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(event),
    });
  } catch (error) {
    console.error("growth event failed", error);
  }
}

async function probe(): Promise<Probe> {
  const checked_at = new Date().toISOString();
  try {
    const nonce = Date.now().toString();
    const verifyTarget = new URL(TARGET);
    verifyTarget.searchParams.set("__iz_verify", nonce);
    const page = await fetch(verifyTarget.toString(), {
      redirect: "follow",
      cache: "no-store",
      headers: {
        accept: "text/html,application/xhtml+xml",
        "cache-control": "no-cache, no-store",
        pragma: "no-cache",
        "user-agent": "IZAKHONO-ALLEGRO-RESILIENCE-VERIFY/4.0",
      },
    });

    const html = await page.text();
    const finalUrl = page.url || TARGET;
    const rootMarker = page.status === 200 && /id=["']root["']/.test(html);
    const base = new URL(finalUrl).origin;

    const [manifestResponse, checkoutResponse, lookbookResponse] = await Promise.all([
      fetch(base + "/runtime/drop01-release.json?__iz_verify=" + nonce, {
        redirect: "follow", cache: "no-store",
        headers: { "cache-control": "no-cache, no-store", "user-agent": "IZAKHONO-ALLEGRO-RESILIENCE-VERIFY/4.0" },
      }),
      fetch(base + "/runtime/merch-checkout.json?__iz_verify=" + nonce, {
        redirect: "follow", cache: "no-store",
        headers: { "cache-control": "no-cache, no-store", "user-agent": "IZAKHONO-ALLEGRO-RESILIENCE-VERIFY/4.0" },
      }),
      fetch(base + "/allegro-vibez-merch-lookbook.webp?__iz_verify=" + nonce, {
        redirect: "follow", cache: "no-store",
        headers: { "cache-control": "no-cache, no-store", "user-agent": "IZAKHONO-ALLEGRO-RESILIENCE-VERIFY/4.0" },
      }),
    ]);

    const manifest = manifestResponse.ok ? await manifestResponse.json().catch(() => null) : null;
    const checkoutConfig = checkoutResponse.ok ? await checkoutResponse.json().catch(() => null) : null;
    const productIds = ["movement-black","african-born-cream","creators-burgundy","creator-economy-white"];

    const markers: Record<string, boolean> = {
      release_manifest: Boolean(manifestResponse.ok && manifest?.release_id === EXPECTED_RELEASE_ID),
      campaign_code: manifest?.campaign_code === "AV-DROP-01",
      sales_target_r100k: Number(manifest?.sales_target_zar) === 100000,
      preorder_zero_stock: manifest?.production_mode === "preorder-made-to-order" && manifest?.inventory_policy === "zero-speculative-stock",
      fail_closed_payment_gate: manifest?.payment_gate === "fail-closed-until-verified-live",
      owned_primary: manifest?.owned_infrastructure_primary === true,
      checkout_contract: Boolean(
        checkoutResponse.ok &&
        checkoutConfig?.provider === "iKhokha" &&
        checkoutConfig?.products &&
        productIds.every((id) => Object.prototype.hasOwnProperty.call(checkoutConfig.products, id))
      ),
      lookbook_asset: lookbookResponse.ok,
    };

    const ok = page.status === 200 && rootMarker && Object.values(markers).every(Boolean);
    return {
      ok,
      target: TARGET,
      status: page.status,
      final_url: finalUrl,
      root_marker: rootMarker,
      markers,
      checked_at,
      ...(ok ? {} : { error: "DROP 01 release manifest, checkout contract, or lookbook verification failed." }),
    };
  } catch (error) {
    return {
      ok: false,
      target: TARGET,
      status: null,
      final_url: null,
      root_marker: false,
      markers: {
        release_manifest: false,
        campaign_code: false,
        sales_target_r100k: false,
        preorder_zero_stock: false,
        fail_closed_payment_gate: false,
        owned_primary: false,
        checkout_contract: false,
        lookbook_asset: false,
      },
      checked_at,
      error: error instanceof Error ? error.message : "Probe failed",
    };
  }
}

async function orderStatus(req: Request, url: URL) {
  const user = await verifyAllegroUser(req);
  if (!user) return json({ error: "authentication_required" }, 401);
  const orderRef = safe(url.searchParams.get("order"), 80);
  if (!orderRef) return json({ error: "order_required" }, 400);
  try {
    const rows = await service(
      "allegro_merch_orders?select=order_ref,product_name,sku,size,quantity,amount_cents,currency,status,payment_status,created_at,paid_at&order_ref=eq." +
        encodeURIComponent(orderRef) +
        "&buyer_user_id=eq." + encodeURIComponent(user.id) +
        "&limit=1",
    );
    const order = Array.isArray(rows) ? rows[0] ?? null : null;
    if (!order) return json({ error: "order_not_found" }, 404);
    return json({ ok: true, order });
  } catch (error) {
    console.error("order status failed", error);
    return json({ error: "order_status_unavailable" }, 503);
  }
}


async function reservePreorder(req: Request) {
  const user = await verifyAllegroUser(req);
  if (!user) return json({ error: "authentication_required" }, 401);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ error: "invalid_json" }, 400);

  const productId = safe(body.product_id, 80);
  const product = PRODUCTS[productId];
  if (!product) return json({ error: "unknown_product" }, 404);

  const size = safe(body.size, 8).toUpperCase();
  if (!SIZES.has(size)) return json({ error: "invalid_size" }, 400);

  const quantity = Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 4) {
    return json({ error: "invalid_quantity" }, 400);
  }

  const customerName = safe(body.customer_name, 160);
  const mobile = safe(body.mobile, 40);
  if (!customerName || !mobile) return json({ error: "contact_details_required" }, 400);

  const amount = product.unit * quantity;
  const utmSource = safe(body.utm_source, 120) || "allegro";
  const utmMedium = safe(body.utm_medium, 120) || "merch-reservation";
  const utmCampaign = safe(body.utm_campaign, 160) || "drop01-r100k";

  const existingRows = await service(
    "allegro_merch_reservations?select=id,reservation_ref&buyer_user_id=eq." +
      encodeURIComponent(user.id) +
      "&product_id=eq." + encodeURIComponent(productId) +
      "&size=eq." + encodeURIComponent(size) +
      "&campaign_code=eq.AV-DROP-01&status=eq.awaiting_payment&limit=1",
  );
  const existing = Array.isArray(existingRows) ? existingRows[0] ?? null : null;

  const payload = {
    buyer_user_id: user.id,
    buyer_email: user.email,
    customer_name: customerName,
    mobile,
    product_id: productId,
    sku: product.sku,
    product_name: product.name,
    colour: product.colour,
    size,
    quantity,
    unit_amount_cents: product.unit,
    intended_amount_cents: amount,
    currency: "ZAR",
    campaign_code: "AV-DROP-01",
    status: "awaiting_payment",
    source: "allegro-merch",
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    updated_at: new Date().toISOString(),
  };

  let reservationRef = existing?.reservation_ref || "";
  let created = false;

  if (existing?.id) {
    await service("allegro_merch_reservations?id=eq." + encodeURIComponent(existing.id), {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(payload),
    });
  } else {
    reservationRef = "AVR-" + Date.now().toString(36).toUpperCase() + "-" + crypto.randomUUID().slice(0, 6).toUpperCase();
    const rows = await service("allegro_merch_reservations", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...payload, reservation_ref: reservationRef }),
    });
    const row = Array.isArray(rows) ? rows[0] ?? null : null;
    if (!row?.reservation_ref) return json({ error: "reservation_creation_failed" }, 500);
    reservationRef = row.reservation_ref;
    created = true;
  }

  await recordGrowth({
    platform_slug: "allegro-vibez",
    event_name: created ? "merch_preorder_reserved" : "merch_preorder_reservation_updated",
    amount_cents: amount,
    currency: "ZAR",
    payment_ref: null,
    trust_level: "server",
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    metadata: {
      campaign_code: "AV-DROP-01",
      reservation_ref: reservationRef,
      sku: product.sku,
      size,
      quantity,
      payment_status: "not_paid",
      production_reserved: false,
    },
  });

  return json({
    ok: true,
    reservation_ref: reservationRef,
    created,
    campaign_code: "AV-DROP-01",
    product_id: productId,
    size,
    quantity,
    intended_amount_cents: amount,
    currency: "ZAR",
    payment_status: "not_paid",
    production_reserved: false,
    message: "Pre-order interest reserved. Payment and production remain pending verified checkout.",
  }, created ? 201 : 200);
}

async function checkout(req: Request) {
  if (IK_MODE !== "live") {
    return json({ error: "payment_gateway_not_live", provider: "ikhokha", mode: IK_MODE }, 503);
  }
  if (!APP_ID || !APP_SECRET || !ENTITY_ID || !SERVICE_KEY) {
    return json({ error: "payment_gateway_not_configured" }, 503);
  }

  const user = await verifyAllegroUser(req);
  if (!user) return json({ error: "authentication_required" }, 401);

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return json({ error: "invalid_json" }, 400);

  const productId = safe(body.product_id, 80);
  const product = PRODUCTS[productId];
  if (!product) return json({ error: "unknown_product" }, 404);

  const size = safe(body.size, 8).toUpperCase();
  if (!SIZES.has(size)) return json({ error: "invalid_size" }, 400);

  const quantity = Number(body.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 4) {
    return json({ error: "invalid_quantity" }, 400);
  }

  const customerName = safe(body.customer_name, 160);
  const mobile = safe(body.mobile, 40);
  const deliveryAddress = safe(body.delivery_address, 300);
  const deliveryCity = safe(body.delivery_city, 120);
  const deliveryProvince = safe(body.delivery_province, 120);
  const deliveryPostalCode = safe(body.delivery_postal_code, 20);
  if (!customerName || !mobile || !deliveryAddress || !deliveryCity || !deliveryProvince || !deliveryPostalCode) {
    return json({ error: "delivery_details_required" }, 400);
  }

  const amount = product.unit * quantity;
  const orderRef = "AV-" + Date.now().toString(36).toUpperCase() + "-" + crypto.randomUUID().slice(0, 8).toUpperCase();
  const externalTransactionID = "allegro-merch-" + crypto.randomUUID();
  const utmSource = safe(body.utm_source, 120) || "allegro";
  const utmMedium = safe(body.utm_medium, 120) || "merch-checkout";
  const utmCampaign = safe(body.utm_campaign, 160) || "wear-the-movement";

  const orderRows = await service("allegro_merch_orders", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      order_ref: orderRef,
      buyer_user_id: user.id,
      buyer_email: user.email,
      customer_name: customerName,
      mobile,
      delivery_address: deliveryAddress,
      delivery_city: deliveryCity,
      delivery_province: deliveryProvince,
      delivery_postal_code: deliveryPostalCode,
      product_id: productId,
      sku: product.sku,
      product_name: product.name,
      colour: product.colour,
      size,
      quantity,
      unit_amount_cents: product.unit,
      amount_cents: amount,
      currency: "ZAR",
      campaign_code: "AV-DROP-01",
      provider: "ikhokha",
      external_transaction_id: externalTransactionID,
      status: "checkout_pending",
      payment_status: "not_paid",
      source: "allegro-merch",
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
    }),
  });
  const order = Array.isArray(orderRows) ? orderRows[0] : null;
  if (!order?.id) return json({ error: "order_creation_failed" }, 500);

  const returnUrl = (state: string) =>
    MERCH_GATEWAY + "?payment=" + encodeURIComponent(state) + "&order=" + encodeURIComponent(orderRef);

  const requestBody = {
    entityID: ENTITY_ID,
    externalEntityID: "izakhono-africa",
    amount,
    currency: "ZAR",
    requesterUrl: MERCH_GATEWAY,
    mode: "live",
    description: (product.name + " · " + size + " · qty " + quantity).slice(0, 120),
    paymentReference: externalTransactionID.slice(0, 60),
    externalTransactionID,
    urls: {
      callbackUrl: BASE + "/izakhono-ikhokha-webhook",
      successPageUrl: returnUrl("processing"),
      failurePageUrl: returnUrl("failed"),
      cancelUrl: returnUrl("cancelled"),
    },
  };

  const payloadText = JSON.stringify(requestBody);
  const signature = await sign(escapeSign(new URL(API).pathname + payloadText));
  const payResponse = await fetch(API, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "ik-appid": APP_ID,
      "ik-sign": signature,
    },
    body: payloadText,
  });
  const payment = await payResponse.json().catch(() => ({}));

  if (!payResponse.ok || payment?.responseCode !== "00" || !payment?.paylinkUrl) {
    await service("allegro_merch_orders?id=eq." + encodeURIComponent(order.id), {
      method: "PATCH",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({
        status: "payment_link_failed",
        payment_status: "not_paid",
        provider_response_code: String(payment?.responseCode || payResponse.status),
        provider_payload: payment,
        updated_at: new Date().toISOString(),
      }),
    }).catch(() => {});
    console.error("ALLEGRO iKhokha payment link failed", payResponse.status, JSON.stringify(payment));
    return json({ error: "checkout_unavailable", order_ref: orderRef }, 502);
  }

  await service("allegro_merch_orders?id=eq." + encodeURIComponent(order.id), {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      paylink_id: payment.paylinkID ?? null,
      checkout_url: String(payment.paylinkUrl),
      provider_response_code: String(payment.responseCode ?? ""),
      provider_payload: payment,
      status: "payment_link_created",
      updated_at: new Date().toISOString(),
    }),
  });

  await recordGrowth({
    platform_slug: "allegro-vibez",
    event_name: "checkout_start",
    amount_cents: amount,
    currency: "ZAR",
    payment_ref: externalTransactionID,
    trust_level: "server",
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    metadata: {
      provider: "ikhokha",
      order_id: order.id,
      order_ref: orderRef,
      sku: product.sku,
      size,
      quantity,
      paylink_id: payment.paylinkID ?? null,
    },
  });

  return json({
    ok: true,
    order_ref: orderRef,
    checkout_url: String(payment.paylinkUrl),
    amount_cents: amount,
    currency: "ZAR",
    provider: "ikhokha",
    mode: "live",
    delivery_fee_included: false,
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: baseHeaders({
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "authorization, content-type",
    "access-control-allow-methods": "GET, HEAD, POST, OPTIONS",
  }) });

  const url = new URL(req.url);
  const mode = url.searchParams.get("mode") || "";

  if (mode === "merch-checkout-health") {
    if (req.method !== "GET" && req.method !== "HEAD") return json({ error: "method_not_allowed" }, 405);
    return json({
      ok: true,
      service: "ALLEGRO merch dynamic checkout",
      provider: "ikhokha",
      mode: IK_MODE,
      configured: Boolean(APP_ID && APP_SECRET && ENTITY_ID && SERVICE_KEY),
      live: IK_MODE === "live" && Boolean(APP_ID && APP_SECRET && ENTITY_ID && SERVICE_KEY),
      app_id_configured: Boolean(APP_ID),
      app_secret_configured: Boolean(APP_SECRET),
      entity_id_configured: Boolean(ENTITY_ID),
      service_role_configured: Boolean(SERVICE_KEY),
      products: Object.keys(PRODUCTS),
      auth_provider: "allegro-supabase",
      delivery_fee_included: false,
      reservation_mode_available: true,
      reservation_requires_payment: false,
      reservation_reserves_production: false,
    });
  }

  if (mode === "merch-reserve") {
    if (req.method !== "POST") return json({ error: "POST only" }, 405);
    return await reservePreorder(req);
  }

  if (mode === "merch-order-status") {
    if (req.method !== "GET" && req.method !== "HEAD") return json({ error: "GET only" }, 405);
    return await orderStatus(req, url);
  }

  if (mode === "merch-checkout") {
    if (req.method !== "POST") return json({ error: "POST only" }, 405);
    return await checkout(req);
  }

  if (mode !== "merch-resilience") {
    return new Response("Not found", { status: 404, headers: baseHeaders() });
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    return json({ error: "Method not allowed" }, 405);
  }

  const result = await probe();

  if (url.searchParams.get("health") === "1") {
    return json({
      ...result,
      route_role: "external_resilience_only",
      owned_route_primary: true,
      canonical_production_claim: false,
    }, result.ok ? 200 : 503);
  }

  if (!result.ok) {
    return json({
      error: "ALLEGRO merch resilience target failed independent verification.",
      probe: result,
    }, 503);
  }

  const target = new URL(TARGET);
  for (const [key, value] of url.searchParams.entries()) {
    if (key !== "mode" && key !== "health") target.searchParams.append(key, value);
  }

  return new Response(null, {
    status: 302,
    headers: baseHeaders({
      location: target.toString(),
      "x-izakhono-route": "allegro-merch-resilience",
      "x-izakhono-authority": "NODE01-primary",
    }),
  });
});
