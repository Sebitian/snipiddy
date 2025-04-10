'use client';

import { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import Link from "next/link";
import { 
  LayoutDashboardIcon, 
  AlertCircleIcon, 
  TrendingUpIcon,
  UserIcon,
  HistoryIcon
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
      <div className="mb-12 text-center sm:text-left">
        <h1 className="text-4xl font-bold mb-2 glow-text">
          Hello, {capitalizedName}.
        </h1>
        <p className="text-muted-foreground text-lg">
          Welcome back to your personalized food discovery experience.
        </p>
      </div>
      
      <div className="grid gap-8">
        {/* Dashboard redirect */}
        <Card className="glass-card p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-36 h-36 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-2xl -mr-12 -mt-12"></div>
          <h2 className="text-2xl font-semibold mb-6">Your Dashboard</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl">
            Access your menu scanning tools, history, and insights in one beautifully 
            designed space. Experience the future of food discovery.
          </p>
          <div className="flex gap-4">
            <Button asChild className="group" size="lg">
              <Link href="/dashboard">
                <LayoutDashboardIcon className="mr-2 h-5 w-5" />
                Go to Dashboard
              </Link>
            </Button>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* User Profile */}
          <Card className="glass-card p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Profile Summary</h2>
              <UserIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            
            <div className="flex-1">
              <div className="flex flex-col space-y-4">
                <div className="flex justify-center mb-2">
                  <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
                    <UserIcon className="h-10 w-10 text-muted-foreground" />
                  </div>
                </div>
                
                <div className="space-y-3">
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
                </div>
              </div>
              
              <Button variant="outline" className="mt-6 w-full" size="sm" asChild>
                <Link href="/profile/edit">
                  Edit Profile
                </Link>
              </Button>
            </div>
          </Card>
          
          {/* Allergen Profile */}
          <Card className="glass-card p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Allergen Profile</h2>
              <AlertCircleIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            
            <div className="flex-1 flex flex-col justify-between">
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm">
                  Personalize your experience by setting up your allergen profile.
                  We'll highlight potential concerns in every menu you scan.
                </p>
                
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {profile?.allergens && Array.isArray(profile.allergens) ? (
                    profile.allergens.map((allergen: string) => (
                      <div key={allergen} className="flex items-center gap-2 p-2 rounded-md border border-border">
                        <div className="w-3 h-3 rounded-full bg-primary"></div>
                        <span className="text-sm">{allergen}</span>
                      </div>
                    ))
                  ) : (
                    ['Gluten', 'Dairy', 'Nuts', 'Shellfish'].map((allergen) => (
                      <div key={allergen} className="flex items-center gap-2 p-2 rounded-md border border-border opacity-50">
                        <div className="w-3 h-3 rounded-full bg-secondary"></div>
                        <span className="text-sm">{allergen}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              <Button variant="outline" className="mt-6 w-full" size="sm" asChild>
                <Link href="/profile/allergens">
                  Customize Allergen Profile
                </Link>
              </Button>
            </div>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Recent Activity - Updated with ScanHistory component */}
          <Card className="glass-card p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Recent Scans</h2>
              <HistoryIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            
            <div className="flex-1 flex flex-col">
              <ScanHistory userId={user.id} limit={5} />
            </div>
          </Card>
          
          {/* Nutritional Preferences */}
          <Card className="glass-card p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Dietary Preferences</h2>
              <TrendingUpIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            
            <div className="flex-1 flex flex-col justify-between">
              <p className="text-muted-foreground text-sm">
                Set your dietary preferences and we'll highlight options that 
                match your lifestyle with revolutionary precision.
              </p>
              
              <div className="mt-6 space-y-4">
                {profile?.diets && Array.isArray(profile.diets) && profile.diets.length > 0 ? (
                  profile.diets.map((diet: string) => (
                    <div key={diet} className="flex items-center justify-between text-sm p-2 border border-border rounded-md">
                      <span>{diet}</span>
                      <span className="font-medium text-primary">Active</span>
                    </div>
                  ))
                ) : (
                  ['Vegetarian', 'Vegan', 'Gluten-Free'].map((preference) => (
                    <div key={preference} className="flex items-center justify-between text-sm p-2 border border-border rounded-md opacity-50">
                      <span>{preference}</span>
                      <span className="font-medium text-muted-foreground">Not set</span>
                    </div>
                  ))
                )}
              </div>
              
              <Button variant="outline" className="mt-6 w-full" size="sm" asChild>
                <Link href="/profile/nutrition">
                  Set Dietary Preferences
                </Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}