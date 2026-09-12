-- supabase/migrations/00009_drop_class_aggregate_leftovers.sql
-- Cleanup for a parallel-session redundancy: 00008_school_daily_signals.sql
-- already ships the school-level aggregation used by EscolaHome. These
-- class-level views and the users.class_id column they depended on were an
-- independent, now-unused attempt at the same requirement.
drop view if exists school_mood_stats;
drop view if exists school_engagement_stats;
alter table users drop column if exists class_id;
