-- DIGITAL HEROES SUPABASE SCHEMA
-- Run this completely in the Supabase SQL Editor

-- 1. Create Profiles Table (Extends Auth Users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  shipping_address JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Trigger to automatically create a profile when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. Create Products Table
CREATE TABLE public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  base_price NUMERIC NOT NULL,
  icon TEXT,
  color TEXT,
  tag TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Default Products (The 6 Print Divisions)
INSERT INTO public.products (id, name, description, base_price, icon, color, tag) VALUES
('labels-stickers', 'Labels & Stickers', 'Custom die-cut labels, product stickers, and branded decals in any shape or size.', 0.12, '🏷️', '#C45D3E', 'Most Popular'),
('race-numbers', 'Race & Event Numbers', 'Durable bib numbers and event tags with variable data printing for races and competitions.', 1.50, '🏁', '#4A8C6F', 'Variable Data'),
('mtb-boards', 'MTB Boards', 'Custom mountain bike frame boards and number plates, precision-cut and weather-resistant.', 18.00, '🚵', '#4A7A8C', 'Precision Cut'),
('stamps', 'Stamps', 'Professional rubber and self-inking stamps for business, craft, and official use.', 12.00, '📮', '#D4A03C', 'Quick Turnaround'),
('trophies', 'Trophies', 'Laser-engraved trophies, plaques, and awards in acrylic, wood, and metal.', 25.00, '🏆', '#8C5A4A', 'Premium'),
('laser-cut', 'Laser-Cut Work', 'Bespoke laser-cut items from acrylic, wood, and metal — signage, gifts, and components.', 15.00, '✂️', '#6B5B8C', 'Custom');

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view products" ON public.products FOR SELECT USING (true);


-- 3. Create Orders Table
CREATE TABLE public.orders (
  id TEXT PRIMARY KEY, -- e.g., 'DH-2024-001'
  customer_id UUID REFERENCES public.profiles(id) NOT NULL,
  subtotal NUMERIC NOT NULL,
  vat NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  shipping_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can view own orders" ON public.orders FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Customers can insert own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Admins can view all orders" ON public.orders FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update orders" ON public.orders FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);


-- 4. Create Jobs (Order Items mapping to Pipeline)
CREATE TABLE public.jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES public.products(id),
  size TEXT,
  material TEXT,
  qty INTEGER,
  price NUMERIC,
  status TEXT DEFAULT 'quote' CHECK (status IN ('quote', 'order', 'artwork', 'proof', 'production', 'completed')),
  files_ready BOOLEAN DEFAULT false,
  artwork_json JSONB, -- For the saved web-to-print designs
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can view own jobs via orders" ON public.jobs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders WHERE public.orders.id = public.jobs.order_id AND public.orders.customer_id = auth.uid())
);
CREATE POLICY "Customers can insert own jobs" ON public.jobs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.orders WHERE public.orders.id = public.jobs.order_id AND public.orders.customer_id = auth.uid())
);
CREATE POLICY "Admins can view all jobs" ON public.jobs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update all jobs" ON public.jobs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);


-- 5. Create Proofs Table
CREATE TABLE public.proofs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.proofs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers can view own proofs" ON public.proofs FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.jobs 
    JOIN public.orders ON public.jobs.order_id = public.orders.id 
    WHERE public.proofs.job_id = public.jobs.id AND public.orders.customer_id = auth.uid()
  )
);
CREATE POLICY "Customers can update own proofs" ON public.proofs FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.jobs 
    JOIN public.orders ON public.jobs.order_id = public.orders.id 
    WHERE public.proofs.job_id = public.jobs.id AND public.orders.customer_id = auth.uid()
  )
);
CREATE POLICY "Admins can manage all proofs" ON public.proofs FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
