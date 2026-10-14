# ALLEGRO CONTROL PLANE

**Purpose:** machine-readable coordination protocol for ALLEGRO Studio build, verification and deployment work.

## Operating rule
A directive is an executable work order. Workers do not wait for repeated "Proceed" messages. They claim an available task, execute it, record evidence, and hand off the next task.

## State machine
`QUEUED -> CLAIMED -> WORKING -> VERIFYING -> COMPLETE`

Failure path: `WORKING -> BLOCKED -> ESCALATED`.
A blocked task must include the blocker, attempted replacements/fallbacks, evidence, and the smallest required authorization if one is genuinely needed.

## Task envelope
```json
{
  "task_id": "ALLEGRO-0001",
  "directive": "",
  "owner": "",
  "state": "QUEUED",
  "priority": "P0",
  "depends_on": [],
  "deliverables": [],
  "verification": [],
  "result": null,
  "next_task": null,
  "updated_at": ""
}
```

## Communication channels
1. **Repository control files** — authoritative task/state handoff.
2. **Git commits** — durable implementation evidence.
3. **Issues/PRs** — worker discussion and escalation.
4. **Deployment records** — deployment and verification evidence.

## Handoff contract
Every completed worker must leave:
- implementation commit SHA(s)
- tests run and result
- deployment result, if applicable
- public endpoint, if verified
- unresolved risks
- explicit `next_task`

## Deployment directive
The active objective is an independently deployable ALLEGRO Studio production deployment. Existing Vercel/Downloads infrastructure is legacy unless it passes the deployment requirements. Workers must replace blocking dependencies rather than repeatedly repair a failed delivery path.

## Current workstream
`SOURCE -> BUILD -> API/SERVICE ROUTING -> MUSIC/CREATOR/LISTENER/GROWTH/PAYMENTS -> PRODUCTION TESTS -> DEPLOY -> PUBLIC VERIFICATION`

## Safety boundary
No worker may invent successful deployment, payment, credential access, regulated authorization, or public availability. Account permissions, payments, legal commitments and irreversible external actions remain authorization gates.
