import { requiredContracts } from '../vendor/izakhono-creator-os/artist-protect.js'
import { classifyRevenue, creatorSplit } from '../vendor/izakhono-creator-os/revenue.js'
import { settlementReady } from '../vendor/izakhono-creator-os/clearset.js'

export function creatorBookingQuotePreview(grossMajor, currency='ZAR', depositPercent=50) {
  const amount=Number(grossMajor)
  if(!Number.isFinite(amount)||amount<0) throw new Error('Quote amount must be a non-negative number.')
  const grossMinor=Math.round(amount*100)
  const revenueClass=classifyRevenue({kind:'creator_booking'})
  if(!revenueClass.creator_split) throw new Error('Creator booking revenue must use the creator split.')
  const split=creatorSplit(grossMinor)
  const depositMinor=Math.round(grossMinor*Number(depositPercent||0)/100)
  return {
    currency:String(currency||'ZAR').toUpperCase(),
    gross_minor:split.gross_minor,
    platform_fee_minor:split.platform_fee_minor,
    creator_minor:split.creator_minor,
    fee_bps:split.fee_bps,
    deposit_minor:depositMinor,
    platform_percent:split.fee_bps/100,
  }
}

export function bookingContractRequirements() {
  return requiredContracts({live_booking:true})
}

export function bookingSettlementGate(booking={}) {
  const ready=settlementReady({
    identity_resolved:Boolean(booking.artist_id),
    beneficial_owner_resolved:true,
    ledger_posted:Boolean(booking.payment_ledger_posted),
    obligations_classified:Boolean(booking.obligations_classified),
    reserve_funding_confirmed:Boolean(booking.reserve_funding_confirmed),
    active_dispute:Boolean(booking.active_dispute),
  })
  return {
    ready,
    status:ready?'CLEARSET READY':'CLEARSET HOLD',
    reason:ready
      ? 'Settlement controls have passed.'
      : 'Funds cannot be released until payment evidence, ledger posting, obligation classification and reserve funding are confirmed.',
  }
}
