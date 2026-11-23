'use strict';
(() => {
 const cfg=window.STUDY_GUIDE_SUPABASE;
 const client=window.supabase.createClient(cfg.url,cfg.publishableKey);
 const $=s=>document.querySelector(s);
 const state={courses:[],course:null,module:null};
 const status=(t,bad=false)=>{const n=$('#courseStatus');n.textContent=t;n.classList.toggle('bad',bad)};
 const safe=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=(s)=>String(s||'').replace(/^### (.*)$/gm,'<h3>$1</h3>').replace(/^## (.*)$/gm,'<h2>$1</h2>').replace(/^# (.*)$/gm,'<h2>$1</h2>').replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>').replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br>');
 async function load(){
  status('Загружаем каталог курсов…');
  const {data,error}=await client.from('exam_courses').select('id,exam_type,subject_code,subject_name,title,exam_year,variant,description,fipi_url,status,sort_order').eq('status','published').order('sort_order');
  if(error){status('Каталог пока не опубликован или Data API ещё не включён. '+error.message,true);return;}
  state.courses=data||[];
  const years=[...new Set(state.courses.map(c=>c.exam_year))].sort((a,b)=>b-a);
  $('#yearFilter').innerHTML='<option value="latest">Актуальный год</option>'+years.map(y=>'<option value="'+y+'">'+y+'</option>').join('');
  render();
 }
 function render(){
  const exam=$('#examFilter').value,year=$('#yearFilter').value,term=$('#courseSearch').value.trim().toLowerCase();
  const all=state.courses.filter(c=>c.exam_type===exam);
  const latest=all.reduce((m,c)=>Math.max(m,c.exam_year),0);
  const list=all.filter(c=>(year==='latest'?c.exam_year===latest:c.exam_year===Number(year))&&(c.subject_name+' '+c.title).toLowerCase().includes(term));
  $('#courseGrid').innerHTML=list.map(c=>'<article class="course-card"><span class="course-meta">'+c.exam_type+' · '+c.exam_year+(c.variant?' · '+safe(c.variant):'')+'</span><h3>'+safe(c.subject_name)+'</h3><p>'+safe(c.description)+'</p><button class="btn btn-primary course-open" data-course="'+c.id+'">Открыть курс →</button></article>').join('');
  status(list.length?('Доступно курсов: '+list.length):'Опубликованных курсов пока нет. Содержание появится после редакторской проверки.');
 }
 async function openCourse(id){
  const course=state.courses.find(c=>c.id===id);if(!course)return;state.course=course;
  $('#courseWorkspace').classList.remove('hidden');$('#lessonReader').innerHTML='<p class="muted">Загружаем программу…</p>';
  const {data,error}=await client.from('course_modules').select('id,title,description,sort_order,course_lessons(id,title,lesson_type,estimated_minutes,sort_order,is_published)').eq('course_id',id).order('sort_order');
  if(error){$('#lessonReader').textContent=error.message;return;}
  const modules=(data||[]).map(m=>({...m,course_lessons:(m.course_lessons||[]).filter(l=>l.is_published).sort((a,b)=>a.sort_order-b.sort_order)}));
  $('#moduleList').innerHTML='<h3>'+safe(course.subject_name)+'</h3>'+modules.map(m=>'<div><button class="module-btn" data-module="'+m.id+'">'+safe(m.title)+'</button><div class="lesson-list">'+m.course_lessons.length?m.course_lessons.map(l=>'<a href="#" class="lesson-link" data-lesson="'+l.id+'">'+safe(l.title)+' <small>· '+l.estimated_minutes+' мин</small></a>').join(''):'<p class="muted">Уроки этого модуля готовятся и появятся после проверки.</p>'+'</div></div>').join('')+(course.fipi_url?'<a href="'+safe(course.fipi_url)+'" target="_blank" rel="noopener">Документы ФИПИ ↗</a>':'');
  $('#moduleList').dataset.modules=JSON.stringify(modules);
  $('#lessonReader').innerHTML='<h2>'+safe(course.title)+'</h2><p class="muted">Выбери урок слева. Уроки содержат объяснение, определения, примеры и упражнения.</p>';
 }
 async function openLesson(id){
  const {data,error}=await client.from('course_lessons').select('id,module_id,title,lesson_type,content_md,key_definitions,formulas,worked_steps,estimated_minutes').eq('id',id).single();
  if(error){$('#lessonReader').textContent=error.message;return;}
  const {data:ex}=await client.from('lesson_exercises').select('id,prompt,answer_type,options,difficulty').eq('lesson_id',id).order('sort_order');
  const defs=(data.key_definitions||[]).map(d=>'<li><strong>'+safe(d.term||'')+'</strong> — '+safe(d.definition||'')+'</li>').join('');
  const formulas=(data.formulas||[]).map(f=>'<li><strong>'+safe(f.name||'Формула')+'</strong>: '+safe(f.value||'')+' — '+safe(f.note||'')+'</li>').join('');
  const steps=(data.worked_steps||[]).map((s,i)=>'<li><strong>Шаг '+(i+1)+'.</strong> '+safe(s)+'</li>').join('');
  const exercises=(ex||[]).map((e,i)=>'<div class="exercise" data-ex="'+e.id+'" data-type="'+safe(e.answer_type)+'"><p><strong>Задание '+(i+1)+'.</strong> '+safe(e.prompt)+'</p>'+(e.answer_type==='single_choice'?(e.options||[]).map((o,j)=>'<label><input type="radio" name="ex'+i+'" value="'+j+'"> '+safe(o.label||o)+'</label><br>').join(''):'<input class="exercise-answer" type="text" aria-label="Ответ">')+'<button class="btn" data-check="'+e.id+'">Проверить</button><div class="exercise-result" aria-live="polite"></div><template>'+safe(JSON.stringify({answer:e.correct_answer,explanation:e.explanation_md}))+'</template></div>').join('');
  $('#lessonReader').innerHTML='<span class="course-meta">'+safe(data.lesson_type)+' · '+data.estimated_minutes+' минут</span><h2>'+safe(data.title)+'</h2><div class="lesson-body"><p>'+fmt(safe(data.content_md))+'</p>'+(defs?'<h3>Ключевые определения</h3><ul>'+defs+'</ul>':'')+(formulas?'<h3>Формулы и правила</h3><ul>'+formulas+'</ul>':'')+(steps?'<h3>Разбор по шагам</h3><ol>'+steps+'</ol>':'')+'</div>'+(exercises?'<h3>Проверь себя</h3>'+exercises:'<p class="muted">Упражнения для этого урока скоро появятся.</p>')+'<button class="btn btn-primary" id="completeLesson">Отметить урок пройденным</button>';
  $('#completeLesson').addEventListener('click',async()=>{const {data:{user}}=await client.auth.getUser();if(!user){status('Войди в кабинет, чтобы сохранять прогресс.');return;}const {error}=await client.from('lesson_progress').upsert({user_id:user.id,lesson_id:id,status:'completed',completed_at:new Date().toISOString(),last_opened_at:new Date().toISOString()});status(error?'Не удалось сохранить прогресс: '+error.message:'Урок отмечен как пройденный.');});
 }
 document.addEventListener('click',async e=>{
  const c=e.target.closest('[data-course]');if(c){await openCourse(c.dataset.course);return;}
  const l=e.target.closest('[data-lesson]');if(l){e.preventDefault();await openLesson(l.dataset.lesson);return;}
  const chk=e.target.closest('[data-check]');if(chk){const box=chk.closest('.exercise'),input=box.querySelector('input:checked')||box.querySelector('.exercise-answer');const raw=input?.value?.trim();if(raw===undefined||raw===''){box.querySelector('.exercise-result').textContent='Сначала введи ответ.';return;}const answer=box.dataset.type==='single_choice'?Number(raw):raw;const result=await client.functions.invoke('check-exercise-answer',{body:{exercise_id:chk.dataset.check,answer}});box.querySelector('.exercise-result').textContent=result.error?(result.error.message||'Не удалось проверить ответ. Войди в аккаунт и попробуй снова.'):(result.data.correct?'Верно! ':'Пока неверно. ')+(result.data.explanation||'Попробуй разобрать решение ещё раз.');}
 });
 ['examFilter','yearFilter','courseSearch'].forEach(id=>$('#'+id).addEventListener('input',render));
 load();
})();