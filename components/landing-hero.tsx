import { ScanIcon, SearchIcon, ShieldIcon } from "lucide-react";

export function LandingHero() {
  return (
    <div className="text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Snipiddy
      </h1>
      <p className="mt-2 text-lg text-primary">
        A revolutionary way to understand what's on your plate.
      </p>
      <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
        We've taken something ordinary — reading a menu — and turned it into something 
        extraordinary. Simply scan any menu, and instantly discover everything you need to 
        know about your food. One scan. Complete clarity. It's that simple.
      </p>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
        <FeatureCard
          title="Magical Scanning"
          description="Just point your camera at any menu. No typing. No searching. It just works."
          icon={ScanIcon}
        />
        <FeatureCard
          title="Unprecedented Detail"
          description="From calories to allergens, from ingredients to nutritional values — it's all there."
          icon={SearchIcon}
        />
        <FeatureCard
          title="Peace of Mind"
          description="Know exactly what you're eating. No surprises. No compromises on your health."
          icon={ShieldIcon}
        />
      </div>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="p-6 rounded-lg border bg-card text-card-foreground">
      <Icon className="w-8 h-8 mb-4 text-primary" />
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}