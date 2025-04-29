'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import supabaseService, { MenuItem } from '@/lib/supabase-service'

// Client component to display scan details
export function ScanDetailClient({ id }: { id: string }) {
  const [loading, setLoading] = useState(true)
  const [scan, setScan] = useState<any>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [error, setError] = useState<string | null>(null)
  
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function fetchScanDetails() {
      setLoading(true)
      
      try {
        // Just fetch basic scan info for now
        const { data: scanData, error: scanError } = await supabase
          .from('menu_scans')
          .select('*')
          .eq('id', id)
          .single()
        
        if (scanError) {
          throw scanError
        }
        
        setScan(scanData)
        
        // Fetch menu items using raw SQL method
        const { items, error: itemsError } = await supabaseService.getMenuItems(id)
        
        if (itemsError) {
          console.error('Error fetching menu items:', itemsError)
        } else {
          setMenuItems(items || [])
        }
      } catch (err) {
        console.error('Error fetching scan:', err)
        setError('Failed to load scan details')
      } finally {
        setLoading(false)
      }
    }
    
    fetchScanDetails()
  }, [id, supabase])

  // Group menu items by category
  const menuItemsByCategory: Record<string, MenuItem[]> = {}
  
  // Place items without category in 'Other' category
  menuItems.forEach(item => {
    const category = item.category || 'Other'
    if (!menuItemsByCategory[category]) {
      menuItemsByCategory[category] = []
    }
    menuItemsByCategory[category].push(item)
  })
  
  // Get sorted categories with 'Other' at the end
  const sortedCategories = Object.keys(menuItemsByCategory).sort((a, b) => {
    if (a === 'Other') return 1
    if (b === 'Other') return -1
    return a.localeCompare(b)
  })

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Link 
        href="/my-scans" 
        className="inline-flex items-center text-purple-600 hover:text-purple-800 mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" /> Back to My Scans
      </Link>
      
      {loading ? (
        <div className="text-center py-10">Loading scan details...</div>
      ) : error ? (
        <div className="p-4 bg-red-100 border border-red-300 rounded text-red-700">
          <h3 className="font-semibold">Error:</h3>
          <p>{error}</p>
        </div>
      ) : scan ? (
        <div>
          <h1 className="text-2xl font-bold mb-6">{scan.name}</h1>
          <div className="p-4 bg-gray-50 rounded border mb-6">
            <div className="text-sm text-gray-500">Scan ID: {scan.id}</div>
            <div className="text-sm text-gray-500">
              Created: {new Date(scan.created_at).toLocaleDateString()}
            </div>
            <div className="text-sm text-gray-500">
              Total Items: {menuItems.length}
            </div>
          </div>
          
          <div className="bg-white p-6 border rounded shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Menu Items</h2>
            
            {menuItems.length === 0 ? (
              <p className="text-gray-600">No menu items found for this scan.</p>
            ) : (
              <div className="space-y-6">
                {sortedCategories.map(category => (
                  <div key={category} className="menu-category">
                    <h3 className="text-lg font-medium border-b pb-2 mb-3">{category}</h3>
                    <div className="space-y-4">
                      {menuItemsByCategory[category].map(item => (
                        <div key={item.id} className="p-3 border rounded hover:bg-gray-50">
                          <div className="flex justify-between">
                            <div className="font-medium">{item.dish_name}</div>
                            {item.price && (
                              <div className="font-medium">${item.price.toFixed(2)}</div>
                            )}
                          </div>
                          
                          {item.description && (
                            <div className="text-sm text-gray-600 mt-1">{item.description}</div>
                          )}
                          
                          <div className="mt-2 flex flex-wrap gap-1">
                            {item.allergens && item.allergens.length > 0 && (
                              <div className="text-xs bg-red-100 text-red-800 rounded px-1.5 py-0.5 mr-1">
                                Allergens: {item.allergens.join(', ')}
                              </div>
                            )}
                            
                            {item.dietary_tags && item.dietary_tags.length > 0 && item.dietary_tags.map(tag => (
                              <span key={tag} className="text-xs bg-green-100 text-green-800 rounded px-1.5 py-0.5">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-4 bg-yellow-100 border border-yellow-300 rounded text-yellow-800">
          Scan not found.
        </div>
      )}
    </div>
  )
} 