import { searchMenuItems, searchByIngredients } from "@/lib/classifier";
import { NextResponse, NextRequest } from "next/server";

// Set the runtime to edge for best performance
export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    // Get search parameters from request body
    const searchParams = await request.json();
    
    // Determine which search method to use based on the request
    const { searchType, ...params } = searchParams;
    
    let results;
    
    if (searchType === 'ingredients') {
      // Extract parameters for ingredient search
      const { 
        ingredients, 
        matchAll = false, 
        excludeAllergens = [], 
        maxPrice = null 
      } = params;
      
      if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
        return NextResponse.json(
          { error: "Ingredients array is required and must not be empty" },
          { status: 400 }
        );
      }
      
      // Use ingredients search function
      results = await searchByIngredients(ingredients, {
        matchAll,
        excludeAllergens: excludeAllergens.length > 0 ? excludeAllergens : undefined,
        maxPrice: maxPrice || undefined
      });
    } else {
      // Extract parameters for regular search
      const { 
        query = '', 
        fuzzy = false, 
        allergens = [], 
        maxPrice = null,
        dietaryPreferences = [],
        categories = [],
        restaurantName = null,
        menuType = null
      } = params;
      
      // Use regular search function
      results = await searchMenuItems(query, {
        fuzzy,
        allergens: allergens.length > 0 ? allergens : undefined,
        maxPrice: maxPrice || undefined,
        dietaryPreferences: dietaryPreferences.length > 0 ? dietaryPreferences : undefined,
        categories: categories.length > 0 ? categories : undefined,
        restaurantName: restaurantName || undefined,
        menuType: menuType || undefined
      });
    }
    
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Error in search API:", error);
    
    return NextResponse.json(
      { 
        error: "Failed to search menu items", 
        details: error instanceof Error ? error.message : String(error) 
      },
      { status: 500 }
    );
  }
} 