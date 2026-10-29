# ALLEGRO-VIBEZ Chart Scoring Specification v1

## Scope
This specification defines the initial calculation model for ALLEGRO-VIBEZ charts. It is an internal product specification until formally published as chart rules.

## Chart periods
- Weekly: primary Top 20 chart
- Monthly: aggregate recognition and chart-run measurement
- Annual: awards and year-end recognition
- Historical periods are immutable snapshots once certified

## Baseline score
Each eligible release receives a normalized score from six signal groups:

| Signal | Weight |
|---|---:|
| Verified ALLEGRO-VIBEZ listening/completion | 30% |
| Verified radio airplay | 20% |
| Saves/follows/repeat engagement | 15% |
| Verified fan voting | 15% |
| Verified bookings/live activity | 10% |
| Cross-territory audience growth | 10% |

Each signal is normalized to the chart period before weighting. Missing signals do not automatically become zero where the signal is not applicable; the rules engine must document eligibility and normalization treatment.

## Eligibility
A release must have:
- an identified artist;
- a declared genre/subgenre;
- a valid release title/version;
- rights/permission declaration suitable for the platform activity;
- no unresolved integrity hold.

## Integrity controls
Excluded activity includes:
- bot-generated activity;
- artificial streams/listens;
- manipulated voting;
- duplicated or fabricated engagement;
- fraudulent radio reporting;
- any attempt to purchase a chart position.

Paid advertising may generate legitimate discovery but does not receive a special chart bonus merely because money was spent.

## Ranking
1. Calculate eligible signal scores.
2. Normalize each signal within the chart period.
3. Apply published weights.
4. Calculate composite score.
5. Apply integrity review.
6. Rank eligible releases.
7. Publish Top 20 plus movement indicators.
8. Freeze and retain the calculation snapshot.

## Ties
The tie-break sequence should be published before launch. Recommended sequence:
1. higher verified listening/completion score;
2. higher verified cross-territory growth;
3. higher repeat engagement;
4. longer prior-period chart performance;
5. editorial/statistical review if still tied.

## Awards compatibility
The chart engine must retain enough historical information to calculate #1 awards, chart runs, Gold/Platinum/Diamond milestones, Global Breakthrough and annual awards without rewriting prior chart results.

## Governance
Weights and eligibility rules may be changed by the chart governance process, but changes must be versioned and must not retroactively alter a certified chart period.

## Rights-safe boundary
Chart participation does not transfer music ownership and does not create a royalty-collection relationship.
