import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowRight, Users, Banknote, Moon, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/rides" });
  },
  head: () => ({
    meta: [
      { title: "VayaRide — Share the ride, split the fare" },
      { name: "description", content: "South Africa's lift club for after-5pm trips. Cheaper than Uber when you share with neighbours." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      <header className="px-5 py-5 flex items-center justify-between">
        <span className="font-bold text-xl text-primary">VayaRide</span>
        <Link to="/auth" className="text-sm font-medium text-primary hover:underline">Sign in</Link>
      </header>

      <section className="px-5 pt-10 pb-12 max-w-xl mx-auto text-center">
        <span className="inline-block px-3 py-1 rounded-full bg-accent/20 text-accent-foreground text-xs font-medium mb-4">
          🇿🇦 Built for South Africa
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
          Share the ride.<br /><span className="text-primary">Split the fare.</span>
        </h1>
        <p className="mt-4 text-muted-foreground text-base">
          Affordable group rides and scheduled lifts for after-5pm trips — Vaaloewer to the Vaal Triangle and beyond.
        </p>
        <Link
          to="/auth"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-primary-foreground font-semibold shadow-lg hover:bg-primary/90"
        >
          Get started <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <section className="px-5 pb-16 max-w-xl mx-auto grid sm:grid-cols-2 gap-3">
        <Feature icon={<Banknote className="h-5 w-5" />} title="Cheaper than Uber" body="Split fare with up to 4 other riders." />
        <Feature icon={<Users className="h-5 w-5" />} title="Lift clubs" body="Join scheduled rides on your usual route." />
        <Feature icon={<Moon className="h-5 w-5" />} title="After-5pm focus" body="Get home safely when other options dry up." />
        <Feature icon={<Shield className="h-5 w-5" />} title="SOS built-in" body="One tap to share your location with someone." />
      </section>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-card border p-4">
      <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-2">{icon}</div>
      <h3 className="font-semibold text-sm">{title}</h3>
      <p className="text-xs text-muted-foreground mt-1">{body}</p>
    </div>
  );
}
