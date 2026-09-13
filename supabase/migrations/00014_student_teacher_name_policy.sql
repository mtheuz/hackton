create policy users_select_teacher_name_for_class on users
  for select using (
    role = 'teacher' and exists (
      select 1 from classes c
      where c.teacher_id = users.id
        and exists (
          select 1 from sessions s
          where s.class_id = c.id
            and s.status = 'active'
        )
    )
  );
