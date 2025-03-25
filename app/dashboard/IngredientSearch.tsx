"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Tag, X, Search, Loader2 } from "lucide-react"

interface MenuItem {
  dish_name: string
  description: string | null
  ingredients: string[] | null
  allergens: string[] | null
  price: number | null
  category?: string | null
  dietary_tags?: string[] | null
}

// Add these styles at the top of the file, after imports
const cardStyles = "bg-white/10 backdrop-blur-sm border-purple-300/30 shadow-lg shadow-purple-500/20";
const cardHeaderStyles = "text-white";
const cardContentStyles = "text-gray-100";
const titleStyles = "text-white";
const buttonPrimaryStyles = "bg-purple-600 hover:bg-purple-700 text-white";
const buttonOutlineStyles = "border-purple-400 text-purple-200 hover:bg-purple-800/50";
const badgeStyles = "bg-purple-600/30 text-purple-100 border-purple-400/50";

export default function IngredientSearch() {
  // Search state
  const [ingredients, setIngredients] = useState<string[]>([])
  const [currentIngredient, setCurrentIngredient] = useState("")
  const [matchAll, setMatchAll] = useState(false)
  const [excludeAllergens, setExcludeAllergens] = useState<string[]>([])
  const [currentAllergen, setCurrentAllergen] = useState("")
  const [maxPrice, setMaxPrice] = useState<number | null>(null)
  
  // Results state
  const [searchResults, setSearchResults] = useState<MenuItem[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Add ingredient to search list
  const addIngredient = () => {
    if (currentIngredient.trim() && !ingredients.includes(currentIngredient.trim().toLowerCase())) {
      setIngredients([...ingredients, currentIngredient.trim().toLowerCase()])
      setCurrentIngredient("")
    }
  }

  // Remove ingredient from search list
  const removeIngredient = (ingredient: string) => {
    setIngredients(ingredients.filter(ing => ing !== ingredient))
  }

  // Add allergen to exclude list
  const addAllergen = () => {
    if (currentAllergen.trim() && !excludeAllergens.includes(currentAllergen.trim().toLowerCase())) {
      setExcludeAllergens([...excludeAllergens, currentAllergen.trim().toLowerCase()])
      setCurrentAllergen("")
    }
  }

  // Remove allergen from exclude list
  const removeAllergen = (allergen: string) => {
    setExcludeAllergens(excludeAllergens.filter(a => a !== allergen))
  }

  // Handle search submission
  const handleSearch = async () => {
    if (ingredients.length === 0) {
      setError("Please add at least one ingredient to search for")
      return
    }

    setIsSearching(true)
    setError(null)
    
    try {
      // Create search parameters for API call
      const searchParams = {
        searchType: 'ingredients',
        ingredients,
        matchAll,
        excludeAllergens,
        maxPrice: maxPrice || undefined
      }
      
      // Call the API endpoint
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(searchParams),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `API error: ${response.status}`)
      }
      
      const data = await response.json()
      setSearchResults(data.results || [])
      setHasSearched(true)
    } catch (err) {
      console.error("Error searching by ingredients:", err)
      setError(`Error searching for menu items: ${err instanceof Error ? err.message : String(err)}`)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // Reset search form
  const resetSearch = () => {
    setIngredients([])
    setCurrentIngredient("")
    setMatchAll(false)
    setExcludeAllergens([])
    setCurrentAllergen("")
    setMaxPrice(null)
    setSearchResults([])
    setHasSearched(false)
    setError(null)
  }

  return (
    <div className="w-full space-y-6">
      <Card className={cardStyles}>
        <CardHeader className={cardHeaderStyles}>
          <CardTitle className={titleStyles}>Search Menu Items by Ingredients</CardTitle>
        </CardHeader>
        <CardContent className={`space-y-4 ${cardContentStyles}`}>
          {/* Ingredient Input */}
          <div className="space-y-2">
            <Label htmlFor="ingredient-input" className="text-purple-100">Add Ingredients</Label>
            <div className="flex gap-2">
              <Input
                id="ingredient-input"
                placeholder="Enter an ingredient..."
                value={currentIngredient}
                onChange={(e) => setCurrentIngredient(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addIngredient()
                  }
                }}
                className="bg-white/10 border-purple-400/30 text-white placeholder-purple-300"
              />
              <Button onClick={addIngredient} className={buttonPrimaryStyles}>Add</Button>
            </div>
            
            {/* Ingredient Tags */}
            {ingredients.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {ingredients.map((ing, i) => (
                  <Badge key={i} variant="secondary" className="pl-2 bg-purple-700/50 text-purple-100">
                    <Tag className="mr-1 h-3 w-3" />
                    {ing}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 ml-1 text-purple-200 hover:text-white hover:bg-purple-800/50"
                      onClick={() => removeIngredient(ing)}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
            
            {/* Match All Option */}
            <div className="flex items-center space-x-2 mt-2">
              <Checkbox
                id="match-all"
                checked={matchAll}
                onCheckedChange={(checked) => setMatchAll(checked === true)}
                className="text-purple-600 border-purple-300"
              />
              <label
                htmlFor="match-all"
                className="text-sm font-medium leading-none cursor-pointer text-purple-100"
              >
                Match all ingredients (AND search)
              </label>
            </div>
          </div>
          
          {/* Allergen Exclusion */}
          <div className="space-y-2 pt-2 border-t border-purple-500/20">
            <Label htmlFor="allergen-input" className="text-purple-100">Exclude Allergens</Label>
            <div className="flex gap-2">
              <Input
                id="allergen-input"
                placeholder="Enter allergen to exclude..."
                value={currentAllergen}
                onChange={(e) => setCurrentAllergen(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    addAllergen()
                  }
                }}
                className="bg-white/10 border-purple-400/30 text-white placeholder-purple-300"
              />
              <Button variant="outline" onClick={addAllergen} className={buttonOutlineStyles}>Add</Button>
            </div>
            
            {/* Allergen Tags */}
            {excludeAllergens.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {excludeAllergens.map((allergen, i) => (
                  <Badge key={i} variant="outline" className="bg-red-900/30 text-red-200 border-red-400/50 pl-2">
                    {allergen}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 ml-1 text-red-200 hover:text-white hover:bg-red-900/50"
                      onClick={() => removeAllergen(allergen)}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove</span>
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          {/* Price Filter */}
          <div className="space-y-2 pt-2 border-t border-purple-500/20">
            <Label htmlFor="max-price" className="text-purple-100">Maximum Price</Label>
            <div className="flex gap-2">
              <Input
                id="max-price"
                type="number"
                placeholder="Max price..."
                min="0"
                step="0.01"
                value={maxPrice || ""}
                onChange={(e) => setMaxPrice(e.target.value ? parseFloat(e.target.value) : null)}
                className="bg-white/10 border-purple-400/30 text-white placeholder-purple-300"
              />
            </div>
          </div>
          
          {/* Search Controls */}
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSearch} disabled={isSearching || ingredients.length === 0} className={`flex-1 ${buttonPrimaryStyles}`}>
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" /> Search Menu Items
                </>
              )}
            </Button>
            <Button variant="outline" onClick={resetSearch} className={buttonOutlineStyles}>Reset</Button>
          </div>
          
          {/* Error Display */}
          {error && (
            <div className="p-2 text-sm text-red-200 bg-red-900/30 rounded-md border border-red-400/50">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Search Results */}
      {hasSearched && (
        <Card className={cardStyles}>
          <CardHeader className={cardHeaderStyles}>
            <CardTitle className={titleStyles}>Search Results</CardTitle>
          </CardHeader>
          <CardContent className={cardContentStyles}>
            {searchResults.length > 0 ? (
              <div className="space-y-4">
                {searchResults.map((item, index) => (
                  <div key={index} className="p-4 border rounded-md border-purple-400/30 bg-purple-800/20">
                    <div className="flex justify-between">
                      <h3 className="font-semibold text-white">{item.dish_name}</h3>
                      <span className="font-bold text-purple-100">${item.price !== null ? item.price.toFixed(2) : "N/A"}</span>
                    </div>
                    
                    {item.description && (
                      <p className="text-sm text-purple-200 mt-1">{item.description}</p>
                    )}
                    
                    {/* Ingredients with highlighting for search terms */}
                    {item.ingredients && item.ingredients.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-purple-100">Ingredients:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.ingredients.map((ing, i) => (
                            <Badge 
                              key={i} 
                              variant={ingredients.includes(ing.toLowerCase()) ? "default" : "outline"}
                              className={ingredients.includes(ing.toLowerCase()) 
                                ? "bg-green-700/50 text-green-100 hover:bg-green-700/70" 
                                : "bg-white/10 text-purple-100 border-purple-400/30"}
                            >
                              {ing}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Allergens */}
                    {item.allergens && item.allergens.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-purple-100">Allergens:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.allergens.map((allergen, i) => (
                            <Badge 
                              key={i} 
                              variant="outline"
                              className="bg-red-900/30 text-red-200 border-red-400/50"
                            >
                              {allergen}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Dietary Info */}
                    {item.dietary_tags && item.dietary_tags.length > 0 && (
                      <div className="mt-2">
                        <p className="text-sm font-medium text-purple-100">Dietary Info:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.dietary_tags.map((tag, i) => (
                            <Badge 
                              key={i} 
                              variant="outline"
                              className="bg-blue-900/30 text-blue-200 border-blue-400/50"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-purple-200">
                <p>No menu items found matching your criteria.</p>
                <p className="mt-1 text-sm">Try adjusting your search parameters or adding different ingredients.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
} 