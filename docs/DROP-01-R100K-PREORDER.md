# ALLEGRO-VIBEZ DROP 01 — R100,000 zero-stock launch

## Objective

Generate **R100,000 in verified paid gross sales** for ALLEGRO-VIBEZ DROP 01 without buying speculative inventory.

Campaign code: `AV-DROP-01`

## Non-negotiable operating model

1. **Pre-order / made-to-order only.** Do not manufacture speculative stock for DROP 01.
2. **Paid means verified payment.** Expressions of interest, carts and unverified EFTs do not move the public sales counter.
3. **No guessed payment links.** Official products remain blocked until their exact iKhokha HTTPS Buy Button URLs are copied from the merchant account and tested for the intended product and amount.
4. **Protect fulfilment cash.** Production, packaging, delivery, payment-provider costs, refunds/returns and tax obligations are ring-fenced before growth spending.
5. **Batch production.** Manufacture the paid order book in controlled batches through IZAKHONO once the campaign is opened and the order window is formally announced.
6. **Customer clarity.** Product pages must clearly state that items are pre-order/made-to-order and publish the production/delivery window before accepting live orders.
7. **Refund integrity.** If an accepted order cannot be fulfilled, refund it through the verified payment process and update the campaign receipt ledger so public progress reflects net paid sales.

## R100k sales mechanics

Current confirmed DROP 01 tees:
- AV-TEE-MOV-BLK — R549
- AV-TEE-AFR-CRM — R599
- AV-TEE-CCS-BRG — R599
- AV-TEE-ECO-WHT — R549

Average current tee price: **R574**.
At that mix, R100,000 is approximately **175 tee units** before refunds, shipping or future higher-value products.

The commercial goal is not 175 individual customers. Bundles, multi-unit orders, artist/fan group orders and later approved higher-value garments can lift average order value while preserving the made-to-order model.

## Launch sequence

### Gate A — payment readiness
- Obtain the exact iKhokha Buy Button URL for each approved product.
- Update `/public/runtime/merch-checkout.json`.
- Test each product/amount end-to-end.
- Only then change campaign status from `preparing` to `open`.

### Gate B — customer promise
Before status becomes `open`, publish:
- preorder opening date/time;
- preorder closing date/time or explicit close trigger;
- production lead time;
- delivery/collection terms;
- refund/cancellation terms;
- size guide and final garment specification.

### Gate C — sell
- Drive all traffic to `/merch`.
- Use the built-in **Share DROP 01** action.
- Feature the R100k progress meter publicly.
- Push the strongest four tee designs first rather than diluting attention across unapproved SKUs.
- Use artist collaborators only where rights, revenue share and fulfilment responsibilities are explicit.

### Gate D — fulfil
- Export verified paid units by SKU/size.
- Lock the production batch.
- Manufacture through IZAKHONO.
- Quality-check before dispatch.
- Mark refunds in the verified receipt ledger so the sales meter reports net paid sales.

## Sales counter integrity

Migration: `supabase/migrations/20260925_merch_preorder_r100k.sql`

The public UI calls `get_merch_campaign_progress('AV-DROP-01')`.

The function exposes only:
- net verified paid sales;
- verified payment count;
- units;
- campaign status and target.

Individual payment references stay private in `merch_campaign_receipts`.

## Cash rule

The R100,000 target is **sales, not profit**. Do not treat the gross campaign total as free cash. Ring-fence all direct fulfilment and statutory obligations first. Only residual margin is available for DROP 02, artist collaborations and growth.

## Launch status

Initial status is `preparing`.

Do not label DROP 01 live until:
- verified iKhokha checkout is active for the products being sold;
- the customer delivery promise is published; and
- the public route passes independent HTTPS verification under the IZAKHONO launch standard.
