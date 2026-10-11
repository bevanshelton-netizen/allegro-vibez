export const ALLEGRO_ROYALTY_FEE_BPS = 1000
export const ALLEGRO_ARTIST_SHARE_BPS = 9000
export const ALLEGRO_ROYALTY_FEE_PERCENT = 10
export const ALLEGRO_ARTIST_SHARE_PERCENT = 90

export function calculateRoyaltySplit(grossAmount) {
  const gross = Number(grossAmount)
  if (!Number.isFinite(gross) || gross < 0) throw new Error('Gross royalty amount must be a non-negative number.')
  const platformFee = Math.round(gross * 0.10 * 100) / 100
  const artistNet = Math.round((gross - platformFee) * 100) / 100
  return {
    grossAmount: Math.round(gross * 100) / 100,
    platformFee,
    artistNet,
    platformFeeBps: ALLEGRO_ROYALTY_FEE_BPS,
    artistShareBps: ALLEGRO_ARTIST_SHARE_BPS,
    platformFeePercent: ALLEGRO_ROYALTY_FEE_PERCENT,
    artistSharePercent: ALLEGRO_ARTIST_SHARE_PERCENT,
  }
}

export function calculateContributorSplits(grossAmount, contributors = []) {
  const split = calculateRoyaltySplit(grossAmount)
  const total = contributors.reduce((sum, contributor) => sum + Number(contributor.sharePercent || 0), 0)
  if (total > 100.0001) throw new Error('Contributor ownership cannot exceed 100%.')
  return contributors.map(contributor => {
    const ownership = Number(contributor.sharePercent || 0)
    const amount = Math.round(split.artistNet * ownership / 100 * 100) / 100
    return { ...contributor, grossAmount: split.grossAmount, platformFee: split.platformFee, artistPool: split.artistNet, amount }
  })
}

export function royaltyStatementLine({ grossAmount, source, territory = 'Global', currency = 'ZAR', externalReference = null, statementPeriod = null }) {
  const split = calculateRoyaltySplit(grossAmount)
  return {
    source,
    territory,
    currency: String(currency || 'ZAR').toUpperCase(),
    grossAmount: split.grossAmount,
    platformFee: split.platformFee,
    netAmount: split.artistNet,
    platformFeeBps: ALLEGRO_ROYALTY_FEE_BPS,
    externalReference,
    statementPeriod,
  }
}
