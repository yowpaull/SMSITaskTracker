"use client";

import Link from "next/link";
import { LogOut, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSignOut } from "@/components/layout/sign-out-button";
import { cn } from "cn";

function initials(name: string, email: string) {
  const source = name.trim() || email;
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function UserMenu({
  fullName,
  email,
  role,
  className,
}: {
  fullName: string;
  email: string;
  role: "admin" | "user";
  className?: string;
}) {
  const { signOutNow } = useSignOut();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className={cn("w-full justify-start gap-2", className)}
            aria-label="Open account menu"
          />
        }
      >
        <Avatar className="size-6 shrink-0">
          <AvatarFallback className="bg-accent text-xs text-accent-foreground">
            {initials(fullName, email)}
          </AvatarFallback>
        </Avatar>
        <span className="truncate text-sm group-data-[collapsible=icon]:hidden">
          {fullName || email}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <p className="truncate text-sm font-medium">{fullName || email}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
            <p className="mt-0.5 text-xs capitalize text-muted-foreground">
              {role}
            </p>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/profile" />}>
          <User data-icon="inline-start" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOutNow}>
          <LogOut data-icon="inline-start" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
