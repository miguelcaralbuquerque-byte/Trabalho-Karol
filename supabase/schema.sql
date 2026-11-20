create extension if not exists pgcrypto;

create table if not exists public.products (
    id text primary key,
    name text not null,
    price_cents integer not null check (price_cents >= 0),
    category text not null default 'Outros',
    image_url text,
    alt_text text,
    tag text,
    active boolean not null default true,
    sort_order integer not null default 0,
    created_at timestamptz not null default now()
);

alter table public.products add column if not exists category text not null default 'Outros';
alter table public.products add column if not exists image_url text;
alter table public.products add column if not exists alt_text text;
alter table public.products add column if not exists tag text;
alter table public.products add column if not exists active boolean not null default true;
alter table public.products add column if not exists sort_order integer not null default 0;
alter table public.products add column if not exists created_at timestamptz not null default now();

create table if not exists public.inventory_variants (
    id uuid primary key default gen_random_uuid(),
    product_id text not null references public.products(id),
    size text not null,
    color text not null,
    sku text,
    quantity integer not null default 0 check (quantity >= 0),
    updated_at timestamptz not null default now(),
    unique (product_id, size, color)
);

create unique index if not exists inventory_variants_sku_unique
    on public.inventory_variants (sku)
    where sku is not null and sku <> '';

create table if not exists public.user_roles (
    user_id uuid primary key references auth.users(id) on delete cascade,
    role text not null check (role in ('admin'))
);

create table if not exists public.orders (
    id uuid primary key default gen_random_uuid(),
    status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
    created_at timestamptz not null default now(),
    confirmed_at timestamptz
);

create table if not exists public.order_items (
    id bigint generated always as identity primary key,
    order_id uuid not null references public.orders(id) on delete cascade,
    variant_id uuid references public.inventory_variants(id) on delete set null,
    product_name text not null,
    variant_label text not null,
    quantity integer not null check (quantity > 0),
    unit_price_cents integer not null check (unit_price_cents >= 0)
);

insert into public.products (id, name, price_cents) values
    ('blusa-linho', 'Blusa leve de linho', 11990),
    ('vestido-midi', 'Vestido midi fluido', 18990),
    ('conjunto-alfaiataria', 'Conjunto de alfaiataria', 24990),
    ('calca-reta', 'Calça reta essencial', 15990),
    ('blusa-tricot', 'Blusa de tricô macio', 13990),
    ('vestido-casual', 'Vestido casual estampado', 17990),
    ('conjunto-casual', 'Conjunto casual comfy', 21990),
    ('calca-pantalona', 'Calça pantalona fluida', 16990)
on conflict (id) do update
set name = excluded.name,
    price_cents = excluded.price_cents;

insert into public.inventory_variants (product_id, size, color, sku, quantity) values
    ('blusa-linho', 'P', 'Branco', 'BL-LINHO-P-BR', 8),
    ('blusa-linho', 'M', 'Branco', 'BL-LINHO-M-BR', 10),
    ('blusa-linho', 'G', 'Areia', 'BL-LINHO-G-AR', 6),
    ('vestido-midi', 'P', 'Preto', 'VD-MIDI-P-PT', 5),
    ('vestido-midi', 'M', 'Preto', 'VD-MIDI-M-PT', 7),
    ('vestido-midi', 'G', 'Azul', 'VD-MIDI-G-AZ', 4),
    ('conjunto-alfaiataria', 'P', 'Bege', 'CJ-ALF-P-BE', 4),
    ('conjunto-alfaiataria', 'M', 'Bege', 'CJ-ALF-M-BE', 6),
    ('conjunto-alfaiataria', 'G', 'Preto', 'CJ-ALF-G-PT', 5),
    ('calca-reta', '38', 'Jeans', 'CL-RETA-38-JE', 7),
    ('calca-reta', '40', 'Jeans', 'CL-RETA-40-JE', 9),
    ('calca-reta', '42', 'Preto', 'CL-RETA-42-PT', 6),
    ('blusa-tricot', 'P', 'Nude', 'BT-TRICOT-P-NU', 8),
    ('blusa-tricot', 'M', 'Nude', 'BT-TRICOT-M-NU', 10),
    ('blusa-tricot', 'G', 'Cinza', 'BT-TRICOT-G-CI', 7),
    ('vestido-casual', 'P', 'Estampado', 'VD-CASUAL-P-ES', 6),
    ('vestido-casual', 'M', 'Estampado', 'VD-CASUAL-M-ES', 8),
    ('vestido-casual', 'G', 'Estampado', 'VD-CASUAL-G-ES', 5),
    ('conjunto-casual', 'P', 'Verde', 'CJ-CASUAL-P-VE', 5),
    ('conjunto-casual', 'M', 'Verde', 'CJ-CASUAL-M-VE', 7),
    ('conjunto-casual', 'G', 'Creme', 'CJ-CASUAL-G-CR', 6),
    ('calca-pantalona', 'P', 'Preto', 'CL-PANT-P-PT', 6),
    ('calca-pantalona', 'M', 'Preto', 'CL-PANT-M-PT', 8),
    ('calca-pantalona', 'G', 'Terracota', 'CL-PANT-G-TE', 5)
on conflict (product_id, size, color) do nothing;

create or replace function public.is_inventory_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
    select exists (
        select 1
        from public.user_roles
        where user_id = auth.uid()
          and role = 'admin'
    );
$$;

