'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import supabaseService, { MenuItem, MenuScan } from '@/lib/supabase-service'

// Client component to display scan details
export function ScanDetailClient({ id }: { id: string }) {
  const [loading, setLoading] = useState(true)
  const [scan, setScan] = useState<MenuScan | null>(null)
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [debug, setDebug] = useState<any>(null)
  
  const router = useRouter()

  useEffect(() => {
    async function fetchScanDetails() {
      setLoading(true)
      
      try {
        // Use the getMenuScan function to fetch both scan and items in one call
        const { menuScan, menuItems: items, error: fetchError, debug: debugInfo } = 
          await supabaseService.getMenuScan(id)
        
        if (fetchError) {
          setError(fetchError)
          console.error('Error fetching scan details:', fetchError)
        }
        
        if (menuScan) {
          setScan(menuScan)
        }
        
        setMenuItems(items || [])
        
        // Store debug info if available
        if (debugInfo) {
          setDebug(debugInfo)
          console.log('Debug info:', debugInfo)
        }
      } catch (err) {
        console.error('Error in fetchScanDetails:', err)
        setError('An unexpected error occurred')
      } finally {
        setLoading(false)
      }
    }
    
    fetchScanDetails()
  }, [id])

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
              Created: {new Date(scan.created_at || '').toLocaleDateString()}
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
              <div className="space-y-4">
                {menuItems.map(item => (
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Debug section - remove in production */}
          {process.env.NODE_ENV !== 'production' && debug && (
            <div className="mt-6 p-4 bg-gray-100 rounded">
              <h3 className="font-semibold mb-2">Debug Info:</h3>
              <div className="mb-2">
                <h4 className="text-sm font-medium">Scan Query:</h4>
                <pre className="bg-gray-800 text-white p-2 mt-1 rounded text-xs overflow-x-auto">
                  {debug.scanQuery || 'No query available'}
                </pre>
              </div>
              <div>
                <h4 className="text-sm font-medium">Items Query:</h4>
                <pre className="bg-gray-800 text-white p-2 mt-1 rounded text-xs overflow-x-auto">
                  {debug.itemsQuery || 'No query available'}
                </pre>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 bg-yellow-100 border border-yellow-300 rounded text-yellow-800">
          Scan not found.
        </div>
      )}
    </div>
  )
} 