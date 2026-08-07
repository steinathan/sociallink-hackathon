"use client";

import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { listAllUsers, setUserBanStatus } from "@/actions/admin.actions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Users,
  Search,
  Ban,
  CheckCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface UserRecord {
  id: string;
  phoneNumber: string;
  role: string;
  banned?: boolean;
  createdAt: { toDate: () => Date } | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [banLoading, setBanLoading] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<"ALL" | "MEMBER" | "CONSULTANT">("ALL");

  const load = useCallback(async (filter?: "MEMBER" | "CONSULTANT") => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const idToken = await user.getIdToken();
      const result = await listAllUsers(idToken, filter);
      if (result.success && result.users) {
        setUsers(result.users as unknown as UserRecord[]);
      }
    } catch {
      toast.error("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(roleFilter === "ALL" ? undefined : roleFilter);
  }, [load, roleFilter]);

  async function handleToggleBan(uid: string, currentlyBanned: boolean) {
    setBanLoading(uid);
    try {
      const user = auth.currentUser;
      if (!user) return;
      const idToken = await user.getIdToken();
      const result = await setUserBanStatus(idToken, uid, !currentlyBanned);
      if (!result.success) {
        toast.error(result.error ?? "Failed.");
        return;
      }
      toast.success(currentlyBanned ? "User unbanned." : "User banned.");
      setUsers((prev) =>
        prev.map((u) =>
          u.id === uid ? { ...u, banned: !currentlyBanned } : u
        )
      );
    } catch {
      toast.error("Unexpected error.");
    } finally {
      setBanLoading(null);
    }
  }

  const filtered = users.filter((u) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      u.id.toLowerCase().includes(s) ||
      u.phoneNumber?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-muted-foreground">
            Manage all platform members and consultants.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => load(roleFilter === "ALL" ? undefined : roleFilter)}
          disabled={loading}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by UID or phone..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <Tabs
        value={roleFilter}
        onValueChange={(v) => setRoleFilter(v as typeof roleFilter)}
      >
        <TabsList>
          <TabsTrigger value="ALL">All</TabsTrigger>
          <TabsTrigger value="MEMBER">Members</TabsTrigger>
          <TabsTrigger value="CONSULTANT">Consultants</TabsTrigger>
        </TabsList>

        <TabsContent value={roleFilter} className="mt-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <Users className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
              <p className="text-muted-foreground">No users found.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((u) => (
                <Card
                  key={u.id}
                  className={u.banned ? "border-destructive/30 opacity-70" : ""}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-mono text-sm font-medium truncate max-w-[180px]">
                          {u.phoneNumber ?? u.id}
                        </p>
                        <Badge
                          variant={
                            u.role === "CONSULTANT" ? "default" : "secondary"
                          }
                          className="text-xs"
                        >
                          {u.role}
                        </Badge>
                        {u.banned && (
                          <Badge variant="destructive" className="text-xs">
                            BANNED
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {u.createdAt
                          ? `Joined ${formatDistanceToNow(u.createdAt.toDate(), { addSuffix: true })}`
                          : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant={u.banned ? "outline" : "destructive"}
                      onClick={() => handleToggleBan(u.id, !!u.banned)}
                      disabled={banLoading === u.id}
                      className="shrink-0"
                    >
                      {banLoading === u.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : u.banned ? (
                        <>
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Unban
                        </>
                      ) : (
                        <>
                          <Ban className="mr-1 h-3 w-3" />
                          Ban
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
