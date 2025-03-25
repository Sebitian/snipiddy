-- Create an extension for full-text search capabilities
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create menu_scans table
CREATE TABLE IF NOT EXISTS public.menu_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_text TEXT NOT NULL,
  restaurant_name TEXT,
  menu_type TEXT,
  cuisine_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create menu_items table with JSON-compatible arrays and proper indexing
CREATE TABLE IF NOT EXISTS public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_scan_id UUID NOT NULL REFERENCES public.menu_scans(id) ON DELETE CASCADE,
  dish_name TEXT NOT NULL,
  description TEXT,
  ingredients TEXT[] DEFAULT NULL,
  allergens TEXT[] DEFAULT NULL,
  price DECIMAL(10, 2),
  category TEXT,
  dietary_tags TEXT[] DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for improved search performance
CREATE INDEX IF NOT EXISTS menu_items_dish_name_idx ON public.menu_items USING GIN (dish_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS menu_items_description_idx ON public.menu_items USING GIN (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS menu_items_ingredients_idx ON public.menu_items USING GIN (ingredients);
CREATE INDEX IF NOT EXISTS menu_items_allergens_idx ON public.menu_items USING GIN (allergens);
CREATE INDEX IF NOT EXISTS menu_items_price_idx ON public.menu_items (price);
CREATE INDEX IF NOT EXISTS menu_items_category_idx ON public.menu_items (category);
CREATE INDEX IF NOT EXISTS menu_items_dietary_tags_idx ON public.menu_items USING GIN (dietary_tags);
CREATE INDEX IF NOT EXISTS menu_items_menu_scan_id_idx ON public.menu_items (menu_scan_id);

-- Create index on restaurant name for efficient filtering
CREATE INDEX IF NOT EXISTS menu_scans_restaurant_name_idx ON public.menu_scans USING GIN (restaurant_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS menu_scans_menu_type_idx ON public.menu_scans (menu_type);
CREATE INDEX IF NOT EXISTS menu_scans_cuisine_type_idx ON public.menu_scans (cuisine_type);

-- Enable row-level security (RLS)
ALTER TABLE public.menu_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for authenticated users
CREATE POLICY "Allow authenticated users to read menu_scans"
  ON public.menu_scans
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert menu_scans"
  ON public.menu_scans
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read menu_items"
  ON public.menu_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert menu_items"
  ON public.menu_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create functions to handle search
CREATE OR REPLACE FUNCTION search_menu_items_by_ingredients(
  p_ingredients TEXT[],
  p_match_all BOOLEAN DEFAULT false,
  p_exclude_allergens TEXT[] DEFAULT NULL,
  p_max_price DECIMAL DEFAULT NULL
)
RETURNS SETOF public.menu_items
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT mi.*
  FROM public.menu_items mi
  WHERE
    -- Ingredient matching logic
    CASE WHEN p_match_all THEN
      -- Must contain ALL specified ingredients
      (
        p_ingredients <@ mi.ingredients
      )
    ELSE
      -- Must contain ANY of the specified ingredients
      (
        mi.ingredients && p_ingredients
      )
    END
    -- Allergen exclusion
    AND (p_exclude_allergens IS NULL OR NOT (mi.allergens && p_exclude_allergens))
    -- Price filtering
    AND (p_max_price IS NULL OR mi.price <= p_max_price);
END;
$$;

-- Create function for advanced menu item search
CREATE OR REPLACE FUNCTION search_menu_items(
  p_query TEXT DEFAULT NULL,
  p_fuzzy BOOLEAN DEFAULT false,
  p_allergens TEXT[] DEFAULT NULL,
  p_max_price DECIMAL DEFAULT NULL,
  p_dietary_preferences TEXT[] DEFAULT NULL,
  p_categories TEXT[] DEFAULT NULL,
  p_restaurant_name TEXT DEFAULT NULL,
  p_menu_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  menu_scan_id UUID,
  dish_name TEXT,
  description TEXT,
  ingredients TEXT[],
  allergens TEXT[],
  price DECIMAL,
  category TEXT,
  dietary_tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  restaurant_name TEXT,
  menu_type TEXT,
  cuisine_type TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mi.id,
    mi.menu_scan_id,
    mi.dish_name,
    mi.description,
    mi.ingredients,
    mi.allergens,
    mi.price,
    mi.category,
    mi.dietary_tags,
    mi.created_at,
    mi.updated_at,
    ms.restaurant_name,
    ms.menu_type,
    ms.cuisine_type
  FROM 
    public.menu_items mi
  JOIN 
    public.menu_scans ms ON mi.menu_scan_id = ms.id
  WHERE
    -- Text search on dish name
    (p_query IS NULL OR 
      CASE WHEN p_fuzzy THEN 
        mi.dish_name % p_query 
      ELSE 
        mi.dish_name ILIKE '%' || p_query || '%'
      END
    )
    -- Allergen exclusion
    AND (p_allergens IS NULL OR NOT (mi.allergens && p_allergens))
    -- Max price filter
    AND (p_max_price IS NULL OR mi.price <= p_max_price)
    -- Dietary preferences
    AND (p_dietary_preferences IS NULL OR mi.dietary_tags && p_dietary_preferences)
    -- Categories filter
    AND (p_categories IS NULL OR mi.category = ANY(p_categories))
    -- Restaurant name
    AND (p_restaurant_name IS NULL OR ms.restaurant_name ILIKE '%' || p_restaurant_name || '%')
    -- Menu type
    AND (p_menu_type IS NULL OR ms.menu_type = p_menu_type);
END;
$$; 