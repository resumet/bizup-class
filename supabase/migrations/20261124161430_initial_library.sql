-- No member content or video URL is stored in public preview rows.
create table public.admins(user_id uuid primary key references auth.users(id) on delete cascade);
create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,email text,display_name text not null default '회원',created_at timestamptz not null default now());
create table public.categories(name text primary key);
insert into public.categories values ('AI 입문'),('AI 업무 활용'),('생산성'),('이미지 생성'),('자동화');
create table public.articles(id uuid primary key,slug text not null unique,title text not null,excerpt text not null,category text not null references public.categories(name),cover text,theme text not null default 'mint',read_minutes int not null default 5 check(read_minutes between 1 and 120),status text not null check(status in ('draft','published')),preview jsonb not null,published_at timestamptz not null default now());
create table public.article_bodies(article_id uuid primary key references public.articles(id) on delete cascade,body jsonb not null,document jsonb not null);
create table public.media(id uuid primary key,path text not null unique,article_id uuid references public.articles(id) on delete set null,created_at timestamptz not null default now());
create table public.courses(id uuid primary key,slug text not null unique,title text not null,description text not null,category text not null,theme text not null default 'dark',status text not null check(status in ('draft','published')),created_at timestamptz not null default now());
create table public.lessons(id uuid primary key,course_id uuid not null references public.courses(id) on delete cascade,title text not null,position int not null,duration text not null);
create index lessons_course_idx on public.lessons(course_id);
create table public.lesson_videos(lesson_id uuid primary key references public.lessons(id) on delete cascade,vimeo_id text not null,vimeo_hash text not null default '');
create table public.subscriptions(user_id uuid primary key references auth.users(id) on delete cascade,status text not null check(status in ('active','canceling','expired','past_due')),current_period_end timestamptz not null,cancel_at_period_end boolean not null default false,updated_at timestamptz not null default now());
create table public.billing_customers(user_id uuid primary key references auth.users(id) on delete cascade,customer_key text unique not null,billing_key_encrypted text,last_auth_hash text,created_at timestamptz not null default now());
create table public.billing_orders(order_id text primary key,user_id uuid not null references auth.users(id),period_start timestamptz not null,period_end timestamptz not null,status text not null default 'pending' check(status in ('pending','paid','failed','review')),created_at timestamptz not null default now(),unique(user_id,period_start));
create table public.payments(order_id text primary key references public.billing_orders(order_id),user_id uuid not null references auth.users(id),payment_key text not null unique,amount int not null check(amount=19900),status text not null,receipt_url text,created_at timestamptz not null default now());
create index payments_user_idx on public.payments(user_id);
create table public.billing_locks(user_id uuid primary key,token uuid not null,expires_at timestamptz not null);
create table public.notification_outbox(id bigint generated always as identity primary key,event_key text unique not null,user_id uuid references auth.users(id),event_type text not null,payload jsonb not null default '{}',status text not null default 'pending',created_at timestamptz not null default now());

alter table public.admins enable row level security;
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.articles enable row level security;
alter table public.article_bodies enable row level security;
alter table public.media enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_videos enable row level security;
alter table public.subscriptions enable row level security;
alter table public.billing_customers enable row level security;
alter table public.billing_orders enable row level security;
alter table public.payments enable row level security;
alter table public.billing_locks enable row level security;
alter table public.notification_outbox enable row level security;

revoke all on public.admins,public.profiles,public.categories,public.articles,public.article_bodies,public.media,public.courses,public.lessons,public.lesson_videos,public.subscriptions,public.billing_customers,public.billing_orders,public.payments,public.billing_locks,public.notification_outbox from anon,authenticated;
grant select on public.categories,public.articles,public.courses,public.lessons to anon,authenticated;
grant select on public.profiles,public.article_bodies,public.lesson_videos,public.subscriptions,public.payments to authenticated;
grant all on all tables in schema public to service_role;
grant usage,select on all sequences in schema public to service_role;
create policy categories_read on public.categories for select to anon,authenticated using(true);
create policy articles_read on public.articles for select to anon,authenticated using(status='published');
create policy bodies_read on public.article_bodies for select to authenticated using((select auth.uid()) is not null and exists(select 1 from public.articles a where a.id=article_id and a.status='published'));
create policy courses_read on public.courses for select to anon,authenticated using(status='published');
create policy lessons_read on public.lessons for select to anon,authenticated using(exists(select 1 from public.courses c where c.id=course_id and c.status='published'));
create policy videos_read on public.lesson_videos for select to authenticated using(exists(select 1 from public.subscriptions s where s.user_id=(select auth.uid()) and s.status in ('active','canceling') and s.current_period_end>now()) and exists(select 1 from public.lessons l join public.courses c on c.id=l.course_id where l.id=lesson_id and c.status='published'));
create policy profiles_self on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy subscriptions_self on public.subscriptions for select to authenticated using(user_id=(select auth.uid()));
create policy payments_self on public.payments for select to authenticated using(user_id=(select auth.uid()));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('content-images','content-images',false,4000000,array['image/webp']),('covers','covers',true,4000000,array['image/webp']) on conflict(id) do nothing;
-- No client storage policies: private media is streamed by the authenticated application route.

