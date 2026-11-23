import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.2";
const corsHeaders={"Access-Control-Allow-Origin":"https://navigator.devs.li","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 const token=(req.headers.get("Authorization")||"").replace(/^Bearer\s+/i,"");
 if(!token)return json({error:"Sign in to check and save your answers"},401);
 const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!url||!key)return json({error:"Server configuration is incomplete"},500);
 const admin=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:userData,error:authError}=await admin.auth.getUser(token);
 if(authError||!userData.user)return json({error:"Invalid session"},401);
 let body:{exercise_id?:string;answer?:unknown};
 try{body=await req.json()}catch{return json({error:"Invalid JSON"},400)}
 if(!body.exercise_id||body.answer===undefined)return json({error:"exercise_id and answer are required"},400);
 const {data,error}=await admin.rpc("check_exercise_answer",{p_exercise_id:body.exercise_id,p_answer:body.answer});
 if(error)return json({error:error.message},400);
 const result=Array.isArray(data)?data[0]:data;
 if(!result)return json({error:"Answer key is not available for this exercise yet"},404);
 return json({correct:!!result.is_correct,explanation:result.explanation_md||""});
});
