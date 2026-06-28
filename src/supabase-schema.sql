-- =============================================================
--  Aura Element — Supabase Schema
--  Run in the Supabase SQL Editor (project > SQL Editor > New query)
-- =============================================================

-- 1. Products table ────────────────────────────────────────────

create table if not exists public.products (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  price               numeric(10, 2) not null,
  description         text,
  main_image_url      text,
  secondary_image_url text,
  concentration       numeric(5, 2) not null default 25,
  notes               jsonb,
  tagline             text,
  volume              text default '50ml',
  in_stock            boolean not null default true,
  created_at          timestamptz not null default now()
);

comment on column public.products.concentration is 'Fragrance oil concentration in %. Default 25 (Parfum grade).';
comment on column public.products.notes is 'JSON: { "top": [...], "heart": [...], "base": [...] }';

-- 2. Row-level security ─────────────────────────────────────────

alter table public.products enable row level security;

create policy "Products are publicly readable"
  on public.products
  for select
  using (true);

-- 3. Index for common queries ───────────────────────────────────

create index if not exists products_in_stock_idx on public.products (in_stock);
create index if not exists products_created_at_idx on public.products (created_at desc);

-- 4. Sample data ────────────────────────────────────────────────

insert into public.products
  (title, price, description, main_image_url, secondary_image_url, concentration, notes, tagline, volume)
values
  (
    'Velvet Oud',
    5200.00,
    'A bold encounter between Cambodian oud and silken amber. Rich, resinous, unapologetically opulent.',
    'https://images.unsplash.com/photo-1588405748880-12d1d2a59f75?w=800&h=1000&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1759793499903-bfdba8350627?w=800&h=1000&fit=crop&auto=format',
    25,
    '{"top":["Saffron","Bergamot"],"heart":["Rose Absolute","Cambodian Oud"],"base":["Amber","Sandalwood","Musk"]}',
    'Boldness Crystallised',
    '50ml'
  ),
  (
    'Blanc de Soie',
    4600.00,
    'Translucent, weightless, and impossibly soft. Like morning light through white linen.',
    'https://images.unsplash.com/photo-1585218356022-6a53145f56f6?w=800&h=1000&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1759793500112-c588839cfc6e?w=800&h=1000&fit=crop&auto=format',
    25,
    '{"top":["White Tea","Aldehydes"],"heart":["Iris","Jasmine Sambac"],"base":["White Musk","Cedarwood","Vanilla"]}',
    'Whispered Luxury',
    '50ml'
  ),
  (
    'Amber Nocturne',
    4800.00,
    'When dusk becomes night. A warm, golden trail between incense smoke, labdanum, and skin warmth.',
    'https://images.unsplash.com/photo-1608721279136-cd41b752fa41?w=800&h=1000&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1656746678868-579bf6d7868d?w=800&h=1000&fit=crop&auto=format',
    25,
    '{"top":["Cinnamon","Pink Pepper"],"heart":["Labdanum","Rose"],"base":["Amber","Benzoin","Vetiver"]}',
    'The Warmth of Night',
    '50ml'
  ),
  (
    'Rose Élixir',
    5500.00,
    'One thousand petals, one singular emotion. Turkish rose absolute against the sheerest musk.',
    'https://images.unsplash.com/photo-1680607622631-1e243ddd6782?w=800&h=1000&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1779562909409-defc901cf57e?w=800&h=1000&fit=crop&auto=format',
    25,
    '{"top":["Lychee","Raspberry"],"heart":["Turkish Rose","Peony"],"base":["Musk","Patchouli","Amber"]}',
    'A Thousand Petals',
    '50ml'
  ),
  (
    'Cedar Ritual',
    4200.00,
    'Raw earth, warm wood, the meditative stillness of a cedar forest at dawn.',
    'https://images.unsplash.com/photo-1759793500315-e64644e6954c?w=800&h=1000&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1759793499938-904b23d7ddae?w=800&h=1000&fit=crop&auto=format',
    25,
    '{"top":["Grapefruit","Cardamom"],"heart":["Atlas Cedar","Vetiver"],"base":["Oakmoss","Leather","Tonka Bean"]}',
    'Rooted, Always',
    '50ml'
  ),
  (
    'Midnight Iris',
    4900.00,
    'The iris at its most radical — powdery, cool, violet. An intellectual fragrance for those who speak through presence.',
    'https://images.unsplash.com/photo-1638295916768-459f6cf440bc?w=800&h=1000&fit=crop&auto=format',
    'https://images.unsplash.com/photo-1541108564883-bec8126021f5?w=800&h=1000&fit=crop&auto=format',
    25,
    '{"top":["Violet Leaf","Clary Sage"],"heart":["Iris Root","Cashmere Wood"],"base":["Orris Butter","Grey Musk","Amber"]}',
    'Powdered Silence',
    '50ml'
  );
