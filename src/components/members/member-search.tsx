"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MemberSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);

  function apply(query: string) {
    const trimmed = query.trim();
    const params = new URLSearchParams();
    if (trimmed) params.set("q", trimmed);
    const qs = params.toString();
    router.replace(qs ? `/members?${qs}` : "/members", { scroll: false });
  }

  return (
    <form
      className="flex items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        apply(q);
      }}
    >
      <div className="relative">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" />
        <Input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search name or email…"
          aria-label="Search members"
          className="h-8 w-56 pl-8 text-xs"
        />
      </div>
      <Button type="submit" variant="outline" size="sm">
        Search
      </Button>
      {initialQuery && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => {
            setQ("");
            apply("");
          }}
        >
          Clear
        </Button>
      )}
    </form>
  );
}
