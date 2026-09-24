import { supabase } from '../lib/supabaseClient'
function ready(){if(!supabase)throw new Error('Supabase is not configured.')}
export async function createSupportTicket(userId,values){ready();const{data,error}=await supabase.from('support_tickets').insert({user_id:userId,subject:values.subject.trim(),category:values.category||'general',body:values.body.trim()}).select().single();if(error)throw error;return data}
export async function getMyTickets(userId){ready();const{data,error}=await supabase.from('support_tickets').select('*').eq('user_id',userId).order('created_at',{ascending:false});if(error)throw error;return data||[]}
export async function getSupportQueue(){ready();const{data,error}=await supabase.from('support_tickets').select('*').order('created_at',{ascending:false}).limit(100);if(error)throw error;return data||[]}
export async function updateSupportTicket(id,changes){ready();const{data,error}=await supabase.from('support_tickets').update({...changes,updated_at:new Date().toISOString()}).eq('id',id).select().single();if(error)throw error;return data}
export async function getAuditLog(){ready();const{data,error}=await supabase.from('audit_logs').select('*').order('created_at',{ascending:false}).limit(100);if(error)throw error;return data||[]}
