"use client"

import type React from "react"

import { useState, useRef, FormEvent } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Camera, Upload, Search, Grid3X3, List, Loader2, Info, AlertCircle } from "lucide-react"
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

interface AllergenCount {
  allergen: string;
  count: number;
}

// Add these styles at the top of the file, after imports
const cardStyles = "bg-white/10 backdrop-blur-sm border-purple-300/30 shadow-lg shadow-purple-500/20";
const cardHeaderStyles = "text-white";
const cardContentStyles = "text-gray-100";
const titleStyles = "text-white";
const buttonPrimaryStyles = "bg-purple-600 hover:bg-purple-700 text-white";
const buttonOutlineStyles = "border-purple-400 text-purple-200 hover:bg-purple-800/50";

export default function Dashboard() {
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

  const [allergenCounts, setAllergenCounts] = useState<AllergenCount[]>([]);

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

  // Calculate allergen counts
  const calculateAllergenCounts = (menuItems: MenuItem[]) => {
    const allergenMap = new Map<string, number>();
    
    menuItems.forEach(item => {
      if (item.allergens && Array.isArray(item.allergens)) {
        item.allergens.forEach(allergen => {
          const count = allergenMap.get(allergen) || 0;
          allergenMap.set(allergen, count + 1);
        });
      }
    });

    // Convert to array and sort by count
    return Array.from(allergenMap.entries())
      .map(([allergen, count]) => ({ allergen, count }))
      .sort((a, b) => b.count - a.count);
  };

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
        setAllergenCounts(calculateAllergenCounts(data.menu_items));
      } else if (typeof data === "string") {
        // If data is a string, try to parse it as JSON
        try {
          // Sanitize the content to ensure valid JSON
          let sanitizedContent = data.replace(/```json\s+/g, '').replace(/```\s*$/g, '').trim();
          const parsedData = JSON.parse(sanitizedContent);
          
          if (parsedData.menu_items && Array.isArray(parsedData.menu_items)) {
            setMenuItems(parsedData.menu_items);
            setShowResults(parsedData.menu_items.length > 0);
            setAllergenCounts(calculateAllergenCounts(parsedData.menu_items));
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
      
      const data = await res.json();
      console.log("API response:", data);
      
      // Update text response if available
      if (data.text) {
        setResponse(data.text);
      }
      
      // Process the response to extract menu items and metadata
      processMenuResponse(data);
      
    } catch (error) {
      console.error("Error processing menu:", error);
      setError(`Error processing menu: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset the form
  const handleReset = () => {
    setImage(null)
    setFile(null)
    setMenuItems([])
    setMenuMetadata({})
    setShowResults(false)
    setError(null)
    setResponse("")
    setSelectedAllergens([])
    setSelectedDietaryTags([])
    setSelectedCategory(null)
    setMaxPrice(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

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

  // Extract unique categories for filter options
  const uniqueCategories = Array.from(
    new Set(menuItems.filter(item => item.category).map(item => item.category))
  ).filter((category): category is string => category !== null && category !== undefined);
  
  // Extract unique dietary tags for filter options
  const uniqueDietaryTags = Array.from(
    new Set(
      menuItems
        .filter(item => item.dietary_tags)
        .flatMap(item => item.dietary_tags || [])
    )
  );
  
  // Extract unique allergens for filter options
  const uniqueAllergens = Array.from(
    new Set(
      menuItems
        .filter(item => item.allergens)
        .flatMap(item => item.allergens || [])
    )
  );

  // Show more info about a menu item
  const showItemInfo = (item: MenuItem) => {
    alert(`
      Dish: ${item.dish_name}
      Price: $${item.price !== null ? item.price.toFixed(2) : "N/A"}
      Description: ${item.description || "No description available"}
      Ingredients: ${item.ingredients ? item.ingredients.join(", ") : "No ingredients listed"}
      Allergens: ${item.allergens ? item.allergens.join(", ") : "No allergens listed"}
    `)
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Menu Scanner</h2>
          <p className="text-purple-200">Scan restaurant menus to identify allergens and ingredients</p>
        </div>
      </div>

      {/* Add the Allergens Statistics Card here */}
      {allergenCounts.length > 0 && (
        <Card className={`${cardStyles} bg-gradient-to-r from-purple-800/70 to-indigo-800/70`}>
          <CardHeader className={cardHeaderStyles}>
            <CardTitle className={titleStyles}>Common Allergens</CardTitle>
          </CardHeader>
          <CardContent className={`${cardContentStyles} pt-0`}>
            <div className="flex flex-wrap gap-2">
              {allergenCounts.map(({ allergen, count }) => (
                <div 
                  key={allergen}
                  className="flex items-center gap-1.5 bg-purple-900/50 text-purple-100 px-3 py-1.5 rounded-full border border-purple-400/30"
                >
                  <span className="font-medium">{allergen}</span>
                  <span className="bg-purple-700/50 px-2 py-0.5 rounded-full text-sm">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-red-300 bg-red-900/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-200">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!showResults ? (
        <div className="space-y-6">
          <Card className={cardStyles}>
            <CardHeader className={cardHeaderStyles}>
              <CardTitle className={titleStyles}>Upload or Take a Picture of a Menu</CardTitle>
            </CardHeader>
            <CardContent className={`space-y-4 ${cardContentStyles}`}>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button
                  variant="outline"
                  size="lg"
                  className={`w-full sm:w-auto ${buttonOutlineStyles}`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Image
                </Button>
                <Button variant="outline" size="lg" className={`w-full sm:w-auto ${buttonOutlineStyles}`} onClick={handleCameraCapture}>
                  <Camera className="mr-2 h-4 w-4" />
                  Take Picture
                </Button>
                <Input type="file" accept="image/png" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              </div>

              {image && (
                <div className="mt-4 flex flex-col items-center">
                  <div className="relative h-64 w-full max-w-md overflow-hidden rounded-lg border border-purple-400/30">
                    <Image src={image || "/placeholder.svg"} alt="Menu preview" fill className="object-contain" />
                  </div>
                  <div className="mt-4 flex gap-2">
                    <Button
                        onClick={() => {
                        const fakeEvent = { preventDefault: () => {} } as unknown as FormEvent<HTMLFormElement>;
                        onSubmit(fakeEvent);
                        }}
                        disabled={!file || submitted}
                        className={buttonPrimaryStyles}
                    >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          "Analyze Menu"
                        )}
                    </Button>
                    <Button variant="outline" onClick={handleReset} className={buttonOutlineStyles}>
                      Reset
                    </Button>
                  </div>
                  
                  {isLoading && (
                    <div className="mt-4 w-full max-w-md">
                      <p className="text-center text-sm text-purple-200">Processing your menu image...</p>
                    </div>
                  )}
                  
                  {response && (
                    <div className="mt-6 w-full max-w-md">
                      <Card className={cardStyles}>
                        <CardHeader className={`py-3 ${cardHeaderStyles}`}>
                          <CardTitle className={`text-md ${titleStyles}`}>Extracted Text</CardTitle>
                        </CardHeader>
                        <CardContent className={cardContentStyles}>
                          <div className="max-h-[300px] overflow-y-auto p-3 bg-black/50 rounded-md whitespace-pre-wrap text-sm">
                            {typeof response === 'string' ? response : JSON.stringify(response, null, 2)}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Show restaurant metadata if available */}
          {(menuMetadata.restaurant_name || menuMetadata.menu_type || menuMetadata.cuisine_type) && (
            <Card className="bg-gradient-to-r from-purple-800/70 to-indigo-800/70 backdrop-blur-sm border-0 shadow-lg shadow-purple-500/30">
              <CardContent className="p-6">
                <div className="space-y-2">
                  {menuMetadata.restaurant_name && (
                    <h2 className="text-2xl font-bold text-white">{menuMetadata.restaurant_name}</h2>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {menuMetadata.menu_type && (
                      <Badge variant="outline" className="px-2.5 py-0.5 text-xs bg-purple-600/30 text-purple-100 border-purple-400/50">
                        {menuMetadata.menu_type} Menu
                      </Badge>
                    )}
                    {menuMetadata.cuisine_type && (
                      <Badge variant="outline" className="px-2.5 py-0.5 text-xs bg-purple-600/30 text-purple-100 border-purple-400/50">
                        {menuMetadata.cuisine_type} Cuisine
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col space-y-4 md:flex-row md:items-start md:space-x-4 md:space-y-0">
            {/* Filters Panel */}
            <Card className={cardStyles}>
              <CardHeader className={`pb-2 ${cardHeaderStyles}`}>
                <CardTitle className={titleStyles}>Filters</CardTitle>
              </CardHeader>
              <CardContent className={`space-y-6 ${cardContentStyles}`}>
                {/* Category Filter */}
                {uniqueCategories.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-purple-100">Category</h3>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <Input 
                          type="radio" 
                          id="category-all" 
                          name="category" 
                          className="h-4 w-4 text-purple-600 border-purple-300" 
                          checked={selectedCategory === null}
                          onChange={() => setSelectedCategory(null)}
                        />
                        <label htmlFor="category-all" className="text-sm text-purple-100">All Categories</label>
                      </div>
                      {uniqueCategories.map((category, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <Input 
                            type="radio" 
                            id={`category-${idx}`} 
                            name="category" 
                            className="h-4 w-4 text-purple-600 border-purple-300" 
                            checked={selectedCategory === category}
                            onChange={() => setSelectedCategory(category)}
                          />
                          <label htmlFor={`category-${idx}`} className="text-sm text-purple-100">{category}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dietary Preferences Filter */}
                {uniqueDietaryTags.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-purple-100">Dietary Preferences</h3>
                    <div className="space-y-1">
                      {uniqueDietaryTags.map((tag, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <Input 
                            type="checkbox" 
                            id={`diet-${idx}`} 
                            className="h-4 w-4 text-purple-600 border-purple-300" 
                            checked={selectedDietaryTags.includes(tag.toLowerCase())}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedDietaryTags([...selectedDietaryTags, tag.toLowerCase()]);
                              } else {
                                setSelectedDietaryTags(selectedDietaryTags.filter(t => t !== tag.toLowerCase()));
                              }
                            }}
                          />
                          <label htmlFor={`diet-${idx}`} className="text-sm text-purple-100">{tag}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Allergen Filter */}
                {uniqueAllergens.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-purple-100">Exclude Allergens</h3>
                    <div className="space-y-1">
                      {uniqueAllergens.map((allergen, idx) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <Input 
                            type="checkbox" 
                            id={`allergen-${idx}`} 
                            className="h-4 w-4 text-purple-600 border-purple-300" 
                            checked={selectedAllergens.includes(allergen.toLowerCase())}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedAllergens([...selectedAllergens, allergen.toLowerCase()]);
                              } else {
                                setSelectedAllergens(selectedAllergens.filter(a => a !== allergen.toLowerCase()));
                              }
                            }}
                          />
                          <label htmlFor={`allergen-${idx}`} className="text-sm text-purple-100">{allergen}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Price Filter */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-purple-100">Max Price</h3>
                  <Input 
                    type="number" 
                    min="0"
                    step="0.01"
                    placeholder="Enter max price"
                    value={maxPrice || ''}
                    onChange={(e) => setMaxPrice(e.target.value ? parseFloat(e.target.value) : null)}
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
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-purple-300" />
                  <Input
                    type="search"
                    placeholder="Search menu items..."
                    className="w-full pl-8 md:w-[300px] bg-white/10 border-purple-400/30 text-white placeholder-purple-300"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setViewMode("grid")}
                    className={viewMode === "grid" ? "bg-purple-700 border-purple-400 text-white" : buttonOutlineStyles}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setViewMode("list")}
                    className={viewMode === "list" ? "bg-purple-700 border-purple-400 text-white" : buttonOutlineStyles}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={handleReset} className={buttonOutlineStyles}>
                    Scan New Menu
                  </Button>
                </div>
              </div>

              {/* Display count of results */}
              <div className="text-sm text-purple-200">
                Showing {filteredMenuItems.length} of {menuItems.length} menu items
              </div>

              {/* Render menu items based on view mode */}
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredMenuItems.map((item, index) => (
                    <Card key={index} className={`overflow-hidden ${cardStyles}`}>
                      <div className="relative h-48 w-full bg-purple-700/30">
                        <div className="flex h-full items-center justify-center text-purple-100 p-4 text-center font-medium">
                          {item.dish_name}
                        </div>
                      </div>
                      <CardHeader className={`p-4 ${cardHeaderStyles}`}>
                        <div className="flex items-center justify-between">
                          <CardTitle className={`text-lg ${titleStyles}`}>{item.dish_name}</CardTitle>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg text-purple-100">
                              ${item.price !== null ? item.price.toFixed(2) : "N/A"}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="rounded-full h-8 w-8 text-purple-200 hover:bg-purple-700/50 hover:text-white"
                              onClick={() => showItemInfo(item)}
                            >
                              <Info className="h-5 w-5" />
                              <span className="sr-only">More information</span>
                            </Button>
                          </div>
                        </div>
                        {item.category && (
                          <Badge variant="outline" className="mt-1 bg-purple-600/30 text-purple-100 border-purple-400/50">
                            {item.category}
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent className={`p-4 pt-0 ${cardContentStyles}`}>
                        <p className="text-sm text-purple-200">{item.description || "No description available"}</p>

                        {item.ingredients && item.ingredients.length > 0 && (
                          <div className="mt-4">
                            <p className="mb-2 text-sm font-medium">Ingredients:</p>
                            <p className="text-sm text-purple-200">{item.ingredients.join(", ")}</p>
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
                                  className="px-3 py-1.5 text-xs bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
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
                                  className="px-3 py-1.5 text-xs bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
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
                              <h3 className="font-medium">{item.dish_name}</h3>
                              {item.category && (
                                <Badge variant="outline" className="mt-1 mr-2">
                                  {item.category}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold">${item.price !== null ? item.price.toFixed(2) : "N/A"}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="rounded-full h-8 w-8"
                                onClick={() => showItemInfo(item)}
                              >
                                <Info className="h-5 w-5" />
                                <span className="sr-only">More information</span>
                              </Button>
                            </div>
                          </div>
                          <p className="mt-1 text-sm text-purple-200">
                            {item.description || "No description available"}
                          </p>

                          {item.ingredients && item.ingredients.length > 0 && (
                            <div className="mt-2">
                              <p className="text-sm font-medium">
                                Ingredients: <span className="font-normal">{item.ingredients.join(", ")}</span>
                              </p>
                            </div>
                          )}

                          <div className="mt-2 flex flex-wrap gap-2">
                            {item.allergens && item.allergens.length > 0 && (
                              item.allergens.map((allergen, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="px-2 py-1 text-xs bg-red-50 text-red-700 border-red-200"
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
                                  className="px-2 py-1 text-xs bg-green-50 text-green-700 border-green-200"
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
                <div className="flex h-[200px] items-center justify-center rounded-md border border-purple-400/30 bg-purple-800/20">
                  <div className="text-center">
                    <p className="text-sm text-purple-200">No menu items found</p>
                  </div>
                </div>
              )}

              {response && (
                <Card className={`mt-6 ${cardStyles}`}>
                  <CardHeader className={cardHeaderStyles}>
                    <CardTitle className={titleStyles}>Raw Extracted Text</CardTitle>
                  </CardHeader>
                  <CardContent className={cardContentStyles}>
                    <div className="max-h-[400px] overflow-y-auto p-4 bg-black/50 rounded-md whitespace-pre-wrap text-sm text-gray-100">
                      {response}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

