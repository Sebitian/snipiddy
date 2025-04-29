// At the top of the file, keep the ES module imports
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Supabase environment variables are not defined");
}

const supabase = createClient(supabaseUrl || "", supabaseKey || "");

// Interface definitions
export interface MenuItem {
  id?: string;
  menu_scan_id?: string;
  dish_name: string;
  description: string | null;
  ingredients: string[] | null;
  allergens: string[] | null;
  price: number | null;
  category?: string | null;
  dietary_tags?: string[] | null;
  created_at?: string;
  updated_at?: string;
}

export interface MenuScan {
  id?: string;
  raw_text: string;
  created_at?: string;
  user_id?: string;
  name?: string;
  item_count?: number;
}

export interface MenuData {
  menu_items: MenuItem[];
  raw_text: string;
  restaurant_name?: string | null; // This is used for display but not stored in menu_scans
  menu_type?: string | null; // This is used for display but not stored in menu_scans
  cuisine_type?: string | null;
  scan_date?: string;
  error?: string; // For error handling
  id?: string; // For storing the returned ID
}

export interface SearchOptions {
  fuzzy?: boolean;
  allergens?: string[];
  maxPrice?: number;
  dietaryPreferences?: string[];
  categories?: string[];
  restaurantName?: string;
  menuType?: string;
}

export interface IngredientSearchOptions {
  matchAll?: boolean;
  excludeAllergens?: string[];
  maxPrice?: number;
}

interface AllergenReference {
  id?: string;
  food_product: string;
  main_ingredient: string;
  sweetener: string;
  fat_oil: string;
  seasoning: string;
  allergens: string;
  prediction: string;
  created_at?: string;
}

// Add this interface after the other interface definitions
export interface AllergenAnalysis {
  profile_id: string;
  full_name: string;
  allergen: string;
  occurrence_count: number;
}

class SupabaseService {
  // Add this helper function to safely prepare data for insertion
  private prepareMenuScanData(data: Partial<MenuScan>): Record<string, any> {
    // Only include fields that we know exist in the database schema
    return {
      raw_text: data.raw_text || "",
      created_at: data.created_at || new Date().toISOString()
    };
  }

