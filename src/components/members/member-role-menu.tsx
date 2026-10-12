"use client";

import { useTransition } from "react";
import { MoreHorizontalIcon } from "lucide-react";
import { toast } from "sonner";
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
import { updateMemberRole } from "@/lib/actions/members";

export function MemberRoleMenu({
  memberId,
  currentRole,
  isSelf,
}: {
  memberId: string;
  currentRole: "admin" | "user";
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (isSelf) {
    return (
      <span className="text-muted-foreground text-xs">It&apos;s you</span>
    );
  }

  function changeRole(role: "admin" | "user") {
    startTransition(async () => {
      const result = await updateMemberRole(memberId, role);
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.success) {
        toast.success(result.success);
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            aria-label="Manage member role"
          />
        }
      >
        <MoreHorizontalIcon data-icon="inline-start" />
        Manage
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Change role</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {currentRole !== "admin" && (
          <DropdownMenuItem onClick={() => changeRole("admin")}>
            Make admin
          </DropdownMenuItem>
        )}
        {currentRole !== "user" && (
          <DropdownMenuItem onClick={() => changeRole("user")}>
            Make member
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
