import fs from 'node:fs'
import assert from 'node:assert/strict'

const sql=fs.readFileSync(new URL('../supabase/migrations/20260906_radio_academy_assessments.sql',import.meta.url),'utf8')
const learner=fs.readFileSync(new URL('../src/pages/RadioAcademyLearner.jsx',import.meta.url),'utf8')

for(const required of [
  'academy_start_theory_test',
  'academy_submit_theory_test',
  'academy_assess_practical',
  'academy_recompute_enrollment',
  'radio_academy_questions',
  'radio_academy_theory_attempts',
  'radio_academy_practical_requirements',
  'theory_pass_percent integer not null default 70'
]){
  assert.ok(sql.includes(required),'missing '+required)
}

assert.ok(sql.includes('No SELECT policy is created on radio_academy_questions'),'question bank secrecy invariant missing')
assert.ok(!sql.includes('create policy "academy questions public read"'),'correct-answer table must not be directly readable')
assert.ok(sql.includes('v_complete := v_learning=100 and v_theory and v_required>0 and v_practical>=v_required'),'three-gate completion invariant missing')
assert.ok(learner.includes('Start theory test'),'learner theory UI missing')
assert.ok(learner.includes('PRACTICAL ASSESSMENT'),'learner practical UI missing')
assert.ok(learner.includes('Programme completion gates'),'completion gate UI missing')

const pathways=(sql.match(/with p as \(select id from radio_academy_programs where slug='/g)||[]).length
assert.ok(pathways>=16,'expected seeded theory and practical coverage across all pathways')

console.log('ALLEGRO_RADIO_ACADEMY_ASSESSMENTS=PASS')
