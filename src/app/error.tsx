"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
      <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
      <p className="text-muted-foreground mb-6">An unexpected error occurred.</p>
      <div className="flex gap-3">
        <Button onClick={reset}>Try Again</Button>
        <Link href="/"><Button variant="secondary">Home</Button></Link>
      </div>
    </div>
  );
}
