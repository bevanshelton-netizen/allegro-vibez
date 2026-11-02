# ALLEGRO Financial Truth Layer

## Purpose

Create one financial model across recorded music, live performances, bookings, sponsorship and future commerce.

## Canonical states

- `PENDING` — commercial activity exists but is not financially verified.
- `EARNED` — contractual or royalty entitlement has been established.
- `VERIFIED` — supporting payment/settlement evidence has been validated.
- `AVAILABLE` — verified funds are eligible for wallet availability under platform rules.
- `PAID` — settlement has actually been completed.
- `DISPUTED` — a financial record is under review; it must not become available for payout.
- `VOID` — record is invalidated and excluded from available balance.

## Ledger rule

The wallet must be derived from ledger events rather than editable balance fields.

A live settlement may enter the ledger only when:

1. the engagement has a valid ALLEGRO reference;
2. performance/completion evidence exists where required;
3. settlement status is explicitly recorded;
4. payment verification is explicit;
5. currency and amount are present;
6. duplicate settlement identifiers are rejected.

A royalty event follows the same principle: a reported royalty is not automatically cash available.

## Balance model

`earned = verified contractual/royalty entitlement`

`available = verified funds cleared for payout`

`pending = earned but not yet cleared`

`paid = completed payout settlements`

`disputed = amounts temporarily excluded from availability`

No UI may manufacture streams, royalties, ticket sales, attendance, payments or balances merely to make the dashboard look populated.

## Live-to-wallet bridge

`ALLEGRO LIVE → Settlement Bridge → verification → ledger event → wallet availability → payout request → payout settlement`

## Recorded-music bridge

`Release → rights/royalty event → verification → ledger event → wallet availability → payout request → payout settlement`

## Unified artist view

Artist OS should present both streams in one financial centre while retaining source labels:

- Recorded Music
- Live Performance
- Booking
- Sponsorship
- Merchandise
- Other verified ALLEGRO commerce

Each transaction retains its source, reference, currency, verification state and audit trail.

## Payout gate

A payout request may be created only against `AVAILABLE` funds. `PENDING`, `EARNED`, `DISPUTED` and `VOID` amounts are not payoutable.

Actual external payment execution remains separate from ledger posting. A ledger entry must never be interpreted as proof that a bank/payment provider has transferred money.

## Implementation direction

Supabase is the persistence authority for production financial records. Browser/local storage may be used for interface prototyping only and must never be treated as the authoritative financial ledger.
