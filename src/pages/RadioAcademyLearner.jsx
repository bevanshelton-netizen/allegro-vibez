import { useCallback, useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import '../styles/radioAcademyLearner.css'

export default function RadioAcademyLearner({session}){
  const[enrollments,setEnrollments]=useState([])
  const[selected,setSelected]=useState(null)
  const[modules,setModules]=useState([])
  const[completed,setCompleted]=useState(new Set())
  const[practicals,setPracticals]=useState([])
  const[certificate,setCertificate]=useState(null)
  const[theoryHistory,setTheoryHistory]=useState([])
  const[theoryAttempt,setTheoryAttempt]=useState(null)
  const[theoryAnswers,setTheoryAnswers]=useState({})
  const[theoryResult,setTheoryResult]=useState(null)
  const[requirements,setRequirements]=useState([])
  const[completion,setCompletion]=useState(null)
  const[message,setMessage]=useState('')
  const[loading,setLoading]=useState(true)
  const[busy,setBusy]=useState('')

  const loadEnrollments=useCallback(async()=>{
    if(!supabase||!session)return
    const{data,error}=await supabase.from('radio_academy_enrollments')
      .select('id,status,progress_percent,enrolled_at,completed_at,program_id,program:radio_academy_programs(id,slug,title,summary,level,duration_hours)')
      .eq('user_id',session.user.id)
      .order('enrolled_at',{ascending:false})
    if(error){setMessage(error.message);setLoading(false);return}
    const rows=data||[]
    setEnrollments(rows)
    if(!selected&&rows.length)setSelected(rows[0])
    else if(selected){
      const fresh=rows.find(x=>x.id===selected.id)
      if(fresh)setSelected(fresh)
    }
    setLoading(false)
  },[session,selected])

  useEffect(()=>{loadEnrollments()},[loadEnrollments])

  useEffect(()=>{let active=true;(async()=>{
    if(!supabase||!session||!selected){setModules([]);setPracticals([]);setCertificate(null);setTheoryHistory([]);setRequirements([]);setCompletion(null);return}
    const[{data:mods,error:modError},{data:prog},{data:prac},{data:cert},{data:attempts},{data:reqs},{data:statusData}]=await Promise.all([
      supabase.from('radio_academy_modules').select('id,module_no,title,learning_outcomes,practical_required,assessment_required').eq('program_id',selected.program_id).order('module_no'),
      supabase.from('radio_academy_module_progress').select('module_id,status').eq('enrollment_id',selected.id).eq('user_id',session.user.id),
      supabase.from('radio_academy_practicals').select('id,requirement_id,practical_type,scheduled_at,completed_at,result,feedback').eq('enrollment_id',selected.id).order('created_at'),
      supabase.from('radio_academy_certificates').select('certificate_no,certificate_type,issued_at,revoked_at').eq('enrollment_id',selected.id).maybeSingle(),
      supabase.from('radio_academy_theory_attempts').select('id,score_percent,pass_mark,passed,started_at,submitted_at').eq('enrollment_id',selected.id).order('started_at',{ascending:false}).limit(10),
      supabase.from('radio_academy_practical_requirements').select('id,practical_type,title,description,rubric,required').eq('program_id',selected.program_id).eq('active',true).order('sort_order'),
      supabase.rpc('academy_completion_status',{p_enrollment_id:selected.id})
    ])
    if(!active)return
    if(modError)setMessage(modError.message)
    setModules(mods||[])
    setCompleted(new Set((prog||[]).filter(x=>x.status==='completed').map(x=>x.module_id)))
    setPracticals(prac||[])
    setCertificate(cert||null)
    setTheoryHistory(attempts||[])
    setRequirements(reqs||[])
    setCompletion(statusData||null)
    setTheoryAttempt(null)
    setTheoryAnswers({})
    setTheoryResult(null)
  })();return()=>{active=false}},[selected,session])

  async function startTheory(){
    if(!supabase||!selected)return
    setBusy('theory-start');setMessage('');setTheoryResult(null)
    const{data,error}=await supabase.rpc('academy_start_theory_test',{p_enrollment_id:selected.id})
    setBusy('')
    if(error){setMessage(error.message||'Could not start the theory test.');return}
    setTheoryAttempt(data);setTheoryAnswers({})
  }

  async function submitTheory(){
    if(!supabase||!theoryAttempt)return
    const questions=theoryAttempt.questions||[]
    if(questions.some(q=>theoryAnswers[q.id]===undefined)){
      setMessage('Answer every theory question before submitting.')
      return
    }
    setBusy('theory-submit');setMessage('')
    const{data,error}=await supabase.rpc('academy_submit_theory_test',{p_attempt_id:theoryAttempt.attempt_id,p_answers:theoryAnswers})
    setBusy('')
    if(error){setMessage(error.message||'Could not submit the theory test.');return}
    setTheoryResult(data);setTheoryAttempt(null)
    setMessage(data?.passed?'Theory test passed. Your practical competence still needs to be completed.':'Theory test not yet passed. Review the learning material and retake it when ready.')
    const[{data:attempts},{data:statusData}]=await Promise.all([
      supabase.from('radio_academy_theory_attempts').select('id,score_percent,pass_mark,passed,started_at,submitted_at').eq('enrollment_id',selected.id).order('started_at',{ascending:false}).limit(10),
      supabase.rpc('academy_completion_status',{p_enrollment_id:selected.id})
    ])
    setTheoryHistory(attempts||[]);setCompletion(statusData||null)
  }

  async function complete(module){
    if(!supabase)return
    setBusy(module.id);setMessage('')
    const{data,error}=await supabase.rpc('academy_mark_module_complete',{p_module_id:module.id})
    setBusy('')
    if(error){setMessage(error.message||'Could not update this module.');return}
    setCompleted(prev=>new Set([...prev,module.id]))
    setMessage(data?.learning_complete?'Learning modules complete. Practical/supervisor review may still be required before a certificate is issued.':'Module completed.')
    await loadEnrollments()
  }

  if(!session)return <Navigate to="/login" replace/>

  return <main className="learner-page">
    <section className="learner-hero">
      <div><span>ALLEGRO RADIO ACADEMY</span><h1>My Learning</h1><p>Build your skills, complete practical work and create evidence for real radio opportunities.</p></div>
      <Link to="/radio-academy">Browse Academy</Link>
    </section>

    {message&&<div className="learner-notice">{message}</div>}

    {loading?<div className="learner-empty">Loading your Academy workspace…</div>:!enrollments.length?
      <div className="learner-empty"><h2>No programmes yet</h2><p>Choose a Radio Academy pathway and enrol to start learning.</p><Link to="/radio-academy">Explore programmes</Link></div>:
      <section className="learner-layout">
        <aside className="learner-enrollments">
          <h2>My programmes</h2>
          {enrollments.map(e=><button key={e.id} className={selected?.id===e.id?'active':''} onClick={()=>setSelected(e)}>
            <strong>{e.program?.title||'Radio Academy programme'}</strong>
            <span>{e.progress_percent}% complete</span>
            <i><b style={{width:(e.progress_percent||0)+'%'}}/></i>
          </button>)}
        </aside>

        {selected&&<section className="learner-course">
          <div className="learner-course-head">
            <div><span>{String(selected.program?.level||'foundation').toUpperCase()}</span><h2>{selected.program?.title}</h2><p>{selected.program?.summary}</p></div>
            <div className="learner-score"><strong>{selected.progress_percent}%</strong><small>{selected.status.replaceAll('_',' ')}</small></div>
          </div>

          <div className="learner-modules">
            <h3>Learning modules</h3>
            {!modules.length?<p className="muted">Modules are being prepared for this pathway.</p>:modules.map(m=>{
              const done=completed.has(m.id)
              return <article key={m.id} className={done?'done':''}>
                <div className="module-no">{String(m.module_no).padStart(2,'0')}</div>
                <div className="module-body"><h4>{m.title}</h4>
                  <ul>{(m.learning_outcomes||[]).map(x=><li key={x}>{x}</li>)}</ul>
                  <div className="module-tags">{m.practical_required&&<span>Practical</span>}{m.assessment_required&&<span>Assessment</span>}</div>
                </div>
                <button disabled={done||busy===m.id} onClick={()=>complete(m)}>{done?'Completed ✓':busy===m.id?'Saving…':'Mark learning complete'}</button>
              </article>
            })}
          </div>

          <div className="learner-assessment">
            <div className="assessment-head">
              <div><span>THEORY TEST</span><h3>Knowledge assessment</h3><p>Pass mark: {theoryAttempt?.pass_mark||theoryHistory[0]?.pass_mark||70}%.</p></div>
              {!theoryAttempt&&<button disabled={busy==='theory-start'} onClick={startTheory}>{busy==='theory-start'?'Preparing…':theoryHistory.length?'Retake theory test':'Start theory test'}</button>}
            </div>

            {theoryAttempt&&<div className="theory-paper">
              {(theoryAttempt.questions||[]).map((q,index)=><fieldset key={q.id}>
                <legend>{index+1}. {q.prompt}</legend>
                {(q.options||[]).map((option,choice)=><label key={choice}>
                  <input type="radio" name={q.id} checked={theoryAnswers[q.id]===choice} onChange={()=>setTheoryAnswers(prev=>({...prev,[q.id]:choice}))}/>
                  <span>{option}</span>
                </label>)}
              </fieldset>)}
              <button className="submit-theory" disabled={busy==='theory-submit'} onClick={submitTheory}>{busy==='theory-submit'?'Marking…':'Submit theory test'}</button>
            </div>}

            {theoryResult&&<div className={theoryResult.passed?'theory-result pass':'theory-result retry'}>
              <strong>{theoryResult.score_percent}%</strong>
              <span>{theoryResult.passed?'PASS':'NOT YET COMPETENT'} • {theoryResult.correct_count}/{theoryResult.question_count} correct</span>
            </div>}

            {!!theoryHistory.length&&<div className="attempt-history">
              <strong>Previous attempts</strong>
              {theoryHistory.map(a=><span key={a.id}>{a.submitted_at?new Date(a.submitted_at).toLocaleDateString():'In progress'} — {a.score_percent??'—'}% {a.passed===true?'✓ PASS':a.passed===false?'• RETAKE':''}</span>)}
            </div>}
          </div>

          <div className="learner-practical-requirements">
            <div><span>PRACTICAL ASSESSMENT</span><h3>Demonstrate competence on the station</h3><p>Theory alone cannot complete the programme. Required practicals are assessed by an authorised ALLEGRO supervisor against a defined rubric.</p></div>
            {requirements.map(req=>{
              const evidence=practicals.find(p=>p.requirement_id===req.id)
              return <article key={req.id}>
                <div><strong>{req.title}</strong><p>{req.description}</p><ul>{(req.rubric||[]).map(item=><li key={item.key}>{item.label}</li>)}</ul></div>
                <span className={evidence?.result==='competent'?'competent':evidence?.result==='retry'?'retry':''}>{evidence?.result==='competent'?'COMPETENT ✓':evidence?.result==='retry'?'RETRY REQUIRED':'PENDING SUPERVISED PRACTICAL'}</span>
              </article>
            })}
          </div>

          <div className="learner-gates">
            <h3>Programme completion gates</h3>
            <div><span className={completion?.learning_percent===100?'ok':''}>Learning {completion?.learning_percent??selected.progress_percent}%</span><span className={completion?.theory_passed?'ok':''}>Theory {completion?.theory_passed?'Passed':'Pending'}</span><span className={completion?.required_practicals>0&&completion?.competent_practicals>=completion?.required_practicals?'ok':''}>Practical {completion?.competent_practicals??0}/{completion?.required_practicals??requirements.length}</span></div>
          </div>

          <div className="learner-practicals">
            <div><h3>Practical evidence</h3><p>Supervised station work separates training from theory.</p></div>
            {!practicals.length?<div className="learner-practical-empty">No practical shift has been scheduled yet. Completing your learning modules makes you eligible for supervisor allocation when station capacity is available.</div>:
              practicals.map(p=><article key={p.id}><strong>{p.practical_type.replaceAll('_',' ')}</strong><span>{p.result||'not yet assessed'}</span>{p.feedback&&<p>{p.feedback}</p>}</article>)}
          </div>

          <div className="learner-certificate">
            <h3>Certificate</h3>
            {certificate&&!certificate.revoked_at?
              <p><strong>{certificate.certificate_no}</strong> • ALLEGRO Radio Academy {certificate.certificate_type} certificate issued {new Date(certificate.issued_at).toLocaleDateString()}.</p>:
              <p>Certificates are issued only after the required learning and supervisor/practical review. They are ALLEGRO Radio Academy certificates, not SAQA/QCTO-accredited qualifications unless formal accreditation is obtained.</p>}
          </div>
        </section>}
      </section>}
  </main>
}
