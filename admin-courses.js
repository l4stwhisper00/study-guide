'use strict';
(async()=>{
 const cfg=window.STUDY_GUIDE_SUPABASE,db=window.supabase.createClient(cfg.url,cfg.publishableKey),$=s=>document.querySelector(s),status=t=>$('#adminStatus').textContent=t;
 const formData=f=>Object.fromEntries(new FormData(f).entries());
 const parseJson=(v,fallback=[])=>{if(!v)return fallback;try{return JSON.parse(v)}catch{throw new Error('Проверь JSON в полях определений, формул или шагов решения.')}};
 const {data:{user}}=await db.auth.getUser();
 if(!user){status('Сначала войди через личный кабинет.');return;}
 const {data:admin,error}=await db.from('site_admins').select('user_id').eq('user_id',user.id).maybeSingle();
 if(error||!admin){status('У этого аккаунта пока нет прав автора. Попроси владельца сайта добавить твой аккаунт в список администраторов.');return;}
 $('#adminApp').classList.remove('hidden');status('Ты вошёл как автор: '+user.email);
 let courses=[],modules=[];
 async function refresh(){
  const c=await db.from('exam_courses').select('id,title,subject_name,exam_type,exam_year,status').order('exam_type').order('sort_order');
  if(c.error){status(c.error.message);return;}courses=c.data||[];
  const opts=courses.map(x=>'<option value="'+x.id+'">'+x.exam_type+' '+x.exam_year+' · '+x.subject_name+' · '+x.status+'</option>').join('');
  $('#moduleCourse').innerHTML=opts;$('#publishCourse').innerHTML=opts;
  const m=await db.from('course_modules').select('id,title,course_id').order('sort_order');modules=m.data||[];
  $('#lessonModule').innerHTML=modules.map(x=>'<option value="'+x.id+'">'+x.title+'</option>').join('');
  const lessons=await db.from('course_lessons').select('id,title').order('title');
  $('#exerciseLesson').innerHTML=(lessons.data||[]).map(x=>'<option value="'+x.id+'">'+x.title+'</option>').join('');
  $('#adminCourses').innerHTML=courses.map(x=>'<div class="admin-course"><strong>'+x.exam_type+' '+x.exam_year+' · '+x.subject_name+'</strong><p>'+x.title+' — '+x.status+'</p></div>').join('');
 }
 $('#courseForm').addEventListener('submit',async e=>{e.preventDefault();try{const v=formData(e.target);v.exam_year=Number(v.exam_year);v.created_by=user.id;const {error}=await db.from('exam_courses').insert(v);if(error)throw error;e.target.reset();await refresh();status('Черновик курса создан.');}catch(err){status(err.message)}});
 $('#moduleForm').addEventListener('submit',async e=>{e.preventDefault();const v=formData(e.target);const {error}=await db.from('course_modules').insert(v);status(error?error.message:'Модуль создан.');if(!error){e.target.reset();await refresh();}});
 $('#lessonForm').addEventListener('submit',async e=>{e.preventDefault();try{const v=formData(e.target);v.key_definitions=parseJson(v.key_definitions);v.formulas=parseJson(v.formulas);v.worked_steps=parseJson(v.worked_steps);v.is_published=e.target.elements.is_published.checked;const {error}=await db.from('course_lessons').insert(v);if(error)throw error;e.target.reset();status('Урок сохранён как черновик.');}catch(err){status(err.message)}});
 $('#exerciseForm').addEventListener('submit',async e=>{e.preventDefault();try{const v=formData(e.target);v.options=parseJson(v.options);v.correct_answer=parseJson(v.correct_answer,null);v.difficulty=Number(v.difficulty||1);const answer=v.correct_answer;delete v.correct_answer;const {data:created,error}=await db.from('lesson_exercises').insert(v).select('id').single();if(error)throw error;const saved=await db.functions.invoke('save-exercise-answer',{body:{exercise_id:created.id,correct_answer:answer}});if(saved.error)throw saved.error;e.target.reset();status('Упражнение и закрытый ключ ответа сохранены.');}catch(err){status(err.message)}});
 $('#publishForm').addEventListener('submit',async e=>{e.preventDefault();const v=formData(e.target),id=v.course_id;const {error}=await db.from('exam_courses').update({status:e.target.publish.checked?'published':'draft',updated_at:new Date().toISOString()}).eq('id',id);status(error?error.message:'Статус курса обновлён. Убедись, что уроки также опубликованы.');await refresh();});
 await refresh();
})();