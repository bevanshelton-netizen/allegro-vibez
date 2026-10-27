import { assertIdempotencyKey, money } from './money.mjs';
import { normalizeSplits } from './rights.mjs';

money(34900, 'ZAR');
assertIdempotencyKey('allegro-idempotency-001');
normalizeSplits([{ partyId: 'artist', sharePercent: 70 }, { partyId: 'producer', sharePercent: 30 }]);

let failed = false;
try { normalizeSplits([{ partyId: 'artist', sharePercent: 99 }]); } catch (error) { failed = error.code === 'INVALID_REQUEST'; }
if (!failed) throw new Error('rights split validation did not reject a non-100% split');

console.log('ALLEGRO-VIBEZ domain rules: PASS');