  // Store a complete menu scan with items
  async storeMenuData(
    data: MenuData,
    userId: string,
    useAutoNaming: boolean = false  // When true, triggers the auto-naming functionality in the database
  ): Promise<{ success: boolean; menuScanId?: string; error?: string }> {
    try {
      console.log("Storing menu data with items: ", data.menu_items.length);

      if (!data.menu_items || data.menu_items.length === 0) {
        return { success: false, error: "No menu items to store" };
      }
      
      // Create a safe object with only fields that exist in the database
      const scanDate = new Date(data.scan_date || new Date().toISOString());
      
      // Create base menu scan data
      const menuScanData: any = {
        ...this.prepareMenuScanData({ raw_text: data.raw_text || "" }),
        user_id: userId,
      };
      
      // If useAutoNaming is true, don't set a name - trigger will handle it
      // Otherwise use the standard date-based naming
      if (!useAutoNaming) {
      const formattedDate = scanDate.toLocaleDateString('en-US', { 
        month: 'long',
        day: 'numeric',
        year: 'numeric'
        });
        menuScanData.name = formattedDate;
      }

      // Store the menu scan
      const { data: menuScan, error: menuError } = await supabase
        .from("menu_scans")
        .insert([menuScanData])
        .select("id, name")
        .single();

      if (menuError) {
        console.error("Error storing menu scan:", menuError);
        // Attempt to provide more details about the error
        if (menuError.code === '42501') {
          return { success: false, error: "Permission denied - RLS policy might be blocking the insert" };
        } else if (menuError.code === '23505') {
          return { success: false, error: "Unique constraint violation" };
        }
        return { success: false, error: `${menuError.message} (Code: ${menuError.code})` };
      }

      const menuScanId = menuScan.id;
      console.log("Menu scan created with ID:", menuScanId, "Name:", menuScan.name);
      
      // Log whether auto-naming was used
      if (useAutoNaming) {
        console.log("Auto-naming feature used, generated name:", menuScan.name);
      }

      // Store menu items
      const menuItemsToInsert = data.menu_items.map((item) => ({
        menu_scan_id: menuScanId,
        dish_name: item.dish_name,
        description: item.description,
        ingredients: item.ingredients,
        allergens: item.allergens,
        price: item.price,
        created_at: new Date().toISOString(),
      }));

      const { error: itemsError } = await supabase
        .from("menu_items")
        .insert(menuItemsToInsert);

      if (itemsError) {
        console.error("Error storing menu items:", itemsError);
        return { success: false, error: itemsError.message };
      }

      return { success: true, menuScanId };
    } catch (error) {
      console.error("Error in storeMenuData:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  

  // GET all scans for a specific restaurant using raw SQL
  // READ
  async getRestaurantMenus(
    restaurantName: string
  ): Promise<{ scans?: MenuScan[]; error?: string; debug?: any }> {
    try {
      if (!restaurantName) {
        return { error: "Restaurant name is required" };
      }

      // Create a raw SQL query to search for restaurant menus
      const query = `
        SELECT 
          id,
          name,
          raw_text,
          created_at,
          user_id
        FROM menu_scans
        WHERE raw_text ILIKE '%${restaurantName}%'
        ORDER BY created_at DESC
      `;

      console.log("Executing SQL query for restaurant menus:", query);
      
      // Execute the raw SQL query
      const { data, error } = await supabase.rpc('execute_sql', {
        query: query
      });

      if (error) {
        console.error("Error executing SQL for restaurant menus:", error);
      return {
          error: `Error fetching restaurant menus: ${error.message}`,
          debug: { query, error }
        };
      }

      console.log(`Retrieved ${data?.length || 0} menus for restaurant: ${restaurantName}`);
      
      return { 
        scans: data as MenuScan[],
        debug: { query, result: data }
      };
    } catch (error) {
      console.error("Error in getRestaurantMenus:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error occurred",
        debug: { error }
      };
    }
  }

  // Get menu items for a specific scan using raw SQL
  async getMenuItems(
    scanId: string
  ): Promise<{ items?: MenuItem[]; error?: string; debug?: any }> {
    try {
      if (!scanId) {
        return { error: "Scan ID is required" };
      }

      // Create a raw SQL query to get menu items for the specified scan
      // Removing the category-based ordering since that column doesn't exist
      const query = `
        SELECT 
          id,
          menu_scan_id,
          dish_name,
          description,
          ingredients,
          allergens,
          price,
          created_at
        FROM menu_items
        WHERE menu_scan_id = '${scanId}'
        ORDER BY dish_name
      `;

      console.log("Executing SQL query for menu items:", query);
      
      // Execute the raw SQL query
      const { data, error } = await supabase.rpc('execute_sql', {
        query: query
      });

      if (error) {
        console.error("Error executing SQL for menu items:", error);
        return { 
          error: `Error fetching menu items: ${error.message}`,
          debug: { query, error }
        };
      }

      console.log(`Retrieved ${data?.length || 0} menu items for scan: ${scanId}`);
      
      return { 
        items: data as MenuItem[],
        debug: { query, result: data }
      };
    } catch (error) {
      console.error("Error in getMenuItems:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error occurred",
        debug: { error }
      };
    }
  }

  // Standard search for menu items
  async searchMenuItems(
    query: string,
    options: SearchOptions = {}
  ): Promise<{ items?: MenuItem[]; error?: string }> {
    try {
      // Build query
      let queryBuilder = supabase.from("menu_items").select(`
          *,
          menu_scans (
            id,
            raw_text,
            created_at
          )
        `);

      // Apply dish name search if provided
      if (query) {
        if (options.fuzzy) {
          // Use the Postgres similarity operator for fuzzy matching
          queryBuilder = queryBuilder.filter(
            "dish_name",
            "ilike",
            `%${query}%`
          );
        } else {
          queryBuilder = queryBuilder.ilike("dish_name", `%${query}%`);
        }
      }

      // Filter by allergens (exclude items with these allergens)
      if (options.allergens && options.allergens.length > 0) {
        // Use postgres array operators to check for overlap
        const allergensFilter = options.allergens.map((a) => a.toLowerCase());
        queryBuilder = queryBuilder.not(
          "allergens",
          "cs",
          `{${allergensFilter.join(",")}}`
        );
      }

      // Filter by max price
      if (options.maxPrice !== undefined) {
        queryBuilder = queryBuilder.lte("price", options.maxPrice);
      }

      // Filter by dietary preferences
      if (options.dietaryPreferences && options.dietaryPreferences.length > 0) {
        // Each dietary preference should be present in the dietary_tags array
        const dietaryPreferencesFilter = options.dietaryPreferences.map((p) =>
          p.toLowerCase()
        );
        queryBuilder = queryBuilder.contains(
          "dietary_tags",
          dietaryPreferencesFilter
        );
      }

      // Filter by categories
      if (options.categories && options.categories.length > 0) {
        queryBuilder = queryBuilder.in("category", options.categories);
      }

      // Filter by restaurant name (now uses raw_text search)
      if (options.restaurantName) {
        queryBuilder = queryBuilder.filter(
          "menu_scans.raw_text",
          "ilike",
          `%${options.restaurantName}%`
        );
      }

      // Menu type filter has been removed as it doesn't exist in the schema

      // Execute query
      const { data, error } = await queryBuilder;

      if (error) {
        return { error: `Error searching menu items: ${error.message}` };
      }

      // Process the results to flatten the joined table structure
      const processedItems = data.map((item: any) => {
        const { menu_scans, ...menuItem } = item;
        return {
          ...menuItem,
          // We no longer get these fields from menu_scans
          // Just provide the scan_id to allow looking up the associated scan
          scan_id: menu_scans?.id,
        };
      });

      return { items: processedItems as MenuItem[] };
    } catch (error) {
      console.error("Error in searchMenuItems:", error);
      return {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // Search specifically by ingredients
  async searchByIngredients(
    ingredients: string[],
    options: IngredientSearchOptions = {}
  ): Promise<{ items?: MenuItem[]; error?: string }> {
    try {
      // Normalize ingredients
      const normalizedIngredients = ingredients.map((ing) => ing.toLowerCase());

      // Build query
      let queryBuilder = supabase.from("menu_items").select("*");

      // Apply ingredient matching logic
      if (options.matchAll) {
        // Must contain ALL specified ingredients
        normalizedIngredients.forEach((ingredient) => {
          queryBuilder = queryBuilder.contains("ingredients", [ingredient]);
        });
      } else {
        // Must contain ANY of the specified ingredients
        // Use a filter with the @> operator (contains)
        const ingredientsFilter = normalizedIngredients.join("|");
        queryBuilder = queryBuilder.or(`ingredients.cs.{${ingredientsFilter}}`);
      }

      // Exclude allergens if specified
      if (options.excludeAllergens && options.excludeAllergens.length > 0) {
        const allergensFilter = options.excludeAllergens.map((a) =>
          a.toLowerCase()
        );
        queryBuilder = queryBuilder.not(
          "allergens",
          "cs",
          `{${allergensFilter.join(",")}}`
        );
      }

      // Apply max price filter
      if (options.maxPrice !== undefined) {
        queryBuilder = queryBuilder.lte("price", options.maxPrice);
      }

      // Execute query
      const { data, error } = await queryBuilder;

      if (error) {
        return { error: `Error searching by ingredients: ${error.message}` };
      }

      return { items: data as MenuItem[] };
    } catch (error) {
      console.error("Error in searchByIngredients:", error);
      return {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // Get available categories, dietary tags, allergens, etc. for filtering
  async getFilterOptions(): Promise<{
    categories?: string[];
    dietaryTags?: string[];
    allergens?: string[];
    error?: string;
  }> {
    try {
      // Get distinct categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("menu_items")
        .select("category")
        .not("category", "is", null)
        .order("category");

      if (categoriesError) {
        return {
          error: `Error fetching categories: ${categoriesError.message}`,
        };
      }

      // Extract unique categories
      const categories = Array.from(
        new Set(categoriesData.map((item: any) => item.category))
      );

      // For dietary tags and allergens, we need to use a different approach
      // since they're stored as arrays

      // Get all dietary tags
      const { data: tagsItems, error: tagsError } = await supabase
        .from("menu_items")
        .select("dietary_tags")
        .not("dietary_tags", "is", null);

      if (tagsError) {
        return { error: `Error fetching dietary tags: ${tagsError.message}` };
      }

      // Extract and flatten all dietary tags
      const allDietaryTags = tagsItems
        .flatMap((item: any) => item.dietary_tags || [])
        .filter(Boolean);
      const dietaryTags = Array.from(new Set(allDietaryTags));

      // Get all allergens
      const { data: allergenItems, error: allergensError } = await supabase
        .from("menu_items")
        .select("allergens")
        .not("allergens", "is", null);

      if (allergensError) {
        return { error: `Error fetching allergens: ${allergensError.message}` };
      }

      // Extract and flatten all allergens
      const allAllergens = allergenItems
        .flatMap((item: any) => item.allergens || [])
        .filter(Boolean);
      const allergens = Array.from(new Set(allAllergens));

      return {
        categories,
        dietaryTags,
        allergens,
      };
    } catch (error) {
      console.error("Error in getFilterOptions:", error);
      return {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

 
  // Get the most recent scan using raw SQL
  async getMostRecentScan(): Promise<{ data?: MenuScan; error?: string; debug?: any }> {
    try {
      // Create a raw SQL query to get the most recent scan
      const query = `
        SELECT *
        FROM menu_scans
        ORDER BY created_at DESC
        LIMIT 1
      `;

      console.log("Executing SQL query for most recent scan:", query);
      
      // Execute the raw SQL query
      const { data, error } = await supabase.rpc('execute_sql', {
        query: query
      });

      if (error) {
        console.error("Error executing SQL for most recent scan:", error);
        return {
          error: error.message,
          debug: { query, error }
        };
      }

      // The execute_sql function returns an array, but we want a single object
      // Check if we have results and take the first item
      if (!data || data.length === 0) {
      return {
          data: undefined,
          debug: { query, result: [] }
        };
      }

      // Return the first (and only) scan from the results
      return { 
        data: data[0] as MenuScan,
        debug: { query, result: data }
      };
    } catch (error) {
      console.error("Error in getMostRecentScan:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error",
        debug: { error }
      };
    }
  }

  async getUserMenuScans(
    userEmail: string, 
    limit = 5
  ): Promise<{ scans?: MenuScan[]; menuItems?: Record<string, MenuItem[]>; error?: string; debug?: any }> {
    try {
      // Create a raw SQL query to get user's scans
      const scansQuery = `
        SELECT *
        FROM menu_scans
        ORDER BY created_at DESC
        LIMIT ${limit}
      `;

      console.log("Executing SQL query for user menu scans:", scansQuery);
      
      // Execute the raw SQL query for scans
      const { data: scans, error: scansError } = await supabase.rpc('execute_sql', {
        query: scansQuery
      });

      if (scansError) {
        console.error("Error executing SQL for menu scans:", scansError);
      return {
          error: `Error fetching menu scans: ${scansError.message}`,
          debug: { query: scansQuery, error: scansError }
        };
      }

      // If no scans, return empty results
      if (!scans || scans.length === 0) {
      return {
          scans: [],
          debug: { query: scansQuery, result: scans }
        };
      }

      // Extract scan IDs for the items query
      const scanIds = scans.map((scan: MenuScan) => `'${scan.id}'`).join(',');
      
      const itemsQuery = `
        SELECT *
        FROM menu_items
        WHERE menu_scan_id IN (${scanIds})
      `;

      console.log("Executing SQL query for menu items:", itemsQuery);
      
      // Execute the raw SQL query for items
      const { data: items, error: itemsError } = await supabase.rpc('execute_sql', {
        query: itemsQuery
      });

      if (itemsError) {
        console.error("Error executing SQL for menu items:", itemsError);
        return { 
          error: `Error fetching menu items: ${itemsError.message}`,
          scans: scans as MenuScan[],
          debug: { 
            scansQuery, 
            scansResult: scans,
            itemsQuery,
            itemsError
          }
        };
      }

      // Group items by their scan ID
      const menuItems: Record<string, MenuItem[]> = {};
      items?.forEach((item: MenuItem) => {
        const scanId = item.menu_scan_id;
        if (scanId && !menuItems[scanId]) {
          menuItems[scanId] = [];
        }
        if (scanId) {
          menuItems[scanId].push(item);
        }
      });

      return {
        scans: scans as MenuScan[],
        menuItems,
        debug: {
          scansQuery,
          scansResult: scans,
          itemsQuery,
          itemsResult: items
        }
      };
    } catch (error) {
      console.error("Error in getUserMenuScans:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error occurred",
        debug: { error }
      };
    }
  }

  // Get user profile with allergen information using raw SQL
  async getUserProfile(
    userId: string
  ): Promise<{ profile?: any; error?: string; debug?: any }> {
    try {
      // First check if userId is valid
      if (!userId) {
        return { profile: null, error: "User ID is required" };
      }

      // Create raw SQL query to get user profile
      const query = `
        SELECT *
        FROM profiles
        WHERE user_id = '${userId}'
        LIMIT 1
      `;

      console.log("Executing SQL query for user profile:", query);
      
      // Execute the raw SQL query
      const { data, error } = await supabase.rpc('execute_sql', {
        query: query
      });

      if (error) {
        console.error("Error executing SQL for user profile:", error);
        return { 
          error: `Error fetching user profile: ${error.message}`,
          debug: { query, error }
        };
      }

      // If no profile found, return null instead of throwing an error
      if (!data || data.length === 0) {
      return {
        profile: null,
          debug: { query, result: data }
        };
      }

      // Since we're using LIMIT 1, take the first result
      return {
        profile: data[0],
        debug: { query, result: data }
      };
    } catch (error) {
      console.error("Error in getUserProfile:", error);
      return {
        profile: null,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        debug: { error }
      };
    }
  }

  // Get user's menu scans with item counts
  async getUserScansWithItemCounts(userId: string): Promise<{ data?: any[]; error?: any; query?: string }> {
    try {
      if (!userId) {
        return { error: "User ID is required" };
      }

      const query = `
        SELECT 
          ms.id,
          ms.name,
          ms.created_at,
          ms.user_id,
          ms.raw_text,
          COUNT(mi.id) as item_count
        FROM menu_scans ms
        LEFT JOIN menu_items mi ON mi.menu_scan_id = ms.id
        WHERE ms.user_id = '${userId}'
        GROUP BY ms.id, ms.name, ms.created_at, ms.user_id, ms.raw_text
        ORDER BY ms.created_at DESC
      `;

      console.log("Executing SQL query:", query);
      
      // Using the execute_sql function we created in Supabase
      const { data, error } = await supabase.rpc('execute_sql', {
        query: query
      });

      return { data, error, query };
    } catch (error) {
      console.error("Error in getUserScansWithItemCounts:", error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Get a specific menu scan with its items using raw SQL
  async getMenuScan(
    scanId: string
  ): Promise<{ menuScan?: MenuScan; menuItems?: MenuItem[]; error?: string; debug?: any }> {
    try {
      if (!scanId) {
        return { error: "Scan ID is required" };
      }

      // Create a raw SQL query to get the menu scan
      const scanQuery = `
        SELECT *
        FROM menu_scans
        WHERE id = '${scanId}'
        LIMIT 1
      `;

      console.log("Executing SQL query for menu scan:", scanQuery);
      
      // Execute the raw SQL query for the scan
      const { data: scanData, error: scanError } = await supabase.rpc('execute_sql', {
        query: scanQuery
      });

      if (scanError) {
        console.error("Error executing SQL for menu scan:", scanError);
        return { 
          error: `Error fetching menu scan: ${scanError.message}`,
          debug: { scanQuery, scanError }
        };
      }

      if (!scanData || scanData.length === 0) {
        return { 
          error: "Scan not found",
          debug: { scanQuery, scanResult: scanData }
        };
      }

      const menuScan = scanData[0] as MenuScan;

      // Create a raw SQL query to get the menu items (removed updated_at)
      const itemsQuery = `
        SELECT 
          id,
          menu_scan_id,
          dish_name,
          description,
          ingredients,
          allergens,
          price,
          created_at
        FROM menu_items
        WHERE menu_scan_id = '${scanId}'
        ORDER BY dish_name
      `;

      console.log("Executing SQL query for menu items:", itemsQuery);
      
      // Execute the raw SQL query for the items
      const { data: itemsData, error: itemsError } = await supabase.rpc('execute_sql', {
        query: itemsQuery
      });

      if (itemsError) {
        console.error("Error executing SQL for menu items:", itemsError);
        // Return scan data even if items failed, with error message
        return { 
          menuScan, 
          error: `Error fetching menu items: ${itemsError.message}`,
          debug: { scanQuery, scanResult: scanData, itemsQuery, itemsError }
        };
      }

      console.log(`Retrieved scan and ${itemsData?.length || 0} menu items`);
      
      return { 
        menuScan,
        menuItems: itemsData as MenuItem[],
        debug: { scanQuery, scanResult: scanData, itemsQuery, itemsResult: itemsData }
      };
    } catch (error) {
      console.error("Error in getMenuScan:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error occurred",
        debug: { error }
      };
    }
  }

  // Search menu items using raw SQL
  async searchMenuItemsRawSQL(
    query: string,
    options: SearchOptions = {}
  ): Promise<{ items?: MenuItem[]; error?: string; debug?: any }> {
    try {
      // Build search condition
      let searchCondition = "";
      if (query) {
        searchCondition = `
          dish_name ILIKE '%${query}%' OR 
          description ILIKE '%${query}%' OR 
          EXISTS (
            SELECT 1 FROM unnest(ingredients) as ing 
            WHERE ing ILIKE '%${query}%'
          )
        `;
      } else {
        searchCondition = "TRUE";
      }

      // Create the SQL query
      const sqlQuery = `
        SELECT 
          mi.id,
          mi.menu_scan_id,
          mi.dish_name,
          mi.description,
          mi.ingredients,
          mi.allergens,
          mi.price,
          mi.created_at
        FROM menu_items mi
        WHERE ${searchCondition}
        ORDER BY mi.dish_name
      `;

      console.log("Executing SQL query for menu search:", sqlQuery);
      
      // Execute the raw SQL query
      const { data, error } = await supabase.rpc('execute_sql', {
        query: sqlQuery
      });

      if (error) {
        console.error("Error executing SQL for menu search:", error);
        return { 
          error: `Error searching menu items: ${error.message}`,
          debug: { query: sqlQuery, error }
        };
      }

      console.log(`Search found ${data?.length || 0} menu items`);
      
      return { 
        items: data as MenuItem[],
        debug: { query: sqlQuery, result: data }
      };
    } catch (error) {
      console.error("Error in searchMenuItemsRawSQL:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error occurred",
        debug: { error }
      };
    }
  }

}

// At the bottom, change the exports to this:
const supabaseService = new SupabaseService();
export { supabaseService };
export default supabaseService;
