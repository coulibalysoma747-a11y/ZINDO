-- École (flag gestion_scolaire, activité « ecole ») — voir lib/actions/school.ts.
--
-- Étape 1 : classes, élèves et paiements de la scolarité par tranches.
-- Le reste à payer d'un élève = frais annuels de sa classe (ou montant
-- propre à l'élève s'il est renseigné) − somme de ses paiements.

create table if not exists school_classes (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  name text not null,
  level text,
  annual_fee double precision not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists school_classes_business_idx on school_classes (business_id, name);

create table if not exists students (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  class_id text references school_classes(id) on delete set null,
  matricule text,
  last_name text not null,
  first_name text not null,
  sex text,
  birth_date date,
  parent_name text,
  parent_phone text,
  -- Montant annuel propre à l'élève (bourse, réduction…) ; sinon celui de la classe.
  custom_fee double precision,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists students_business_idx on students (business_id, last_name);
create index if not exists students_class_idx on students (class_id);

create table if not exists student_payments (
  id text primary key default gen_random_uuid()::text,
  business_id text not null references businesses(id) on delete cascade,
  student_id text not null references students(id) on delete cascade,
  number text not null,
  amount double precision not null,
  method text not null default 'ESPECES',
  note text,
  paid_at timestamptz not null default now(),
  user_id text references users(id),
  unique (business_id, number)
);
create index if not exists student_payments_student_idx on student_payments (student_id, paid_at);

-- ---------------------------------------------------------------------------
-- RLS (application Windows) — même principe que 2026-09-23_rls_phase1_core_commerce.sql.
-- ---------------------------------------------------------------------------
alter table school_classes enable row level security;
drop policy if exists zindo_tenant_isolation on school_classes;
create policy zindo_tenant_isolation on school_classes
  using (business_id = zindo_current_business_id())
  with check (business_id = zindo_current_business_id());
grant select, insert, update, delete on school_classes to authenticated;
revoke all on school_classes from anon;

alter table students enable row level security;
drop policy if exists zindo_tenant_isolation on students;
create policy zindo_tenant_isolation on students
  using (business_id = zindo_current_business_id())
  with check (business_id = zindo_current_business_id());
grant select, insert, update, delete on students to authenticated;
revoke all on students from anon;

alter table student_payments enable row level security;
drop policy if exists zindo_tenant_isolation on student_payments;
create policy zindo_tenant_isolation on student_payments
  using (business_id = zindo_current_business_id())
  with check (business_id = zindo_current_business_id());
grant select, insert, update, delete on student_payments to authenticated;
revoke all on student_payments from anon;
