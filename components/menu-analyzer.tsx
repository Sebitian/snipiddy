'use client';

import { useState } from 'react';

export default function MenuAnalyzer() {
  const [menuText, setMenuText] = useState('');
  const [menuImage, setMenuImage] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Function to analyze menu text
  const analyzeText = async () => {
    if (!menuText.trim()) {
      setError('Please enter menu text to analyze');
      return;
    }
    
    setLoading(true);
    setError(null);
    
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
      
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Function to analyze menu image
  // const analyzeImage = async () => {
  //   if (!menuImage) {
  //     setError('Please upload a menu image to analyze');
  //     return;
  //   }
    
  //   setLoading(true);
  //   setError(null);
    
  //   try {
  //     const formData = new FormData();
  //     formData.append('image', menuImage);
      
  //     const response = await fetch('/api/analyze-menu-image', {
  //       method: 'POST',
  //       body: formData,
  //     });
      
  //     const data = await response.json();
      
  //     if (!response.ok) {
  //       throw new Error(data.error || 'Failed to analyze menu image');
  //     }
      
  //     setResult(data);
  //   } catch (err: any) {
  //     setError(err.message || 'Something went wrong');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

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
            placeholder="Paste menu items here..."
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
        
        {/* <div className="mt-6 mb-2">
          <p className="font-medium">Or upload a menu image</p>
        </div> */}
        
        {/* <div>
          <label htmlFor="menu-image" className="block text-sm font-medium mb-1">
            Upload Menu Image
          </label>
          <input
            id="menu-image"
            type="file"
            accept="image/*"
            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
            onChange={(e) => setMenuImage(e.target.files ? e.target.files[0] : null)}
            disabled={loading}
          />
        </div>
         */}
        {/* <button 
          // onClick={analyzeImage}
          disabled={!menuImage || loading}
          className="w-full px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Analyzing...' : 'Analyze Menu Image'}
        </button> */}
        
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
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Analysis Results</h3>
            
            {result.allergens && (
              <>
                <p className="font-medium mb-2">Potential Allergens Detected:</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {result.allergens.length > 0 ? (
                    result.allergens.map((allergen: any, index: number) => (
                      <span key={index} className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-red-900 dark:text-red-300">
                        {allergen.word}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No allergens detected</p>
                  )}
                </div>
              </>
            )}
            
            {result.analysis && (
              <div className="border rounded-md p-4 bg-gray-50 dark:bg-gray-900">
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(result.analysis, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
