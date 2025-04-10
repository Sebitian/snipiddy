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
  restaurant_name?: string | null;
  menu_type?: string | null;
  cuisine_type?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface MenuData {
  menu_items: MenuItem[];
  raw_text: string;
  restaurant_name?: string | null;
  menu_type?: string | null;
  cuisine_type?: string | null;
  scan_date?: string;
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

class SupabaseService {
  // Store a complete menu scan with items
  async storeMenuData(
    data: MenuData,
    userId?: string
  ): Promise<{ success: boolean; menuScanId?: string; error?: string }> {
    try {
      console.log("Storing menu data with items: ", data.menu_items.length);

      if (!data.menu_items || data.menu_items.length === 0) {
        return { success: false, error: "No menu items to store" };
      }

      // Create simplified menu scan data - only use what's in your schema
      const menuScanData = {
        raw_text: data.raw_text || "",
        created_at: new Date().toISOString()
      };

      console.log("Inserting menu scan with data:", menuScanData);

      // Store the menu scan
      const { data: menuScan, error: menuError } = await supabase
        .from("menu_scans")
        .insert([menuScanData])
        .select("id")
        .single();

      if (menuError) {
        console.error("Error storing menu scan:", menuError);
        return { success: false, error: menuError.message };
      }

      const menuScanId = menuScan.id;
      console.log("Menu scan created with ID:", menuScanId);

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

  // Fetch a specific menu scan with its items
  async getMenuScan(
    scanId: string
  ): Promise<{ menuScan?: MenuScan; menuItems?: MenuItem[]; error?: string }> {
    try {
      // Get the menu scan
      const { data: scanData, error: scanError } = await supabase
        .from("menu_scans")
        .select("*")
        .eq("id", scanId)
        .single();

      if (scanError) {
        return { error: `Error fetching menu scan: ${scanError.message}` };
      }

      // Get the menu items
      const { data: itemsData, error: itemsError } = await supabase
        .from("menu_items")
        .select("*")
        .eq("menu_scan_id", scanId);

      if (itemsError) {
        return { error: `Error fetching menu items: ${itemsError.message}` };
      }

      return {
        menuScan: scanData as MenuScan,
        menuItems: itemsData as MenuItem[],
      };
    } catch (error) {
      console.error("Error in getMenuScan:", error);
      return {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // Get all scans for a specific restaurant
  async getRestaurantMenus(
    restaurantName: string
  ): Promise<{ scans?: MenuScan[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("menu_scans")
        .select("*")
        .ilike("restaurant_name", `%${restaurantName}%`)
        .order("created_at", { ascending: false });

      if (error) {
        return { error: `Error fetching restaurant menus: ${error.message}` };
      }

      return { scans: data as MenuScan[] };
    } catch (error) {
      console.error("Error in getRestaurantMenus:", error);
      return {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // Get menu items for a specific scan
  async getMenuItems(
    scanId: string
  ): Promise<{ items?: MenuItem[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("menu_items")
        .select("*")
        .eq("menu_scan_id", scanId);

      if (error) {
        return { error: `Error fetching menu items: ${error.message}` };
      }

      return { items: data as MenuItem[] };
    } catch (error) {
      console.error("Error in getMenuItems:", error);
      return {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
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
            restaurant_name,
            menu_type,
            cuisine_type
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

      // Filter by restaurant name
      if (options.restaurantName) {
        queryBuilder = queryBuilder.eq(
          "menu_scans.restaurant_name",
          options.restaurantName
        );
      }

      // Filter by menu type
      if (options.menuType) {
        queryBuilder = queryBuilder.eq(
          "menu_scans.menu_type",
          options.menuType
        );
      }

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
          restaurant_name: menu_scans?.restaurant_name,
          menu_type: menu_scans?.menu_type,
          cuisine_type: menu_scans?.cuisine_type,
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
    restaurantNames?: string[];
    menuTypes?: string[];
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

      // Get restaurant names
      const { data: restaurantsData, error: restaurantsError } = await supabase
        .from("menu_scans")
        .select("restaurant_name")
        .not("restaurant_name", "is", null)
        .order("restaurant_name");

      if (restaurantsError) {
        return {
          error: `Error fetching restaurant names: ${restaurantsError.message}`,
        };
      }

      const restaurantNames = Array.from(
        new Set(restaurantsData.map((item: any) => item.restaurant_name))
      );

      // Get menu types
      const { data: menuTypesData, error: menuTypesError } = await supabase
        .from("menu_scans")
        .select("menu_type")
        .not("menu_type", "is", null)
        .order("menu_type");

      if (menuTypesError) {
        return {
          error: `Error fetching menu types: ${menuTypesError.message}`,
        };
      }

      const menuTypes = Array.from(
        new Set(menuTypesData.map((item: any) => item.menu_type))
      );

      return {
        categories,
        dietaryTags,
        allergens,
        restaurantNames,
        menuTypes,
      };
    } catch (error) {
      console.error("Error in getFilterOptions:", error);
      return {
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // Delete a menu scan and all its items
  async deleteMenuScan(
    scanId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Due to the cascade delete relationship, deleting the scan will also delete all items
      const { error } = await supabase
        .from("menu_scans")
        .delete()
        .eq("id", scanId);

      if (error) {
        return {
          success: false,
          error: `Error deleting menu scan: ${error.message}`,
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Error in deleteMenuScan:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // Store allergens from CSV data into allergen_references table
  async storeAllergenReferences(
    csvData: any[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const allergenReferences = csvData.map((item) => ({
        food_product: item["Food Product"],
        main_ingredient: item["Main Ingredient"],
        sweetener: item["Sweetener"],
        fat_oil: item["Fat/Oil"],
        seasoning: item["Seasoning"],
        allergens: item["Allergens"],
        prediction: item["Prediction"],
        created_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("allergen_references")
        .insert(allergenReferences);

      if (error) {
        console.error("Error storing allergen references:", error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error("Error in storeAllergenReferences:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // GET ALL allergens from allergen references (or whichever table you use)
  async getAllAllergens(): Promise<{
    data?: AllergenReference[];
    error?: string;
  }> {
    try {
      const { data, error } = await supabase
        .from("allergens")
        .select("*")
        .order("food", { ascending: true });

      if (error) {
        return { error: error.message };
      }

      return { data };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unknown error ",
      };
    }
  }

  // Associate each ingredient in menu items of a scan with an allergen from the allergen_references
  // async associateIngredientsWithAllergensForScan(
  //   scanId: string
  // ): Promise<{ success: boolean; error?: string }> {
  //   try {
  //     // Retrieve all allergen references from supabase
  //     const { data: allergenReferences, error: allergenError } =
  //       await this.getAllAllergens();

  //     if (allergenError) {
  //       return { success: false, error: allergenError };
  //     }
  //     if (!allergenReferences || allergenReferences.length === 0) {
  //       return { success: false, error: "No allergen references found" };
  //     }

  //     // Retrieve all menu items for the given scan
  //     const { items, error: menuItemsError } = await this.getMenuItems(scanId);
  //     if (menuItemsError) {
  //       return { success: false, error: menuItemsError };
  //     }
  //     if (!items || items.length === 0) {
  //       return { success: false, error: "No menu items found for the scan" };
  //     }

  //     // Loop through each menu item to associate allergens based on exact ingredient matching
  //     for (const menuItem of items) {
  //       const matchedAllergens = new Set<string>();

  //       if (menuItem.ingredients && Array.isArray(menuItem.ingredients)) {
  //         for (const ingredient of menuItem.ingredients) {
  //           const ingredientNormalized = ingredient.trim().toLowerCase();

  //           // Check for exact matches in each allergen reference.
  //           for (const ref of allergenReferences) {
  //             // Exact match on food_product
  //             if (
  //               ref.food_product &&
  //               ingredientNormalized === ref.food_product.trim().toLowerCase()
  //             ) {
  //               if (ref.allergens) {
  //                 ref.allergens
  //                   .split(",")
  //                   .map(a => a.trim())
  //                   .forEach(allergen => {
  //                     if (allergen) matchedAllergens.add(allergen);
  //                   });
  //               }
  //             }
  //             // Exact match on main_ingredient (if desired)
  //             if (
  //               ref.main_ingredient &&
  //               ingredientNormalized === ref.main_ingredient.trim().toLowerCase()
  //             ) {
  //               if (ref.allergens) {
  //                 ref.allergens
  //                   .split(",")
  //                   .map(a => a.trim())
  //                   .forEach(allergen => {
  //                     if (allergen) matchedAllergens.add(allergen);
  //                   });
  //               }
  //             }
  //             // Additional exact matching for sweetener, fat_oil, seasoning, etc. can be added here
  //           }
  //         }
  //       }

  //       // Update the menu item with the collected allergens
  //       const newAllergens = Array.from(matchedAllergens);
  //       const { error: updateError } = await supabase
  //         .from("menu_items")
  //         .update({ allergens: newAllergens })
  //         .eq("id", menuItem.id);

  //       if (updateError) {
  //         return { success: false, error: updateError.message };
  //       }
  //     }

  //     return { success: true };
  //   } catch (error) {
  //     console.error("Error in associateIngredientsWithAllergensForScan:", error);
  //     return {
  //       success: false,
  //       error: error instanceof Error ? error.message : "Unknown error occurred",
  //     };
  //   }
  // }

  // Get the most recent scan
  async getMostRecentScan(): Promise<{ data?: MenuScan; error?: string }> {
    try {
      const { data, error } = await supabase
        .from("menu_scans")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return { data };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getUserMenuScans(
    userId: string,
    limit = 5
  ): Promise<{ scans?: MenuScan[]; menuItems?: Record<string, MenuItem[]>; error?: string }> {
    try {
      // Get all scans regardless of user
      const { data: scans, error: scansError } = await supabase
        .from("menu_scans")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (scansError) {
        console.error("Error fetching menu scans:", scansError);
        return { error: `Error fetching menu scans: ${scansError.message}` };
      }

      // If no scans, return empty results
      if (!scans || scans.length === 0) {
        return { scans: [] };
      }

      // Get menu items for each scan
      const scanIds = scans.map(scan => scan.id);
      const { data: items, error: itemsError } = await supabase
        .from("menu_items")
        .select("*")
        .in("menu_scan_id", scanIds);

      if (itemsError) {
        console.error("Error fetching menu items:", itemsError);
        return { error: `Error fetching menu items: ${itemsError.message}` };
      }

      // Group items by their scan ID
      const menuItems: Record<string, MenuItem[]> = {};
      items?.forEach(item => {
        if (!menuItems[item.menu_scan_id]) {
          menuItems[item.menu_scan_id] = [];
        }
        menuItems[item.menu_scan_id].push(item as MenuItem);
      });

      return {
        scans: scans as MenuScan[],
        menuItems
      };
    } catch (error) {
      console.error("Error in getUserMenuScans:", error);
      return {
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  // Get user profile with allergen information
  async getUserProfile(
    userId: string
  ): Promise<{ profile?: any; error?: string }> {
    try {
      // First check if userId is valid
      if (!userId) {
        return { profile: null, error: "User ID is required" };
      }

      // Check if the user has a profile
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle(); // Use maybeSingle instead of single to handle no results case

      if (error) {
        console.error("Error fetching user profile:", error);
        return { error: `Error fetching user profile: ${error.message}` };
      }

      // If no profile found, return null instead of throwing an error
      if (!data) {
        return { profile: null };
      }

      return { profile: data };
    } catch (error) {
      console.error("Error in getUserProfile:", error);
      return {
        profile: null,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}

// At the bottom, change the exports to this:
const supabaseService = new SupabaseService();
export { supabaseService };
export default supabaseService;
