import { supabase } from '../lib/supabaseClient'
export async function getRiskQueue(){if(!supabase)return[];const{data,error}=await supabase.from('risk_flags').select('*').in('status',['open','reviewing']).order('created_at',{ascending:true});if(error)throw error;return data||[]}
export async function reviewRiskFlag({flagId,status,reason}){if(!supabase)throw new Error('Supabase is not configured.');const{error}=await supabase.rpc('review_risk_flag',{p_flag_id:flagId,p_status:status,p_reason:reason});if(error)throw error}
