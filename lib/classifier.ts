import { OpenAI } from "openai"
import { supabaseService, MenuData, MenuItem } from "@/lib/supabase-service";

// Check if API key exists
const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  console.error("OPENAI_API_KEY is not defined in environment variables")
}

// JSON repair function
function repairJson(jsonString: string): string {
  try {
    // Test if it's already valid
    JSON.parse(jsonString);
    return jsonString;
  } catch (error) {
    console.log("Repairing JSON...");
    let repairedJson = jsonString;
    
    // 1. Fix missing property value quotes
    repairedJson = repairedJson.replace(/:\s*"([^"]*)(?=\s*[,}])/g, ': "$1"');
    
    // 2. Fix missing quotes around property names
    repairedJson = repairedJson.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
    
    // 3. Replace single quotes with double quotes
    repairedJson = repairedJson.replace(/'/g, '"');
    
    // 4. Fix trailing commas in objects
    repairedJson = repairedJson.replace(/,\s*}/g, '}');
    
    // 5. Fix trailing commas in arrays
    repairedJson = repairedJson.replace(/,\s*\]/g, ']');
    
    // 6. Balance braces and brackets
    const openBraces = (repairedJson.match(/{/g) || []).length;
    const closeBraces = (repairedJson.match(/}/g) || []).length;
    if (openBraces > closeBraces) {
      repairedJson += '}'.repeat(openBraces - closeBraces);
    }
    
    const openBrackets = (repairedJson.match(/\[/g) || []).length;
    const closeBrackets = (repairedJson.match(/\]/g) || []).length;
    if (openBrackets > closeBrackets) {
      repairedJson += ']'.repeat(openBrackets - closeBrackets);
    }
    
    // 7. Try to find and fix unterminated strings
    repairedJson = repairedJson.replace(/:\s*"([^"]*?)(?=[,}\]])/g, ': "$1"');
    
    try {
      // Test if repairs worked
      JSON.parse(repairedJson);
      console.log("JSON repair successful");
      return repairedJson;
    } catch (error) {
      console.error("JSON repair failed:", error);
      
      // Last resort: try to extract just the menu_items array with regex
      try {
        const menuItemsMatch = repairedJson.match(/"menu_items"\s*:\s*(\[[\s\S]*?\])(?=\s*[,}]|$)/);
        if (menuItemsMatch && menuItemsMatch[1]) {
          // Try to parse just the array
          const menuItemsArray = menuItemsMatch[1];
          // Validate the array
          JSON.parse(menuItemsArray);
          // If successful, return a valid JSON object with the array
          return `{"menu_items": ${menuItemsArray}}`;
        }
      } catch (regexError) {
        console.error("Menu items extraction failed:", regexError);
      }
      
      // If all repair attempts fail, return a minimal valid JSON
      return '{"menu_items": []}';
    }
  }
}

const openAi = new OpenAI({ apiKey })

