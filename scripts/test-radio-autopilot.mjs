import assert from 'node:assert/strict'
import {programForNow,eligibleTracks,selectTrack,dueAd,buildHourClock} from '../src/lib/radioAutopilot.js'

const programs=[
 {id:'overnight',name:'Night Pulse',day:'daily',start:'22:00',end:'06:00',priority:1,active:true},
 {id:'drive',name:'Drive Africa',day:'mon',start:'16:00',end:'19:00',priority:5,active:true}
]
assert.equal(programForNow(programs,new Date('2026-09-07T17:00:00+02:00')).id,'drive')
assert.equal(programForNow(programs,new Date('2026-09-07T02:00:00+02:00')).id,'overnight')

const tracks=[
 {id:'t1',artist_id:'a1',title:'One',duration_seconds:180,rights_status:'verified',radio_clearance:'cleared',genres:['afropop'],territories:['ZA']},
 {id:'t2',artist_id:'a2',title:'Two',duration_seconds:200,rights_status:'pending',radio_clearance:'cleared',genres:['afropop'],territories:['ZA']},
 {id:'t3',artist_id:'a3',title:'Three',duration_seconds:190,rights_status:'verified',radio_clearance:'cleared',genres:['gospel'],territories:['*']}
]
assert.deepEqual(eligibleTracks(tracks,{genre:'afropop',territory:'ZA'}).map(x=>x.id),['t1'])
assert.equal(selectTrack(eligibleTracks(tracks,{territory:'ZA'}),{recentTrackIds:['t1'],seed:0}).id,'t3')

const campaigns=[
 {id:'ad1',name:'Sponsor A',status:'active',approved:true,starts_at:'2026-09-01T00:00:00Z',ends_at:'2026-09-30T23:59:59Z',max_daily_plays:10,priority:2,duration_seconds:30}
]
assert.equal(dueAd(campaigns,{now:new Date('2026-09-10T12:00:00Z'),playsToday:{}}).id,'ad1')

const clock=buildHourClock({program:{id:'p1',name:'Afro Rise',genre:'afropop'},tracks:[tracks[0]],campaigns,hourStart:new Date('2026-09-10T12:00:00Z'),seed:1})
assert.equal(clock.program_id,'p1')
assert.ok(clock.items.some(x=>x.type==='track'))
assert.ok(clock.items.some(x=>x.type==='ad'))
console.log('ALLEGRO_RADIO_AUTOPILOT_TEST=PASS')
