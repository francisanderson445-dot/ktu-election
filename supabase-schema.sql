create table if not exists settings (
  key text primary key,
  value text not null
);

create table if not exists students (
  id bigserial primary key,
  firstName text not null,
  lastName text not null,
  email text unique not null,
  indexNumber text,
  level text not null default '400',
  programme text,
  department text,
  hasVoted integer default 0,
  createdAt timestamptz default now()
);

create table if not exists nominees (
  id bigserial primary key,
  fullName text not null,
  email text unique not null,
  password text not null,
  portfolio text,
  bio text,
  manifesto text,
  programme text default 'BTECH',
  level text default '400',
  photoUrl text,
  voteCount integer default 0,
  createdAt timestamptz default now()
);

create table if not exists votes (
  id bigserial primary key,
  studentId bigint not null references students(id),
  nomineeId bigint not null references nominees(id),
  submittedAt timestamptz default now(),
  unique(studentId)
);

create table if not exists admin_users (
  id bigserial primary key,
  username text unique not null,
  password text not null,
  fullName text not null,
  createdAt timestamptz default now()
);

create table if not exists approved_students (
  id bigserial primary key,
  firstName text,
  lastName text,
  email text unique not null,
  indexNumber text,
  level text default '400',
  programme text default 'BTECH',
  sourceFile text
);

insert into settings (key, value) values
  ('votingOpen', '1'),
  ('maxVoters', '400')
on conflict (key) do nothing;
