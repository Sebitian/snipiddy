import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserProfile } from "@/components/user-profile";
import { LandingHero } from "@/components/landing-hero";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16">
        <LandingHero />
        <div className="flex gap-4 mt-8">
          <Button asChild variant="outline">
            <Link href="/sign-in">Sign In</Link>
          </Button>
          <Button asChild>
            <Link href="/sign-up">Get Started</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col gap-6 px-4 py-8">
      <UserProfile user={user} />
    </main>
  );
}