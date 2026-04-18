export const dynamic = "force-dynamic";
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, Trash2, UtensilsCrossed } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function MenusPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  const { toast } = useToast();
  const utils = trpc.useUtils();
  const menusQuery = trpc.menu.list.useQuery(undefined, { retry: false });

  const createMutation = trpc.menu.create.useMutation({
    onSuccess: () => {
      utils.menu.list.invalidate();
      setDialogOpen(false);
      setTitle("");
      setNotes("");
      toast({ title: "Menu created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = trpc.menu.delete.useMutation({
    onSuccess: () => {
      utils.menu.list.invalidate();
      toast({ title: "Menu deleted" });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Menus</h1>
          <p className="text-gray-400 mt-1">Create and manage event menus</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              <Plus className="mr-2 h-4 w-4" /> New Menu
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#111] border-[#1a1a1a]">
            <DialogHeader>
              <DialogTitle>Create New Menu</DialogTitle>
              <DialogDescription>Add a new menu for an event or general use.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-[#0a0a0a] border-[#2a2a2a]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-[#0a0a0a] border-[#2a2a2a]" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-[#2a2a2a]">Cancel</Button>
              <Button onClick={() => createMutation.mutate({ title, notes: notes || undefined })} disabled={!title || createMutation.isPending} className="bg-amber-500 hover:bg-amber-600 text-black">
                {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {menusQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : menusQuery.data?.menus.length === 0 ? (
        <Card className="bg-[#111] border-[#1a1a1a]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 mb-4">No menus found</p>
            <Button onClick={() => setDialogOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-black">
              <Plus className="mr-2 h-4 w-4" /> Create your first menu
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {menusQuery.data?.menus.map((menu) => (
            <Card key={menu.id} className="bg-[#111] border-[#1a1a1a] hover:border-amber-500/30 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{menu.title}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-red-400"
                    onClick={() => deleteMutation.mutate({ id: menu.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {menu.event && (
                  <Badge variant="secondary" className="mb-3">{menu.event.title}</Badge>
                )}
                <div className="flex items-center text-sm text-gray-400">
                  <UtensilsCrossed className="mr-2 h-4 w-4" />
                  {menu.items.length} item{menu.items.length !== 1 ? "s" : ""}
                </div>
                {menu.items.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {menu.items.slice(0, 3).map((item) => (
                      <p key={item.id} className="text-sm text-gray-500 truncate">
                        • {item.recipe.title}
                      </p>
                    ))}
                    {menu.items.length > 3 && (
                      <p className="text-sm text-gray-600">+{menu.items.length - 3} more</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
