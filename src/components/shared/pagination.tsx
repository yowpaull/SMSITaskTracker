import Link from "next/link";
import { Button } from "@/components/ui/button";

export function getPageItems(
  current: number,
  total: number,
): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }
  const pages = new Set<number>([1, total, current - 1, current, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (current >= total - 2) {
    [total - 1, total - 2, total - 3].forEach((p) => pages.add(p));
  }
  const sorted = [...pages]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const items: Array<number | "ellipsis"> = [];
  let prev = 0;
  for (const p of sorted) {
    if (p - prev > 1) items.push("ellipsis");
    items.push(p);
    prev = p;
  }
  return items;
}

export function Pagination({
  page,
  totalPages,
  buildHref,
}: {
  page: number;
  totalPages: number;
  buildHref: (page: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-end">
      <nav className="flex items-center gap-1" aria-label="Pagination">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          nativeButton={false}
          render={<Link href={buildHref(Math.max(1, page - 1))} />}
        >
          Previous
        </Button>
        {getPageItems(page, totalPages).map((item, index) =>
          typeof item === "number" ? (
            <Button
              key={item}
              variant={item === page ? "default" : "outline"}
              size="sm"
              className="px-2.5"
              aria-current={item === page ? "page" : undefined}
              nativeButton={false}
              render={<Link href={buildHref(item)} />}
            >
              {item}
            </Button>
          ) : (
            <span
              key={`ellipsis-${index}`}
              className="px-1 text-muted-foreground text-xs"
              aria-hidden="true"
            >
              …
            </span>
          ),
        )}
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          nativeButton={false}
          render={<Link href={buildHref(Math.min(totalPages, page + 1))} />}
        >
          Next
        </Button>
      </nav>
    </div>
  );
}
