-- RIO category ordering: manager-only, atomic, tenant-scoped.
-- Normalization preserves every category, item, visibility flag and menu link.
-- Existing ties are resolved deterministically by current sort order, name and ID.
do $$
declare
 v_restaurant uuid;
begin
 select id into v_restaurant from public.restaurants where slug='rio-deventer';
 if v_restaurant is not null then
   with numbered as (
     select id, row_number() over (order by sort_order, name, id)::integer as position
     from public.menu_sections where restaurant_id=v_restaurant
   )
   update public.menu_sections s
   set sort_order=numbered.position
   from numbered
   where s.id=numbered.id and s.restaurant_id=v_restaurant
     and s.sort_order is distinct from numbered.position;
 end if;
end $$;

create function public.move_menu_section(
 p_restaurant_id uuid, p_section_id uuid, p_direction integer
) returns boolean
language plpgsql security definer set search_path=public,pg_temp
as $$
declare
 v_ids uuid[];
 v_len integer;
 v_index integer;
 v_target integer;
 v_tmp uuid;
 v_i integer;
begin
 if p_restaurant_id is null or p_section_id is null or p_direction not in (-1,1)
   or auth.uid() is null or (auth.jwt()->>'aal') is distinct from 'aal2'
   or not exists(
     select 1 from public.user_restaurants ur
     where ur.user_id=auth.uid() and ur.restaurant_id=p_restaurant_id
       and ur.active and ur.role in ('restaurant_owner','manager')
   )
 then raise exception 'forbidden'; end if;

 -- Serialize all reordering within one restaurant, avoiding concurrent
 -- updates with identical positions or lost changes.
 perform 1 from public.restaurants where id=p_restaurant_id and is_active for update;
 if not found then raise exception 'restaurant_not_found'; end if;

 select array_agg(id order by sort_order, name, id) into v_ids
 from public.menu_sections where restaurant_id=p_restaurant_id;
 if v_ids is null then raise exception 'no_categories'; end if;
 v_len := cardinality(v_ids);
 v_index := array_position(v_ids,p_section_id);
 if v_index is null then raise exception 'category_not_found'; end if;
 v_target := v_index+p_direction;
 if v_target >= 1 and v_target <= v_len then
   v_tmp := v_ids[v_target];
   v_ids[v_target] := v_ids[v_index];
   v_ids[v_index] := v_tmp;
 end if;

 for v_i in 1..v_len loop
   update public.menu_sections set sort_order=v_i
    where restaurant_id=p_restaurant_id and id=v_ids[v_i]
      and sort_order is distinct from v_i;
 end loop;
 return v_target >= 1 and v_target <= v_len;
end $$;
revoke all on function public.move_menu_section(uuid,uuid,integer) from public, anon;
grant execute on function public.move_menu_section(uuid,uuid,integer) to authenticated;
