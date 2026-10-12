"use client";

import { MoreHorizontalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { updateMemberRole } from "@/app/(app)/members/actions";

export function MemberRoleMenu({
  memberId,
  currentRole,
  isSelf,
}: {
  memberId: string;
  currentRole: "admin" | "user";
  isSelf: boolean;
}) {
  if (isSelf) {
    return (
      <span className="text-muted-foreground text-xs">It&apos;s you</span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            aria-label="Manage member role"
          />
        }
      >
        <MoreHorizontalIcon data-icon="inline-start" />
        Manage
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Change role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {currentRole !== "admin" && (
          <DropdownMenuItem
            onClick={() => void updateMemberRole(memberId, "admin")}
          >
            Make admin
          </DropdownMenuItem>
        )}
        {currentRole !== "user" && (
          <DropdownMenuItem
            onClick={() => void updateMemberRole(memberId, "user")}
          >
            Make member
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