export const classifyImage = async (file: File) => {
  try {
    // encode our file as a base64 string so it can be sent in an HTTP request
    const encoded = await file.arrayBuffer().then((buffer) => Buffer.from(buffer).toString("base64"))

    // First perform OCR to extract text from image with more detailed prompt
    const ocrResponse = await openAi.chat.completions.create({
      model: "gpt-4o-mini", // Using mini to reduce token usage
      messages: [
        {
          role: "user", 
          content: [
            {
              type: "text",
              text: "Extract all text from this menu image. Return only the raw text, preserving the structure as much as possible. Include all dish names, prices, descriptions, and ingredients if visible.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${encoded}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1500, // Increasing max tokens for OCR
    })

    // Store extracted text locally
    const extractedText = ocrResponse.choices[0].message.content || ''
    console.log("Extracted menu text length:", extractedText.length)
    
    // Skip the structuring step if no text was extracted
    if (!extractedText || extractedText.trim().length < 10) {
      return {
        text: extractedText || "No text could be extracted from the image.",
        menu_items: [],
        error: "Not enough text extracted from image to process menu items."
      }
    }
    
    // Trim extremely long texts to prevent token issues
    const maxTextLength = 2000
    const trimmedText = extractedText.length > maxTextLength 
      ? extractedText.substring(0, maxTextLength) + "... (text truncated due to length)"
      : extractedText

    // Enhanced prompt for better structure and metadata extraction
    const menuPrompt = `
    You are a menu processing assistant. Analyze this menu text and extract information into this EXACT JSON format:
    {
      "restaurant_name": "Name if available, otherwise null",
      "menu_type": "Dinner/Lunch/Breakfast if identifiable, otherwise null",
      "cuisine_type": "Type of cuisine if identifiable, otherwise null",
      "menu_items": [
        {
          "dish_name": "Item Name",
          "description": "Full description of the dish",
          "ingredients": ["Ingredient1", "Ingredient2"],
          "allergens": ["Allergen1", "Allergen2"],
          "price": 12.99,
          "category": "Appetizer/Entree/Dessert/etc",
          "dietary_tags": ["Vegetarian", "Vegan", "Gluten-Free", "etc"] 
        }
      ]
    }
    
    Rules:
    - Return ONLY valid JSON with no additional text or formatting
    - Format must be valid JSON that can be parsed directly
    - Extract ingredients from descriptions if not explicitly listed
    - Identify common allergens (dairy, nuts, gluten, shellfish, etc.)
    - Format prices as numbers without currency symbols
    - Use null for unknown values
    - Limit to 25 menu items maximum, prioritizing clearer items
    - Extract any dietary information (vegan, gluten-free, etc.)
    - Categorize items if categories exist in the menu
    
    Menu text:
    ${trimmedText}
    `

    // Get structured data from GPT
    const structuredResponse = await openAi.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: menuPrompt
        }
      ],
      max_tokens: 3000,
      temperature: 0.2, // Lower temperature for more predictable output
    })

    // Parse the structured JSON response
    const structuredText = structuredResponse.choices[0].message.content || '{}'
    console.log("Structured text length:", structuredText.length)
    
    let structuredData: MenuData = { 
      menu_items: [], 
      raw_text: extractedText,
      restaurant_name: null,
      menu_type: null,
      cuisine_type: null,
      scan_date: new Date().toISOString()
    }
    
    try {
      // Attempt to parse the structured JSON 
      let sanitizedContent = structuredText
        .replace(/```json\s+/g, '')  // Remove markdown code fences if present
        .replace(/```\s*$/g, '')
        .trim()
      
      // If it's empty or clearly not JSON, return early
      if (!sanitizedContent || (!sanitizedContent.startsWith('{') && !sanitizedContent.startsWith('['))) {
        console.error("Invalid JSON format, not starting with { or [")
        return { 
          text: extractedText,
          menu_items: [],
          error: "Invalid JSON format returned from AI"
        }
      }
      
      // Apply JSON repair
      const repairedJson = repairJson(sanitizedContent);
      const parsedData = JSON.parse(repairedJson);
      
      // Extract all available data
      if (parsedData.menu_items && Array.isArray(parsedData.menu_items)) {
        structuredData.menu_items = parsedData.menu_items;
      }
      
      if (parsedData.restaurant_name) {
        structuredData.restaurant_name = parsedData.restaurant_name;
      }
      
      if (parsedData.menu_type) {
        structuredData.menu_type = parsedData.menu_type;
      }
      
      if (parsedData.cuisine_type) {
        structuredData.cuisine_type = parsedData.cuisine_type;
      }
      
    } catch (error) {
      console.error("Failed to parse structured data:", error)
      // Return raw text if structured parsing fails
      return { 
        text: extractedText,
        menu_items: [],
        error: "Failed to parse menu data: " + (error instanceof Error ? error.message : String(error))
      }
    }

    // Store in Supabase
    if (structuredData.menu_items.length > 0) {
      try {
        await supabaseService.storeMenuData(structuredData)
      } catch (dbError) {
        console.error("Database storage error:", dbError)
        // Continue without failing the whole process
      }
    }

    // Return both the raw text and structured data
    return {
      text: extractedText,
      menu_items: structuredData.menu_items,
      restaurant_name: structuredData.restaurant_name,
      menu_type: structuredData.menu_type,
      cuisine_type: structuredData.cuisine_type
    }
  } catch (error) {
    console.error("Error in classifyImage:", error)
    return {
      text: "Error processing image",
      menu_items: [],
      error: error instanceof Error ? error.message : String(error)
    }
  }
}

// Export search functions from the supabase service
export const { searchMenuItems, searchByIngredients, getRestaurantMenus, getMenuItems } = supabaseService;

