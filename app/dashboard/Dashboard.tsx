'use client'

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import DataDisplay from '@/components/data-display';

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    async function getUserProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    getUserProfile();
  }, []);


  if (!user) return <div>You need to sign in...</div>;

  return (
    <div className="max-w-7xl mx-auto p-6"> {/* Made wider to accommodate table */}
        <h1 className="text-2xl font-bold mb-2">Welcome, {user.email}!</h1>
        
        <DataDisplay /> {/* Removed userId prop since we're showing all notes */}
    </div>
  );
}