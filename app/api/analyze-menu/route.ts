import { analyzeMenuItems, detectAllergens } from '@/utils/huggingface';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();
    
    if (!text) {
      return NextResponse.json({ error: 'Menu text is required' }, { status: 400 });
    }
    
    // Analyze the menu text
    const analysis = await analyzeMenuItems(text);
    
    // Detect allergens
    const allergens = await detectAllergens(text);
    
    return NextResponse.json({ 
      analysis,
      allergens,
    });
  } catch (error) {
    console.error('Error in menu analysis API:', error);
    return NextResponse.json({ error: 'Failed to analyze menu' }, { status: 500 });
  }
}
