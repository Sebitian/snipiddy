'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { MenuScan } from '@/lib/supabase-service'
import { Pencil, Trash2, UtensilsCrossed, Wand } from 'lucide-react'
import supabaseService from '@/lib/supabase-service'
import Link from 'next/link'

export default function MyScansPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);
  const [scans, setScans] = useState<MenuScan[]>([]);
  const [debug, setDebug] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalScans, setTotalScans] = useState<number>(0);
  const [creatingAutoScan, setCreatingAutoScan] = useState<boolean>(false);

  const supabase = createClient();
  const router = useRouter();
  
  useEffect(() => {
    fetchUserAndScans();
  }, [router, supabase]);

  const fetchUserAndScans = async () => {
    setLoading(true);
    setError(null);
    setDebug(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/sign-in');
        return;
      }

      setUser(user);
      console.log("Current user:", user);

      // Use the service method instead of direct SQL
      const { data, error: sqlError, query } = await supabaseService.getUserScansWithItemCounts(user.id);
      
      // Save debug info
      setDebug({ 
        query: query,
        result: data,
        error: sqlError
      });

      if (sqlError) {
        console.error('Error executing SQL:', sqlError);
        setError(`SQL error: ${sqlError.message}`);
        setScans([]);
        setTotalScans(0);
      } else {
        console.log('SQL query result:', data);
        
        // Transform the data to match MenuScan type
        const transformedScans = (data || []).map((scan: any) => ({
          id: scan.id,
          name: scan.name,
          created_at: scan.created_at,
          user_id: scan.user_id,
          raw_text: scan.raw_text,
          item_count: scan.item_count // New field from our JOIN
        }));
        
        setScans(transformedScans);
        setTotalScans(transformedScans.length);
      }
    } catch (err) {
      console.error('Error in fetchUserAndScans:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setScans([]);
      setTotalScans(0);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (scanId: string) => {
    try {
      // Regular Supabase delete for now
      const { error: menuItemsError } = await supabase
        .from('menu_items')
        .delete()
        .eq('menu_scan_id', scanId);

      if (menuItemsError) {
        throw new Error(`Failed to delete menu items: ${menuItemsError.message}`);
      }

      const { error: scanError } = await supabase
        .from('menu_scans')
        .delete()
        .eq('id', scanId);

      if (scanError) {
        throw new Error(`Failed to delete scan: ${scanError.message}`);
      }

      // Refresh the scans list
      fetchUserAndScans();
    } catch (error) {
      console.error('Error deleting scan:', error);
      alert('Failed to delete scan: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleUpdate = async (scan: MenuScan) => {
    try {
      const newName = prompt('Enter new name for the scan:', scan.name);
      
      if (!newName) return; // User cancelled

      // Regular Supabase update
      const { error } = await supabase
        .from('menu_scans')
        .update({ name: newName })
        .eq('id', scan.id);

      if (error) throw error;

      // Refresh the scans list
      fetchUserAndScans();
    } catch (error) {
      console.error('Error updating scan:', error);
      alert('Failed to update scan');
    }
  };

  // Add this new function to create a scan with auto-naming
  const createAutoNamedScan = async () => {
    if (!user) return;
    
    setCreatingAutoScan(true);
    try {
      // Create sample data with some menu items and raw text
      const sampleData = {
        menu_items: [
          {
            dish_name: "Demo Dish",
            description: "This is a demonstration of the auto-naming trigger",
            ingredients: ["Demo", "Testing", "Auto-naming"],
            allergens: ["Demo"],
            price: 9.99
          }
        ],
        raw_text: "Welcome to Trigger Restaurant - Best Burgers and Steak in town!"
      };
      
      // Call storeMenuData with useAutoNaming set to true
      const result = await supabaseService.storeMenuData(sampleData, user.id, true);
      
      if (result.success) {
        alert("Auto-named scan created successfully! Refreshing list...");
        fetchUserAndScans();
      } else {
        alert(`Failed to create scan: ${result.error}`);
      }
    } catch (error) {
      console.error("Error creating auto-named scan:", error);
      alert("Error creating auto-named scan: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setCreatingAutoScan(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6 p-4 bg-purple-100 rounded-lg border border-purple-200 flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-purple-500 text-white p-3 rounded-full mr-4">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Your Scan Collection</h2>
            <p className="text-gray-700">
              You have scanned <span className="font-bold text-purple-600">{totalScans}</span> menu{totalScans !== 1 ? 's' : ''} so far
            </p>
            <p className="text-xs text-gray-500 mt-1">All new scans use the auto-naming feature to generate names from menu content</p>
          </div>
        </div>
        
        {/* Demo button */}
        <button
          onClick={createAutoNamedScan}
          disabled={creatingAutoScan}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md flex items-center transition-all duration-200 disabled:opacity-50"
          title="Create a test scan to demonstrate the auto-naming feature"
        >
          <Wand className="h-4 w-4 mr-2" />
          {creatingAutoScan ? 'Creating...' : 'Create Test Scan'}
        </button>
      </div>

      <h1 className="text-2xl font-bold mb-6">Your Scans (SQL Test)</h1>
      
      {error && (
        <div className="p-4 mb-4 bg-red-100 border border-red-300 rounded text-red-700">
          <h3 className="font-semibold">Error:</h3>
          <p>{error}</p>
        </div>
      )}
      
      {loading ? (
        <div>Loading...</div>
      ) : scans.length === 0 ? (
        <div>
          <div>No scans found.</div>
          
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold">Debug Info:</h3>
            <p>User ID: {user?.id}</p>
            
            <div className="mt-2 pt-2 border-t border-gray-300">
              <h4 className="text-sm font-medium">SQL Query:</h4>
              <pre className="bg-gray-800 text-white p-2 mt-1 rounded text-xs overflow-x-auto">
                {debug?.query || 'No query executed'}
              </pre>
            </div>
            
            <div className="mt-2 pt-2 border-t border-gray-300">
              <h4 className="text-sm font-medium">Query Result:</h4>
              <pre className="bg-gray-800 text-white p-2 mt-1 rounded text-xs overflow-x-auto">
                {JSON.stringify(debug?.result, null, 2) || 'No result'}
              </pre>
            </div>
            
            {debug?.error && (
              <div className="mt-2 pt-2 border-t border-gray-300">
                <h4 className="text-sm font-medium">Error Details:</h4>
                <pre className="bg-gray-800 text-white p-2 mt-1 rounded text-xs overflow-x-auto">
                  {JSON.stringify(debug.error, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div>
          <ul>
            {scans.map(scan => (
              <li key={scan.id} className="mb-4 p-4 border rounded hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this scan?')) {
                        handleDelete(scan.id!);
                      }
                    }}
                    className="p-1.5 text-red-500 hover:text-red-600 rounded-full transition-all duration-200 hover:shadow-[0_0_10px_rgba(168,85,247,0.5)] hover:bg-red-50"
                    title="Delete scan"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                  
                  <div className="flex-grow">
                    <div className="font-semibold">
                      <Link 
                        href={`/scans/${scan.id}`}
                        className="hover:text-purple-600 transition-colors cursor-pointer"
                      >
                        {scan.name}
                      </Link>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(scan.created_at || '').toLocaleDateString()}
                      {scan.item_count && (
                        <span className="ml-2">({scan.item_count} items)</span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleUpdate(scan)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full transition-all duration-200 hover:shadow-[0_0_10px_rgba(168,85,247,0.5)] hover:bg-gray-50"
                    title="Edit scan"
                  >
                    <Pencil className="h-5 w-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
          
          <div className="mt-6 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold mb-2">Raw SQL Data:</h3>
            <pre className="text-xs overflow-auto p-2 bg-gray-800 text-white rounded">
              {JSON.stringify(debug?.result, null, 2) || 'No data'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}