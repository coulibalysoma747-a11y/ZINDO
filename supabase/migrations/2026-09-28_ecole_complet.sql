-- École, étapes 2 à 5 (flag gestion_scolaire) — voir lib/actions/school*.ts.
-- Frais multiples, enseignants, matières, présences, évaluations et notes,
-- emploi du temps, leçons (chapitres) et devoirs.

-- ---------------------------------------------------------------------------
-- Frais scolaires en plus de la scolarité de la classe (inscription, cantine,
-- transport, uniforme…). class_id vide = frais demandés à toutes les classes.
-- ---------------------------------------------------------------------------
create table if not exists school_fees (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  class_id text references school_classes(id) on delete cascade,
  fee_type text not null default 'AUTRE',
  label text not null,
  amount double precision not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists school_fees_business_idx on school_fees (business_id);

alter table student_payments add column if not exists fee_type text not null default 'SCOLARITE';

alter table students add column if not exists photo_url text;
alter table students add column if not exists birth_place text;
alter table students add column if not exists address text;
alter table students add column if not exists parent_whatsapp text;
alter table students add column if not exists parent_relation text;
alter table students add column if not exists enrolled_at date default current_date;

-- ---------------------------------------------------------------------------
-- Enseignants et matières
-- ---------------------------------------------------------------------------
create table if not exists school_teachers (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  -- Compte ZINDO de l'enseignant : il voit alors ses classes, ses cours, etc.
  user_id text references users(id) on delete set null,
  last_name text not null,
  first_name text not null,
  phone text,
  whatsapp text,
  email text,
  function text,
  hire_date date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists school_teachers_business_idx on school_teachers (business_id, last_name);
create index if not exists school_teachers_user_idx on school_teachers (user_id);

alter table school_classes add column if not exists main_teacher_id text references school_teachers(id) on delete set null;

create table if not exists school_subjects (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index if not exists school_subjects_business_idx on school_subjects (business_id, name);

-- Matière enseignée dans une classe : coefficient et enseignant.
create table if not exists school_class_subjects (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  class_id text not null references school_classes(id) on delete cascade,
  subject_id text not null references school_subjects(id) on delete cascade,
  teacher_id text references school_teachers(id) on delete set null,
  coefficient double precision not null default 1,
  unique (class_id, subject_id)
);
create index if not exists school_class_subjects_teacher_idx on school_class_subjects (teacher_id);

-- ---------------------------------------------------------------------------
-- Présences
-- ---------------------------------------------------------------------------
create table if not exists school_attendance (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  student_id text not null references students(id) on delete cascade,
  class_id text references school_classes(id) on delete set null,
  day date not null,
  status text not null, -- PRESENT, ABSENT, RETARD, JUSTIFIE
  note text,
  user_id text references users(id),
  updated_at timestamptz not null default now(),
  unique (student_id, day)
);
create index if not exists school_attendance_business_day_idx on school_attendance (business_id, day);

create table if not exists school_teacher_attendance (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  teacher_id text not null references school_teachers(id) on delete cascade,
  day date not null,
  status text not null,
  note text,
  user_id text references users(id),
  updated_at timestamptz not null default now(),
  unique (teacher_id, day)
);
create index if not exists school_teacher_attendance_business_day_idx on school_teacher_attendance (business_id, day);

-- ---------------------------------------------------------------------------
-- Évaluations et notes
-- ---------------------------------------------------------------------------
create table if not exists school_evaluations (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  class_id text not null references school_classes(id) on delete cascade,
  subject_id text not null references school_subjects(id) on delete cascade,
  term int not null default 1,
  kind text not null default 'DEVOIR', -- INTERROGATION, DEVOIR, COMPOSITION, EXAMEN
  title text not null,
  day date not null default current_date,
  max_score double precision not null default 20,
  weight double precision not null default 1,
  locked boolean not null default false,
  created_by text references users(id),
  created_at timestamptz not null default now()
);
create index if not exists school_evaluations_class_idx on school_evaluations (business_id, class_id, term);

create table if not exists school_grades (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  evaluation_id text not null references school_evaluations(id) on delete cascade,
  student_id text not null references students(id) on delete cascade,
  score double precision,
  absent boolean not null default false,
  updated_by text references users(id),
  updated_at timestamptz not null default now(),
  unique (evaluation_id, student_id)
);
create index if not exists school_grades_student_idx on school_grades (student_id);

-- Appréciation et décision du conseil, saisies par trimestre.
create table if not exists school_report_notes (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  student_id text not null references students(id) on delete cascade,
  term int not null,
  appreciation text,
  decision text,
  updated_at timestamptz not null default now(),
  unique (student_id, term)
);

-- ---------------------------------------------------------------------------
-- Emploi du temps
-- ---------------------------------------------------------------------------
create table if not exists school_timetable (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  class_id text not null references school_classes(id) on delete cascade,
  weekday int not null, -- 1 = lundi … 6 = samedi
  start_time text not null, -- « 07:30 »
  end_time text not null,
  subject_id text references school_subjects(id) on delete set null,
  teacher_id text references school_teachers(id) on delete set null,
  room text
);
create index if not exists school_timetable_class_idx on school_timetable (business_id, class_id, weekday);

-- ---------------------------------------------------------------------------
-- Leçons (chapitre par chapitre) et devoirs
-- ---------------------------------------------------------------------------
create table if not exists school_chapters (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  class_id text not null references school_classes(id) on delete cascade,
  subject_id text not null references school_subjects(id) on delete cascade,
  title text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists school_chapters_class_idx on school_chapters (business_id, class_id, subject_id, position);

create table if not exists school_lessons (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  chapter_id text not null references school_chapters(id) on delete cascade,
  title text not null,
  content text,
  position int not null default 0,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists school_lessons_chapter_idx on school_lessons (chapter_id, position);

create table if not exists school_homework (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  class_id text not null references school_classes(id) on delete cascade,
  subject_id text references school_subjects(id) on delete set null,
  kind text not null default 'DEVOIR', -- DEVOIR, EXERCICES, QUESTIONS
  title text not null,
  content text,
  due_date date,
  created_by text references users(id),
  created_at timestamptz not null default now()
);
create index if not exists school_homework_class_idx on school_homework (business_id, class_id, due_date);

-- ---------------------------------------------------------------------------
-- RLS (application Windows) — même principe que 2026-09-27_gestion_scolaire.sql.
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'school_fees', 'school_teachers', 'school_subjects', 'school_class_subjects', 'school_attendance',
    'school_teacher_attendance', 'school_evaluations', 'school_grades', 'school_report_notes',
    'school_timetable', 'school_chapters', 'school_lessons', 'school_homework'
  ] loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists zindo_tenant_isolation on %I;', t);
    execute format(
      'create policy zindo_tenant_isolation on %I using (business_id = zindo_current_business_id()) with check (business_id = zindo_current_business_id());',
      t
    );
    execute format('grant select, insert, update, delete on %I to authenticated;', t);
    execute format('revoke all on %I from anon;', t);
  end loop;
end $$;
