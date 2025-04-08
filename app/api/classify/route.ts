import { classifyImage } from "@/app/api/classify/classifier";
import { NextResponse, NextRequest } from "next/server";
import { supabaseService } from '@/lib/supabase-service';

// Set the runtime to edge for best performance
export const runtime = "edge";

// Add a listener to POST requests
export async function POST(request: NextRequest) {
  try {
    // Read our file from request data
    const data = await request.formData();
    const file: File | null = data.get("file") as unknown as File;

    if (!file) {
      return NextResponse.json(
        { error: "File not present in body" },
        { status: 400, statusText: "Bad Request" }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: "Uploaded file is not an image" },
        { status: 400, statusText: "Bad Request" }
      );
    }

    // Call our classify function
    const response = await classifyImage(file);
    console.log("Classification complete, returning response");
    
    // Simple validation
    if (!response || typeof response !== 'object') {
      throw new Error("Invalid response format from classifier");
    }

    // If we have menu items, associate allergens (added this section)
    // if (response.menu_items?.length > 0) {
    //   try {
    //     // Get the most recent scan ID (you might need to adjust this)
    //     const { data: recentScan } = await supabaseService.getMostRecentScan();
    //     if (recentScan?.id) {
    //       await supabaseService.associateIngredientsWithAllergensForScan(recentScan.id);
    //       console.log("Allergens associated successfully");
    //     }
    //   } catch (associationError) {
    //     console.error("Allergen association failed:", associationError);
    //     // Don't fail the whole request, just log the error
    //   }
    // }
    
    // Return the full response object
    return NextResponse.json(response);
  } catch (error) {
    // Get detailed error message
    const errorMessage = error instanceof Error 
      ? error.message 
      : "An unknown error occurred";
      
    console.error(`Error in classify API: ${errorMessage}`);
    
    return NextResponse.json(
      { error: `Failed to classify image: ${errorMessage}` }, 
      { status: 500 }
    );
  }
} 