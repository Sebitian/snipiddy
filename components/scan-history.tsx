'use client';

import { useState, useEffect } from 'react';
import supabaseService, { MenuScan, MenuItem } from '@/lib/supabase-service';
import { Card } from './ui/card';
import { HistoryIcon, ExternalLinkIcon, UtensilsIcon } from 'lucide-react';
import Link from 'next/link';
import { Button } from './ui/button';
import { Skeleton } from './ui/skeleton';

interface ScanHistoryProps {
  userId: string;
  limit?: number;
}

export function ScanHistory({ userId, limit = 5 }: ScanHistoryProps) {
  const [scans, setScans] = useState<MenuScan[]>([]);
  const [menuItems, setMenuItems] = useState<Record<string, MenuItem[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchScans = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { scans, menuItems, error } = await supabaseService.getUserMenuScans(userId, limit);
        
        if (error) {
          console.error("Error fetching scans:", error);
          // Don't show the error to the user during implementation
          setScans([]);
          return;
        }
        
        if (scans) setScans(scans);
        if (menuItems) setMenuItems(menuItems);
      } catch (err) {
        console.error("Error in scan history component:", err);
        setScans([]);
      } finally {
        setLoading(false);
      }
    };

    fetchScans();
  }, [userId, limit]);

  if (loading) {
    return (
      <div className="space-y-3">
        <p className="text-muted-foreground text-sm">
          Loading your scan history...
        </p>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  // Show all scans for now, even if they aren't associated with user
  // This will display your existing data while you transition to the new user-based system
  if (scans.length === 0) {
    return (
      <div className="py-8 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
          <HistoryIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">
          You haven't scanned any menus yet
        </p>
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href="/dashboard">
            Scan Your First Menu
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {scans.map((scan) => (
        <ScanHistoryItem 
          key={scan.id} 
          scan={scan} 
          menuItems={scan.id ? menuItems[scan.id.toString()] : []} 
        />
      ))}
      
      {scans.length > 0 && (
        <Button variant="outline" size="sm" className="w-full" asChild>
          <Link href="/dashboard/history">
            View All Scan History
          </Link>
        </Button>
      )}
    </div>
  );
}

function ScanHistoryItem({ scan, menuItems = [] }: { scan: MenuScan; menuItems?: MenuItem[] }) {
  // Format date
  const date = new Date(scan.created_at || '');
  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

  // Since we don't have restaurant_name in your schema, use the first part of raw_text as a title
  const title = scan.raw_text ? 
    (scan.raw_text.split(' ').slice(0, 3).join(' ') + '...') : 
    'Menu Scan';
  
  const itemCount = menuItems?.length || 0;
  
  return (
    <Link href={`/dashboard/scan/${scan.id}`}>
      <div className="p-3 rounded-lg border border-border bg-secondary/20 hover:bg-secondary/30 transition-colors cursor-pointer group">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <UtensilsIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-sm line-clamp-1">{title}</h4>
              <p className="text-xs text-muted-foreground">
                {itemCount} items • {formattedDate}
              </p>
            </div>
          </div>
          <ExternalLinkIcon className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>
    </Link>
  );
}