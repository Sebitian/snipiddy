import { HfInference } from '@huggingface/inference';

// Initialize the Hugging Face inference client
const hf = new HfInference(process.env.HUGGING_FACE_API_KEY);

// Function to analyze text (e.g., menu items)
export async function analyzeMenuItems(text: string) {
  try {
    // Text classification to detect allergens and dietary info
    const classification = await hf.textClassification({
      model: 'distilbert-base-uncased-finetuned-sst-2-english', // Replace with your preferred model
      inputs: text,
    });
    
    return classification;
  } catch (error) {
    console.error('Error analyzing menu items:', error);
    throw error;
  }
}

// Function to analyze an image (e.g., a photo of a menu)
export async function analyzeMenuImage(imageData: Blob | ArrayBuffer) {
  try {
    // OCR to extract text from menu image
    const textFromImage = await hf.documentQuestionAnswering({
      model: 'facebook/dit-base', // Replace with appropriate OCR model
      inputs: {
        question: "What items are on this menu?",
        image: imageData,
      },
    });
    
    return textFromImage;
  } catch (error) {
    console.error('Error analyzing menu image:', error);
    throw error;
  }
}

// Function to detect allergens from text
export async function detectAllergens(text: string) {
  try {
    // Named entity recognition to detect allergens
    const entities = await hf.tokenClassification({
      model: 'dbmdz/bert-large-cased-finetuned-conll03-english', // Replace with allergen-specific model if available
      inputs: text,
    });
    
    // Filter for allergen entities (this would depend on your specific model)
    const allergens = entities.filter(entity => 
      entity.entity_group && ['FOOD', 'INGREDIENT', 'ALLERGEN'].includes(entity.entity_group)
    );
    
    return allergens;
  } catch (error) {
    console.error('Error detecting allergens:', error);
    throw error;
  }
}
