-- supabase/migrations/00010_school_aggregate_views.sql
create view school_mood_stats as
select
  u.school_id,
  u.class_id,
  date_trunc('day', se.created_at)::date as day,
  se.payload_json->>'mood' as mood,
  count(distinct se.student_id) as student_count
from student_events se
join users u on u.id = se.student_id
where se.event_type = 'checkin_humor'
  and u.class_id is not null
  and u.school_id = (select school_id from users where id = auth.uid())
  and exists (select 1 from users me where me.id = auth.uid() and me.role = 'school_admin')
group by u.school_id, u.class_id, date_trunc('day', se.created_at)::date, se.payload_json->>'mood'
having count(distinct se.student_id) >= 3;

create view school_engagement_stats as
select
  u.school_id,
  u.class_id,
  date_trunc('day', se.created_at)::date as day,
  se.event_type,
  count(distinct se.student_id) as student_count
from student_events se
join users u on u.id = se.student_id
where se.event_type in ('intercepta_mission', 'activity_answer')
  and u.class_id is not null
  and u.school_id = (select school_id from users where id = auth.uid())
  and exists (select 1 from users me where me.id = auth.uid() and me.role = 'school_admin')
group by u.school_id, u.class_id, date_trunc('day', se.created_at)::date, se.event_type
having count(distinct se.student_id) >= 3;

grant select on school_mood_stats, school_engagement_stats to authenticated;
