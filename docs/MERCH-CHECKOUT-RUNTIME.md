# ALLEGRO-VIBEZ merch checkout runtime configuration

Runtime file: `/runtime/merch-checkout.json`

This file contains only public checkout URLs. It must never contain iKhokha credentials, API secrets, passwords, signing keys or private merchant data.

## Product mapping

- `movement-black` → AV-TEE-MOV-BLK — R549
- `african-born-cream` → AV-TEE-AFR-CRM — R599
- `creators-burgundy` → AV-TEE-CCS-BRG — R599
- `creator-economy-white` → AV-TEE-ECO-WHT — R549

Set each value to the exact verified HTTPS iKhokha Buy Button URL for that product.

## Runtime behavior

1. On checkout click, ALLEGRO fetches `/runtime/merch-checkout.json` with `cache: no-store`.
2. It accepts only a payload marked `provider: "iKhokha"`.
3. It accepts only valid HTTPS checkout URLs.
4. If the runtime file has no URL for the product, ALLEGRO falls back to the existing `VITE_IKHOKHA_MERCH_CHECKOUT_URLS` map.
5. If neither source contains a valid URL, checkout stays blocked and no payment is taken.

## Launch rule

A URL must not be inserted merely because it looks plausible. It must be copied from the actual iKhokha merchant account and tested against the intended product/amount before checkout is described as live.

On owned IZAKHONO infrastructure, the runtime file can be replaced independently of the application code. External fallback hosts may still require publishing the updated static file, but no source-code change is required.