create or replace function public.create_order(p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_order_id uuid;
    v_item jsonb;
    v_variant public.inventory_variants%rowtype;
    v_product public.products%rowtype;
    v_quantity integer;
begin
    if jsonb_typeof(p_items) <> 'array'
       or jsonb_array_length(p_items) = 0
       or jsonb_array_length(p_items) > 50 then
        raise exception 'O pedido deve conter entre 1 e 50 itens.';
    end if;

    if exists (
        select 1
        from jsonb_array_elements(p_items) with ordinality
        where jsonb_typeof(value) <> 'object'
           or (value->>'variant_id') is null
           or (value->>'quantity') is null
    ) then
        raise exception 'Formato inválido no pedido.';
    end if;

    if (
        select count(*) <> count(distinct value->>'variant_id')
        from jsonb_array_elements(p_items)
    ) then
        raise exception 'Agrupe a quantidade de cada variação em um único item.';
    end if;

    insert into public.orders default values returning id into v_order_id;

    for v_item in select value from jsonb_array_elements(p_items)
    loop
        if (v_item->>'quantity') !~ '^[1-9][0-9]*$' then
            raise exception 'Quantidade inválida no pedido.';
        end if;

        v_quantity := (v_item->>'quantity')::integer;
        if v_quantity > 100 then
            raise exception 'A quantidade por variação excede o limite permitido.';
        end if;

        select * into v_variant
        from public.inventory_variants
        where id = (v_item->>'variant_id')::uuid
        for update;

        if not found or v_variant.quantity < v_quantity then
            raise exception 'Estoque insuficiente para uma das variações.';
        end if;

        select * into v_product
        from public.products
        where id = v_variant.product_id;

        insert into public.order_items (
            order_id, variant_id, product_name, variant_label, quantity, unit_price_cents
        ) values (
            v_order_id,
            v_variant.id,
            v_product.name,
            concat(v_variant.color, ' · ', v_variant.size),
            v_quantity,
            v_product.price_cents
        );

        update public.inventory_variants
        set quantity = quantity - v_quantity,
            updated_at = now()
        where id = v_variant.id;
    end loop;

    return v_order_id;
end;
$$;

create or replace function public.confirm_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_order_status text;
    v_item record;
begin
    if not public.is_inventory_admin() then
        raise exception 'Apenas a loja pode confirmar pedidos.';
    end if;

    select status into v_order_status
    from public.orders
    where id = p_order_id
    for update;

    if not found then
        raise exception 'Pedido não encontrado.';
    end if;

    if v_order_status <> 'pending' then
        raise exception 'Este pedido já foi confirmado.';
    end if;

    update public.orders
    set status = 'confirmed',
        confirmed_at = now()
    where id = p_order_id;
end;
$$;

create or replace function public.cancel_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
    v_order_status text;
    v_item record;
begin
    if not public.is_inventory_admin() then
        raise exception 'Apenas a loja pode cancelar pedidos.';
    end if;

    select status into v_order_status
    from public.orders
    where id = p_order_id
    for update;

    if not found or v_order_status <> 'pending' then
        raise exception 'Pedido pendente não encontrado.';
    end if;

    for v_item in
        select variant_id, sum(quantity)::integer as quantity
        from public.order_items
        where order_id = p_order_id
          and variant_id is not null
        group by variant_id
    loop
        update public.inventory_variants
        set quantity = quantity + v_item.quantity,
            updated_at = now()
        where id = v_item.variant_id;
    end loop;

    update public.orders
    set status = 'cancelled'
    where id = p_order_id;
end;
$$;

alter table public.products enable row level security;
alter table public.inventory_variants enable row level security;
alter table public.user_roles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "products are readable by everyone" on public.products;
create policy "products are readable by everyone"
    on public.products for select to anon, authenticated using (true);

drop policy if exists "inventory is readable by everyone" on public.inventory_variants;
create policy "public can read inventory variants"
    on public.inventory_variants for select to anon using (true);

drop policy if exists "admins read inventory" on public.inventory_variants;
create policy "admins read inventory"
    on public.inventory_variants for select to authenticated
    using (public.is_inventory_admin());

drop policy if exists "admins manage products" on public.products;
create policy "admins manage products"
    on public.products for all to authenticated
    using (public.is_inventory_admin())
    with check (public.is_inventory_admin());

drop policy if exists "admins manage inventory" on public.inventory_variants;
create policy "admins manage inventory"
    on public.inventory_variants for all to authenticated
    using (public.is_inventory_admin())
    with check (public.is_inventory_admin());

drop policy if exists "admins read orders" on public.orders;
create policy "admins read orders"
    on public.orders for select to authenticated using (public.is_inventory_admin());

drop policy if exists "admins read order items" on public.order_items;
create policy "admins read order items"
    on public.order_items for select to authenticated using (public.is_inventory_admin());

revoke select on public.inventory_variants from anon;
grant select (id, product_id, size, color, quantity) on public.inventory_variants to anon;
grant select on public.inventory_variants to authenticated;
grant select on public.orders, public.order_items to authenticated;
grant insert, update, delete on public.products, public.inventory_variants to authenticated;
grant usage, select on sequence public.order_items_id_seq to authenticated;

revoke all on function public.is_inventory_admin() from public;
grant execute on function public.is_inventory_admin() to authenticated;
revoke all on function public.create_order(jsonb) from public;
grant execute on function public.create_order(jsonb) to anon, authenticated;
revoke all on function public.confirm_order(uuid) from public;
grant execute on function public.confirm_order(uuid) to authenticated;
revoke all on function public.cancel_order(uuid) from public;
grant execute on function public.cancel_order(uuid) to authenticated;