create function public.save_article(p_meta jsonb,p_preview jsonb,p_body jsonb,p_document jsonb,p_media_ids uuid[]) returns void language plpgsql security invoker set search_path='' as $$
begin
 insert into public.categories(name) values(p_meta->>'category') on conflict do nothing;
 insert into public.articles(id,slug,title,excerpt,category,cover,theme,read_minutes,status,preview)
 values((p_meta->>'id')::uuid,p_meta->>'slug',p_meta->>'title',p_meta->>'excerpt',p_meta->>'category',p_meta->>'cover',p_meta->>'theme',(p_meta->>'read_minutes')::int,p_meta->>'status',p_preview)
 on conflict(id) do update set slug=excluded.slug,title=excluded.title,excerpt=excluded.excerpt,category=excluded.category,cover=excluded.cover,theme=excluded.theme,read_minutes=excluded.read_minutes,status=excluded.status,preview=excluded.preview;
 insert into public.article_bodies values((p_meta->>'id')::uuid,p_body,p_document) on conflict(article_id) do update set body=excluded.body,document=excluded.document;
 if exists(select 1 from public.media where id=any(p_media_ids) and article_id is not null and article_id<>(p_meta->>'id')::uuid) then raise exception 'Image belongs to another article';end if;
 update public.media set article_id=null where article_id=(p_meta->>'id')::uuid and not(id=any(p_media_ids));
 update public.media set article_id=(p_meta->>'id')::uuid where id=any(p_media_ids);
end;$$;
create function public.save_course(p_course jsonb) returns void language plpgsql security invoker set search_path='' as $$
declare l jsonb; pos int:=0;
begin
 insert into public.courses(id,slug,title,description,category,theme,status) values((p_course->>'id')::uuid,p_course->>'slug',p_course->>'title',p_course->>'description',p_course->>'category',p_course->>'theme',p_course->>'status') on conflict(id) do update set slug=excluded.slug,title=excluded.title,description=excluded.description,category=excluded.category,theme=excluded.theme,status=excluded.status;
 delete from public.lessons where course_id=(p_course->>'id')::uuid;
 for l in select value from jsonb_array_elements(p_course->'lessons') loop
 pos:=pos+1;
 insert into public.lessons values((l->>'id')::uuid,(p_course->>'id')::uuid,l->>'title',pos,l->>'duration');
 insert into public.lesson_videos values((l->>'id')::uuid,l->>'vimeo_id',coalesce(l->>'vimeo_hash',''));
 end loop;
end;$$;

create function public.claim_billing_lock(p_user uuid,p_token uuid) returns boolean language plpgsql security invoker set search_path='' as $$
begin
 insert into public.billing_locks values(p_user,p_token,now()+interval '5 minutes') on conflict(user_id) do update set token=excluded.token,expires_at=excluded.expires_at where public.billing_locks.expires_at<now();
 return exists(select 1 from public.billing_locks where user_id=p_user and token=p_token);
end;$$;
create function public.settle_payment(p_order_id text,p_payment_key text,p_receipt_url text) returns void language plpgsql security invoker set search_path='' as $$
declare o public.billing_orders;
begin
 select * into strict o from public.billing_orders where order_id=p_order_id for update;
 if o.status='paid' then return;end if;
 insert into public.payments(order_id,user_id,payment_key,amount,status,receipt_url) values(o.order_id,o.user_id,p_payment_key,19900,'DONE',p_receipt_url);
 insert into public.subscriptions(user_id,status,current_period_end) values(o.user_id,'active',o.period_end) on conflict(user_id) do update set status=case when public.subscriptions.cancel_at_period_end then 'canceling' else 'active' end,current_period_end=greatest(public.subscriptions.current_period_end,excluded.current_period_end),updated_at=now();
 update public.billing_orders set status='paid' where order_id=p_order_id;
 insert into public.notification_outbox(event_key,user_id,event_type,payload) values('paid:'||p_order_id,o.user_id,'payment_succeeded',jsonb_build_object('orderId',p_order_id,'amount',19900)) on conflict do nothing;
end;$$;
revoke all on function public.save_article(jsonb,jsonb,jsonb,jsonb,uuid[]),public.save_course(jsonb),public.claim_billing_lock(uuid,uuid),public.settle_payment(text,text,text) from public,anon,authenticated;
grant execute on function public.save_article(jsonb,jsonb,jsonb,jsonb,uuid[]),public.save_course(jsonb),public.claim_billing_lock(uuid,uuid),public.settle_payment(text,text,text) to service_role;

create function public.record_payment_cancellation(p_order_id text,p_status text) returns void language plpgsql security invoker set search_path='' as $$
declare o public.billing_orders;
begin
 if p_status not in ('CANCELED','PARTIAL_CANCELED') then raise exception 'Invalid cancellation status';end if;
 select * into strict o from public.billing_orders where order_id=p_order_id for update;
 update public.payments set status=p_status where order_id=p_order_id;
 -- A refund of an older period must not revoke a later paid period.
 if p_status='CANCELED' then
 update public.subscriptions set status='expired',cancel_at_period_end=true,current_period_end=least(current_period_end,now()) where user_id=o.user_id and current_period_end<=o.period_end;
 end if;
 insert into public.notification_outbox(event_key,user_id,event_type,payload) values('cancel:'||p_order_id||':'||p_status,o.user_id,'payment_canceled',jsonb_build_object('orderId',p_order_id,'status',p_status)) on conflict do nothing;
end;$$;
revoke all on function public.record_payment_cancellation(text,text) from public,anon,authenticated;
grant execute on function public.record_payment_cancellation(text,text) to service_role;
