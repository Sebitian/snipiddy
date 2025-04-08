'use client';

import { useState } from 'react';

export default function MenuAnalyzer() {
  const [menuText, setMenuText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    text?: string;
    menuItems?: Array<{
      dish_name: string;
      description: string;
      ingredients: string[];
      allergens: string[];
      price: number;
    }>;
    error?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeText = async () => {
    if (!menuText.trim()) {
      setError('Please enter menu text to analyze');
      return;
    }
    
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const response = await fetch('/api/analyze-menu', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: menuText }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze menu');
      }
      
      // The result now includes menuItems with allergen data
      setResult(data);
      
      // If you want to verify the scan was stored:
      console.log('Scan completed with items:', data.menuItems);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg border p-6">
      <h2 className="text-xl font-semibold mb-4">Menu Analyzer</h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="menu-text" className="block text-sm font-medium mb-1">
            Enter Menu Text
          </label>
          <textarea
            id="menu-text"
            className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            placeholder={`Paste menu items here...\nExample:\nChicken Curry - $12\nIngredients: chicken, coconut milk, peanuts\nDescription: Spicy curry with coconut`}
            rows={5}
            value={menuText}
            onChange={(e) => setMenuText(e.target.value)}
            disabled={loading}
          />
        </div>
        
        <button 
          onClick={analyzeText}
          disabled={!menuText.trim() || loading}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Analyzing...' : 'Analyze Menu Text'}
        </button>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mt-4" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        
        {loading && (
          <div className="flex justify-center items-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
            <p>Analyzing menu...</p>
          </div>
        )}
        
        {result && (
          <div className="mt-6 space-y-6">
            <h3 className="text-lg font-semibold">Analysis Results</h3>
            
            {/* Raw text preview */}
            {result.text && (
              <div className="border rounded-md p-4 bg-gray-50 dark:bg-gray-900">
                <h4 className="font-medium mb-2">Extracted Text</h4>
                <pre className="text-xs whitespace-pre-wrap">{result.text}</pre>
              </div>
            )}
            
            {/* Menu items with allergens */}
            {result.menuItems && result.menuItems.length > 0 && (
              <div>
                <h4 className="font-medium mb-2">Detected Menu Items</h4>
                <div className="space-y-4">
                  {result.menuItems.map((item, index) => (
                    <div key={index} className="border rounded-md p-4">
                      <div className="flex justify-between items-start">
                        <h5 className="font-medium">{item.dish_name}</h5>
                        {item.price && (
                          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-blue-900 dark:text-blue-300">
                            ${item.price.toFixed(2)}
                          </span>
                        )}
                      </div>
                      
                      {item.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {item.description}
                        </p>
                      )}
                      
                      <div className="mt-3 space-y-2">
                        <div className="text-sm">
                          <span className="font-medium">Ingredients:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.ingredients?.map((ingredient, i) => (
                              <span key={i} className="bg-gray-100 text-gray-800 text-xs px-2 py-0.5 rounded dark:bg-gray-700 dark:text-gray-300">
                                {ingredient}
                              </span>
                            ))}
                          </div>
                        </div>
                        
                        <div className="text-sm">
                          <span className="font-medium">Allergens:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {item.allergens?.length > 0 ? (
                              item.allergens.map((allergen, i) => (
                                <span key={i} className="bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded dark:bg-red-900 dark:text-red-300">
                                  {allergen}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-500 text-xs">None detected</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}