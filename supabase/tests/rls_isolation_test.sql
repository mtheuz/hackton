-- supabase/tests/rls_isolation_test.sql
-- Run manually against a seeded local DB (Task 5 provides the seed data).
-- Expect: student A can only see their own student_events rows.

set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select count(*) as visible_rows
from student_events
where student_id = '22222222-2222-2222-2222-222222222222';
-- Expected once RLS is in place: 0 (student A cannot see student B's events)
