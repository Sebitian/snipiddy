"use client"

import type React from "react"

import { useState, useRef, FormEvent } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Camera, Upload, Search, Grid3X3, List, Loader2, Info, AlertCircle, Trash2 } from "lucide-react"
import Image from "next/image"

// Define interfaces for menu data
interface MenuItem {
  dish_name: string
  description: string | null
  ingredients: string[] | null
  allergens: string[] | null
  price: number | null
  category?: string | null
  dietary_tags?: string[] | null
}

interface MenuMetadata {
  restaurant_name?: string | null
  menu_type?: string | null
  cuisine_type?: string | null
}

// Update the styles to be theme-responsive
const cardStyles = "bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700";
const cardHeaderStyles = "text-gray-900 dark:text-gray-100";
const cardContentStyles = "text-gray-700 dark:text-gray-300";
const titleStyles = "text-gray-900 dark:text-gray-100 text-2xl font-bold";
const buttonPrimaryStyles = "bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-lg hover:shadow-purple-200/50 dark:hover:shadow-purple-900/50 transition-all";
const buttonOutlineStyles = "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700";

export default function Scanner() {
  const [image, setImage] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [menuMetadata, setMenuMetadata] = useState<MenuMetadata>({})
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [searchQuery, setSearchQuery] = useState("")
  const [showResults, setShowResults] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState("");
  
  // Filter options
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([])
  const [selectedDietaryTags, setSelectedDietaryTags] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [maxPrice, setMaxPrice] = useState<number | null>(null)

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null)
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      setImage(URL.createObjectURL(selectedFile))
    }
  }

  // Handle camera capture (in a real app, this would use the device camera)
  const handleCameraCapture = () => {
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  // Process the menu response with enhanced data handling
  const processMenuResponse = (data: any) => {
    try {
      if (!data) {
        throw new Error("No data received from API");
      }
      
      console.log("Processing API response:", data);
      
      // Handle menu items array
      if (data.menu_items && Array.isArray(data.menu_items)) {
        setMenuItems(data.menu_items);
        setShowResults(data.menu_items.length > 0);
      } else if (typeof data === "string") {
        // If data is a string, try to parse it as JSON
        try {
          // Sanitize the content to ensure valid JSON
          let sanitizedContent = data.replace(/```json\s+/g, '').replace(/```\s*$/g, '').trim();
          const parsedData = JSON.parse(sanitizedContent);
          
          if (parsedData.menu_items && Array.isArray(parsedData.menu_items)) {
            setMenuItems(parsedData.menu_items);
            setShowResults(parsedData.menu_items.length > 0);
          } else {
            throw new Error("No menu items found in parsed data");
          }
        } catch (jsonError) {
          console.error("JSON parse error:", jsonError);
          throw new Error(`Failed to parse response: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`);
        }
      } else {
        throw new Error("Invalid response format: menu items not found");
      }
      
      // Extract and set metadata if available
      const metadata: MenuMetadata = {};
      if (data.restaurant_name) metadata.restaurant_name = data.restaurant_name;
      if (data.menu_type) metadata.menu_type = data.menu_type;
      if (data.cuisine_type) metadata.cuisine_type = data.cuisine_type;
      setMenuMetadata(metadata);
      
      return data;
    } catch (error) {
      console.error("Error processing menu data:", error);
      setError(`Error processing menu data: ${error instanceof Error ? error.message : String(error)}`);
      setMenuItems([]);
      return { menu_items: [] };
    }
  };

  // Handle scan button click
  const handleScan = async () => {
    if (!file) return

    setIsScanning(true)
    setError(null)

    try {
      // Prepare form data
      const formData = new FormData()
      formData.append("file", file)

      console.log("Sending request to API...")
      // Send to API
      const res = await fetch("/api/classify", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error("API error response:", errorText)
        throw new Error(`API error: ${res.status} ${res.statusText}`)
      }

      console.log("Response received, parsing JSON...")
      const data = await res.json()
      console.log("API response data:", data)

      if (!data.text) {
        throw new Error("Invalid API response format")
      }

      const content = data.text
      console.log("Content from API:", content.substring(0, 100) + "...")

      // Process the response
      processMenuResponse(data)
      setShowResults(true)
    } catch (error) {
      console.error("Error scanning menu:", error)
      setError(`Error scanning menu: ${error instanceof Error ? error.message : String(error)}`)
      setShowResults(false)
    } finally {
      setIsScanning(false)
    }
  }

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setSubmitted(true);
    setIsLoading(true);
    setError(null);

    try {
      // Prepare and submit form
      const formData = new FormData();
      formData.append("file", file as File);

      console.log("Sending request to API...");

      // Send to API
      const res = await fetch("/api/classify", {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`API error: ${res.status} ${res.statusText}`);
      }
      
      console.log("Response received, parsing JSON...");
      const data = await res.json();
      console.log("API response data:", data);
      
      if (!data.text) {
        throw new Error("Invalid API response format");
      }
      
      const content = data.text;
      setResponse(content);
      
      // Process the response
      processMenuResponse(data);
      setShowResults(true);
    } catch (error) {
      console.error("Error analyzing menu:", error);
      setError(`Error analyzing menu: ${error instanceof Error ? error.message : String(error)}`);
      setShowResults(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset state for new scan
  const handleReset = () => {
    setFile(null);
    setImage(null);
    setSubmitted(false);
    setShowResults(false);
    setMenuItems([]);
    setMenuMetadata({});
    setError(null);
    setResponse("");
    setSearchQuery("");
    setSelectedAllergens([]);
    setSelectedDietaryTags([]);
    setSelectedCategory(null);
    setMaxPrice(null);
  };

  // Extract unique allergens from menu items
  const uniqueAllergens = Array.from(
    new Set(
      menuItems
        .filter(item => item.allergens)
        .flatMap(item => item.allergens || [])
        .map(allergen => allergen.toLowerCase())
    )
  );

  // Extract unique dietary tags from menu items
  const uniqueDietaryTags = Array.from(
    new Set(
      menuItems
        .filter(item => item.dietary_tags)
        .flatMap(item => item.dietary_tags || [])
        .map(tag => tag.toLowerCase())
    )
  );

  // Extract unique categories from menu items
  const uniqueCategories = Array.from(
    new Set(menuItems.filter(item => item.category).map(item => item.category))
  ).filter((category): category is string => category !== null && category !== undefined);

  // Filter menu items based on search criteria and filters
  const filteredMenuItems = menuItems.filter(item => {
    // Text search filter
    const matchesSearch = searchQuery ? (
      item.dish_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.ingredients && item.ingredients.some(ing => ing.toLowerCase().includes(searchQuery.toLowerCase())))
    ) : true;
    
    // Allergen filter - exclude items with selected allergens
    const passesAllergenFilter = selectedAllergens.length > 0 ? (
      !item.allergens || !item.allergens.some(allergen => 
        selectedAllergens.includes(allergen.toLowerCase())
      )
    ) : true;
    
    // Dietary preference filter
    const passesDietaryFilter = selectedDietaryTags.length > 0 ? (
      item.dietary_tags && item.dietary_tags.some(tag => 
        selectedDietaryTags.includes(tag.toLowerCase())
      )
    ) : true;
    
    // Category filter
    const passesCategoryFilter = selectedCategory ? (
      item.category && item.category.toLowerCase() === selectedCategory.toLowerCase()
    ) : true;
    
    // Price filter
    const passesPriceFilter = maxPrice ? (
      item.price !== null && item.price <= maxPrice
    ) : true;
    
    return matchesSearch && 
           passesAllergenFilter && 
           passesDietaryFilter && 
           passesCategoryFilter && 
           passesPriceFilter;
  });

  // Show detailed information about a menu item
  const showItemInfo = (item: MenuItem) => {
    // In a real app, you might show a modal with detailed information
    alert(
      `${item.dish_name}\n\n` + 
      `${item.description ? `Description: ${item.description}\n\n` : ''}` +
      `${item.ingredients ? `Ingredients: ${item.ingredients.join(', ')}\n\n` : ''}` +
      `${item.allergens ? `Allergens: ${item.allergens.join(', ')}\n\n` : ''}` +
      `${item.dietary_tags ? `Dietary: ${item.dietary_tags.join(', ')}\n\n` : ''}` +
      `${item.price !== null ? `Price: $${item.price.toFixed(2)}` : ''}`
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto">
      {!submitted ? (
        <form onSubmit={onSubmit} className="space-y-8">
          <Card className={`${cardStyles} w-full`}>
            <CardHeader className={`${cardHeaderStyles} text-center`}>
              <CardTitle className={`${titleStyles} text-3xl`}>Scan a Menu</CardTitle>
            </CardHeader>
            <CardContent className={`space-y-6 ${cardContentStyles} px-6 sm:px-10`}>
              {!image ? (
                <div className="flex flex-col items-center justify-center gap-6 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 p-12 text-center bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Camera className="h-12 w-12 text-gray-400 dark:text-gray-500" />
                    <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200">Capture Menu Image</h3>
                    <p className="text-base text-gray-500 dark:text-gray-400">
                      Take a photo of a menu or upload an image to analyze it
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      type="button"
                      onClick={handleCameraCapture}
                      variant="outline"
                      className={buttonOutlineStyles}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      <span>Take Photo</span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className={buttonOutlineStyles}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      <span>Upload Image</span>
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="relative mx-auto aspect-[4/3] max-w-md overflow-hidden rounded-lg border border-gray-200">
                    <Image
                      src={image}
                      alt="Menu preview"
                      layout="fill"
                      objectFit="cover"
                    />
                  </div>
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <Button type="submit" className={`w-full ${buttonPrimaryStyles}`}>
                      Analyze Menu
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleReset}
                      className={`w-full ${buttonOutlineStyles} bg-red-500`}
                      aria-label="Clear Image"
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-500 dark:text-red-400 border border-red-100 dark:border-red-800">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-400 dark:text-red-500" />
                    <p>{error}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </form>
      ) : (
        <div className="space-y-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="space-y-4 text-center">
                <Loader2 className="mx-auto h-12 w-12 animate-spin text-purple-500" />
                <p className="text-lg font-bold text-gray-700">Analyzing your menu...</p>
                <p className="text-base text-gray-500">This may take a few moments</p>
              </div>
            </div>
          ) : showResults ? (
            <div>
              {menuMetadata.restaurant_name && (
                <div className="mb-8 text-center">
                  <h2 className="text-3xl font-bold text-gray-900">{menuMetadata.restaurant_name}</h2>
                  <div className="flex justify-center gap-4 mt-2">
                    {menuMetadata.cuisine_type && (
                      <p className="text-gray-600">Cuisine: {menuMetadata.cuisine_type}</p>
                    )}
                    {menuMetadata.menu_type && (
                      <p className="text-gray-600">Menu: {menuMetadata.menu_type}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-col space-y-4 md:flex-row md:items-start md:space-x-4 md:space-y-0">
                {/* Filters Panel */}
                <Card className={cardStyles}>
                  <CardHeader className={`pb-2 ${cardHeaderStyles}`}>
                    <CardTitle className="text-xl font-bold">Filters</CardTitle>
                  </CardHeader>
                  <CardContent className={`space-y-6 ${cardContentStyles}`}>
                    {/* Category Filter */}
                    {uniqueCategories.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</h3>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Input 
                              type="radio" 
                              id="category-all" 
                              name="category" 
                              className="h-4 w-4 text-purple-600 border-gray-300 dark:border-gray-600" 
                              checked={selectedCategory === null}
                              onChange={() => setSelectedCategory(null)}
                            />
                            <label htmlFor="category-all" className="text-sm text-gray-700 dark:text-gray-300">All Categories</label>
                          </div>
                          
                          {uniqueCategories.map((category, idx) => (
                            <div key={idx} className="flex items-center space-x-2">
                              <Input 
                                type="radio" 
                                id={`category-${idx}`} 
                                name="category" 
                                className="h-4 w-4 text-purple-600 border-gray-300 dark:border-gray-600" 
                                checked={selectedCategory === category.toLowerCase()}
                                onChange={() => setSelectedCategory(category.toLowerCase())}
                              />
                              <label htmlFor={`category-${idx}`} className="text-sm text-gray-700 dark:text-gray-300">{category}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Dietary Filter */}
                    {uniqueDietaryTags.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Dietary Preferences</h3>
                        <div className="space-y-1">
                          {uniqueDietaryTags.map((tag, idx) => (
                            <div key={idx} className="flex items-center space-x-2">
                              <Input 
                                type="checkbox" 
                                id={`diet-${idx}`} 
                                className="h-4 w-4 text-purple-600 border-gray-300 dark:border-gray-600" 
                                checked={selectedDietaryTags.includes(tag)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedDietaryTags([...selectedDietaryTags, tag]);
                                  } else {
                                    setSelectedDietaryTags(selectedDietaryTags.filter(t => t !== tag));
                                  }
                                }}
                              />
                              <label htmlFor={`diet-${idx}`} className="text-sm text-gray-700 dark:text-gray-300">{tag}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Allergen Filter */}
                    {uniqueAllergens.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Exclude Allergens</h3>
                        <div className="space-y-1">
                          {uniqueAllergens.map((allergen, idx) => (
                            <div key={idx} className="flex items-center space-x-2">
                              <Input 
                                type="checkbox" 
                                id={`allergen-${idx}`} 
                                className="h-4 w-4 text-purple-600 border-gray-300 dark:border-gray-600" 
                                checked={selectedAllergens.includes(allergen)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedAllergens([...selectedAllergens, allergen]);
                                  } else {
                                    setSelectedAllergens(selectedAllergens.filter(a => a !== allergen));
                                  }
                                }}
                              />
                              <label htmlFor={`allergen-${idx}`} className="text-sm text-gray-700 dark:text-gray-300">{allergen}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Price Filter */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Max Price</h3>
                      <Input 
                        type="number" 
                        min="0"
                        step="0.01"
                        placeholder="Enter max price"
                        value={maxPrice || ''}
                        onChange={(e) => setMaxPrice(e.target.value ? parseFloat(e.target.value) : null)}
                        className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500"
                      />
                    </div>

                    {/* Reset Filters Button */}
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className={`w-full ${buttonOutlineStyles}`}
                      onClick={() => {
                        setSelectedAllergens([]);
                        setSelectedDietaryTags([]);
                        setSelectedCategory(null);
                        setMaxPrice(null);
                        setSearchQuery("");
                      }}
                    >
                      Reset Filters
                    </Button>
                  </CardContent>
                </Card>

                {/* Results Panel */}
                <div className="flex-1 space-y-6">
                  <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500" />
                      <Input
                        type="search"
                        placeholder="Search menu items..."
                        className="w-full pl-8 md:w-[300px] bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setViewMode("grid")}
                        className={viewMode === "grid" ? "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100" : buttonOutlineStyles}
                      >
                        <Grid3X3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setViewMode("list")}
                        className={viewMode === "list" ? "bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100" : buttonOutlineStyles}
                      >
                        <List className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" onClick={handleReset} className={buttonOutlineStyles}>
                        Scan New Menu
                      </Button>
                    </div>
                  </div>

                  {/* Display count of results */}
                  <div className="text-sm text-gray-500">
                    Showing {filteredMenuItems.length} of {menuItems.length} menu items
                  </div>

                  {/* Render menu items based on view mode */}
                  {viewMode === "grid" ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                      {filteredMenuItems.map((item, index) => (
                        <Card key={index} className={`overflow-hidden ${cardStyles}`}>
                          <div className="relative h-48 w-full bg-gray-100">
                            <div className="flex h-full items-center justify-center text-gray-700 p-4 text-center font-medium">
                              {item.dish_name}
                            </div>
                          </div>
                          <CardHeader className={`p-4 ${cardHeaderStyles}`}>
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg font-bold text-gray-900">{item.dish_name}</CardTitle>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-lg text-gray-700">
                                  ${item.price !== null ? item.price.toFixed(2) : "N/A"}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="rounded-full h-8 w-8 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                  onClick={() => showItemInfo(item)}
                                >
                                  <Info className="h-5 w-5" />
                                  <span className="sr-only">More information</span>
                                </Button>
                              </div>
                            </div>
                            {item.category && (
                              <Badge variant="outline" className="mt-1 bg-gray-100 text-gray-600 border-gray-300">
                                {item.category}
                              </Badge>
                            )}
                          </CardHeader>
                          <CardContent className={`p-4 pt-0 ${cardContentStyles}`}>
                            <p className="text-sm text-gray-600">{item.description || "No description available"}</p>

                            {item.ingredients && item.ingredients.length > 0 && (
                              <div className="mt-4">
                                <p className="mb-2 text-sm font-medium">Ingredients:</p>
                                <p className="text-sm text-gray-600">{item.ingredients.join(", ")}</p>
                              </div>
                            )}

                            {item.allergens && item.allergens.length > 0 && (
                              <div className="mt-4">
                                <p className="mb-2 text-sm font-medium">Allergens:</p>
                                <div className="flex flex-wrap gap-2">
                                  {item.allergens.map((allergen, i) => (
                                    <Badge
                                      key={i}
                                      variant="outline"
                                      className="px-3 py-1.5 text-xs bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                                    >
                                      {allergen}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {item.dietary_tags && item.dietary_tags.length > 0 && (
                              <div className="mt-4">
                                <p className="mb-2 text-sm font-medium">Dietary Info:</p>
                                <div className="flex flex-wrap gap-2">
                                  {item.dietary_tags.map((tag, i) => (
                                    <Badge
                                      key={i}
                                      variant="outline"
                                      className="px-3 py-1.5 text-xs bg-green-50 text-green-600 hover:bg-green-100 border-green-200"
                                    >
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredMenuItems.map((item, index) => (
                        <Card key={index} className={cardStyles}>
                          <div className="flex flex-col p-4 sm:flex-row">
                            <div className="mt-4 flex-1 sm:mt-0">
                              <div className="flex items-center justify-between">
                                <div>
                                  <h3 className="font-medium text-gray-900">{item.dish_name}</h3>
                                  {item.category && (
                                    <Badge variant="outline" className="mt-1 mr-2 bg-gray-100 text-gray-600 border-gray-300">
                                      {item.category}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-700">${item.price !== null ? item.price.toFixed(2) : "N/A"}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="rounded-full h-8 w-8 text-gray-500 hover:bg-gray-100"
                                    onClick={() => showItemInfo(item)}
                                  >
                                    <Info className="h-5 w-5" />
                                    <span className="sr-only">More information</span>
                                  </Button>
                                </div>
                              </div>
                              <p className="mt-1 text-sm text-gray-600">
                                {item.description || "No description available"}
                              </p>

                              {item.ingredients && item.ingredients.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-sm font-medium text-gray-700">
                                    Ingredients: <span className="font-normal text-gray-600">{item.ingredients.join(", ")}</span>
                                  </p>
                                </div>
                              )}

                              <div className="mt-2 flex flex-wrap gap-2">
                                {item.allergens && item.allergens.length > 0 && (
                                  item.allergens.map((allergen, i) => (
                                    <Badge
                                      key={i}
                                      variant="outline"
                                      className="px-2 py-1 text-xs bg-red-50 text-red-600 border-red-200"
                                    >
                                      {allergen}
                                    </Badge>
                                  ))
                                )}
                                
                                {item.dietary_tags && item.dietary_tags.length > 0 && (
                                  item.dietary_tags.map((tag, i) => (
                                    <Badge
                                      key={i}
                                      variant="outline"
                                      className="px-2 py-1 text-xs bg-green-50 text-green-600 border-green-200"
                                    >
                                      {tag}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}

                  {filteredMenuItems.length === 0 && (
                    <div className="flex h-[200px] items-center justify-center rounded-md border border-gray-200 bg-white">
                      <div className="text-center">
                        <p className="text-sm text-gray-500">No menu items found</p>
                      </div>
                    </div>
                  )}

                  {response && (
                    <Card className={`mt-6 ${cardStyles}`}>
                      <CardHeader className={cardHeaderStyles}>
                        <CardTitle className="text-xl font-bold">Raw Extracted Text</CardTitle>
                      </CardHeader>
                      <CardContent className={cardContentStyles}>
                        <div className="max-h-[400px] overflow-y-auto p-4 bg-gray-50 rounded-md whitespace-pre-wrap text-sm text-gray-600 border border-gray-200">
                          {response}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center rounded-lg border border-gray-200 bg-white">
              <div className="text-center">
                <p className="text-lg font-medium text-gray-700">No menu data to display</p>
                <Button onClick={handleReset} className="mt-4">Scan New Menu</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 