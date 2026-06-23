-- 1. Create a secure function to check group membership (bypasses RLS recursion)
create or replace function public.is_group_member(check_group_id uuid)
returns boolean as $$
begin
  return exists (
    select 1 from public.group_members
    where group_id = check_group_id and user_id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- 2. Drop the old recursive policies
drop policy if exists "Users can view groups they belong to" on public.shared_groups;
drop policy if exists "Users can view members of groups they belong to" on public.group_members;
drop policy if exists "Users can insert members if they belong to the group" on public.group_members;
drop policy if exists "Users can view expenses in groups they belong to" on public.group_expenses;
drop policy if exists "Users can insert expenses in groups they belong to" on public.group_expenses;

-- 3. Drop the new policies just in case you are running this multiple times
drop policy if exists "Users can view groups" on public.shared_groups;
drop policy if exists "Users can view members" on public.group_members;
drop policy if exists "Group creators can insert members" on public.group_members;
drop policy if exists "Users can view expenses" on public.group_expenses;
drop policy if exists "Users can insert expenses" on public.group_expenses;

-- 4. Create the new non-recursive policies
create policy "Users can view groups" on public.shared_groups for select using (
  created_by = auth.uid() or public.is_group_member(id)
);

create policy "Users can view members" on public.group_members for select using (
  public.is_group_member(group_id)
);

create policy "Group creators can insert members" on public.group_members for insert with check (
  exists (select 1 from public.shared_groups where id = group_id and created_by = auth.uid())
  or user_id = auth.uid()
);

create policy "Users can view expenses" on public.group_expenses for select using (
  public.is_group_member(group_id)
);

create policy "Users can insert expenses" on public.group_expenses for insert with check (
  public.is_group_member(group_id)
);
