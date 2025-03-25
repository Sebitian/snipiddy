import { classifyImage } from "@/lib/classifier";
import { NextResponse, NextRequest } from "next/server";

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