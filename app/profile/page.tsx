'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

import { Textarea } from '@/components/ui/textarea'

export default function ProfilePage() {
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>({
        full_name: '',
        phone_number: '',
        email: '',
        allergens: [],
        diets: [],
        other_info: ''
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const supabase = createClient();
    const router = useRouter();

    const commonAllergens = [
        'Gluten',
        'Crustacean shellfish',
        'Fish',
        'Eggs',
        'Milk',
        'Soy',
        'Molluscs'
    ];

    const commonDiets = [
        'Vegan',
        'Vegetarian',
        'Pescetarian',
        'Ketogenic',
        'Paleo',
        'Mediterranean',
        'Low-Carb',
        'High-Protein',
        'Low-Fat',
        'Low-Sodium',
        'Low-Sugar',
    ];

    useEffect(() => {
        async function fetchUserAndProfile() {
            setLoading(true);

            // Get current user - using the same approach as header-auth
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/sign-in');
                return;
            }

            setUser(user);

            // Fetch user profile from profiles table
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('user_id', user.id)
                .single();
            
            if (data) {
                setProfile({
                    full_name: data.full_name || '',
                    phone_number: data.phone_number || '',
                    email: user.email || '',
                    allergens: data.allergens || [],
                    diets: data.diets || [],
                    other_info: data.other_info || ''
                });
            }
            
            setLoading(false);
        }
        
        fetchUserAndProfile();
    }, [router]);

    const handleSaveProfile = async () => {
        if (!user) return;
        
        setSaving(true);
        
        // Check if profile exists
        const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();
        
        if (existingProfile) {
            // Update existing profile
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: profile.full_name,
                    phone_number: profile.phone_number,
                    email: user.email,
                    allergens: profile.allergens,
                    diets: profile.diets,
                    other_info: profile.other_info,
                    updated_at: new Date()
                })
                .eq('user_id', user.id);
                
            if (error) {
                console.error('Error updating profile:', error);
                alert('Failed to update profile');
            }
        } else {
            // Create new profile
            const { error } = await supabase
                .from('profiles')
                .insert({
                    user_id: user.id,
                    full_name: profile.full_name,
                    phone_number: profile.phone_number,
                    email: user.email,
                    allergens: profile.allergens,
                    diets: profile.diets,
                    other_info: profile.other_info
                });
                
            if (error) {
                console.error('Error creating profile:', error);
                alert('Failed to create profile');
            }
        }
        
        setSaving(false);
        alert('Profile saved successfully!');
    };

    const toggleAllergen = (allergen: string) => {
        setProfile((prev: any) => ({
            ...prev,
            allergens: prev.allergens.includes(allergen)
                ? prev.allergens.filter((a: string) => a !== allergen)
                : [...prev.allergens, allergen]
        }));
    };

    const toggleDiet = (diet: string) => {
        setProfile((prev: any) => ({
            ...prev,
            diets: prev.diets.includes(diet)
                ? prev.diets.filter((d: string) => d !== diet)
                : [...prev.diets, diet]
        }));
    };

    if (loading) return <div className="p-6">Loading profile...</div>;
    if (!user) return <div className="p-6">Please sign in to view your profile.</div>;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">Your Profile</h1>
            
            <div className="bg-white shadow rounded-lg p-6 mb-6 dark:bg-gray-800">
                <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-sm font-medium mb-1">Full Name</label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                            value={profile.full_name}
                            onChange={(e) => setProfile({...profile, full_name: e.target.value})}
                            placeholder="Enter your full name"
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <input
                            type="email"
                            className="w-full p-2 border rounded-md bg-gray-100 dark:bg-gray-600 cursor-not-allowed"
                            value={user.email}
                            disabled
                            readOnly
                        />
                        <p className="text-xs text-gray-500 mt-1">Email is managed through your account settings</p>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium mb-1">Phone Number</label>
                        <input
                            type="tel"
                            className="w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                            value={profile.phone_number}
                            onChange={(e) => setProfile({...profile, phone_number: e.target.value})}
                            placeholder="Enter your phone number"
                        />
                    </div>
                </div>
                
                <h2 className="text-xl font-semibold mb-4">Allergens</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                    {commonAllergens.map(allergen => (
                        <div 
                            key={allergen}
                            className={`p-3 border rounded-md cursor-pointer ${
                                profile.allergens.includes(allergen) 
                                    ? 'bg-blue-100 border-blue-500 dark:bg-blue-900 dark:border-blue-400' 
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                            onClick={() => toggleAllergen(allergen)}
                        >
                            {allergen}
                        </div>
                    ))}
                </div>
                
                <h2 className="text-xl font-semibold mb-4">Dietary Preferences</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                    {commonDiets.map(diet => (
                        <div 
                            key={diet}
                            className={`p-3 border rounded-md cursor-pointer ${
                                profile.diets.includes(diet) 
                                    ? 'bg-blue-100 border-blue-500 dark:bg-blue-900 dark:border-blue-400' 
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                            onClick={() => toggleDiet(diet)}
                        >
                            {diet}
                        </div>
                    ))}
                </div>
                
                <h2 className="text-xl font-semibold mb-4">Additional Information</h2>
                <Textarea
                    className="w-full p-3 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                    rows={4}
                    placeholder="Any other dietary restrictions or preferences..."
                    value={profile.other_info}
                    onChange={(e: any) => setProfile({...profile, other_info: e.target.value})}
                />
                
                <div className="mt-6">
                    <Button
                        onClick={handleSaveProfile}
                        disabled={saving}
                    >
                        {saving ? 'Saving...' : 'Save Profile'}
                    </Button>
                </div>
            </div>
            
            <div className="text-center">
                <Button
                    variant="outline"
                    onClick={() => router.push('/dashboard')}
                >
                    Back to Dashboard
                </Button>
            </div>
        </div>
    );
}