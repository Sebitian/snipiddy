'use client';

import { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import Link from "next/link";
import { 
  UserIcon,
  HistoryIcon,
  EditIcon,
  ClipboardListIcon
} from "lucide-react";
import { ScanHistory } from "./scan-history";
import supabaseService from "@/lib/supabase-service";

interface UserProfileProps {
  user: User;
}

export function UserProfile({ user }: UserProfileProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Extract first name from email for personalized greeting
  const firstName = user.email?.split('@')[0]?.split('.')[0] || 'there';
  const capitalizedName = firstName.charAt(0).toUpperCase() + firstName.slice(1);
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;
      
      try {
        setLoading(true);
        const { profile, error } = await supabaseService.getUserProfile(user.id);
        
        if (error) {
          console.error("Error fetching profile:", error);
        }
        
        // Set profile (might be null, which is fine)
        setProfile(profile);
      } catch (err) {
        console.error("Error fetching profile:", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserProfile();
  }, [user?.id]);
  
  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="mb-6 text-center sm:text-left">
        <h1 className="text-3xl font-bold mb-2">
          Hello, {capitalizedName}
        </h1>
      </div>
      
      {/* Profile Card */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Profile Information</h2>
          <UserIcon className="h-5 w-5 text-muted-foreground" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="font-medium">{user.email}</span>
            </div>
            
            <div className="flex flex-col">
              <span className="text-sm text-muted-foreground">Member since</span>
              <span className="font-medium">
                {new Date(user.created_at || '').toLocaleDateString()}
              </span>
            </div>
            
            {profile?.full_name && (
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Name</span>
                <span className="font-medium">{profile.full_name}</span>
              </div>
            )}

            {profile?.phone_number && (
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Phone</span>
                <span className="font-medium">{profile.phone_number}</span>
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            {profile?.allergens && profile.allergens.length > 0 && (
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Allergens</span>
                <span className="font-medium">{profile.allergens.join(', ')}</span>
              </div>
            )}

            {profile?.diets && profile.diets.length > 0 && (
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">Dietary Preferences</span>
                <span className="font-medium">{profile.diets.join(', ')}</span>
              </div>
            )}
          </div>
        </div>
        
        <Button className="mt-6" asChild>
          <Link href="/profile">
            <EditIcon className="mr-2 h-4 w-4" />
            Edit Profile
          </Link>
        </Button>
      </Card>
      
      {/* Recent Scans */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Recent Scans</h2>
          <HistoryIcon className="h-5 w-5 text-muted-foreground" />
        </div>
        
        <div className="mb-6">
          <ScanHistory userId={user.id} userEmail={user.email} limit={5} />
        </div>
      </Card>
    </div>
  );
}