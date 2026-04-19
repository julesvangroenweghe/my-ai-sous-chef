"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, Trash2, UtensilsCrossed, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function MenusPage() {
 const supabase = createClient();
 const [dialogOpen, setDialogOpen] = useState(false);
 const [title, setTitle] = useState("");
 const [notes, setNotes] = useState("");
 const [menus, setMenus] = useState<any[]>([]);
 const [loading, setLoading] = useState(true);
 const [creating, setCreating] = useState(false);

 const fetchMenus = useCallback(async () => {
 setLoading(true);
 const { data } = await supabase
 .from("events")
 .select("*")
 .order("created_at", { ascending: false });
 setMenus(data ?? []);
 setLoading(false);
 }, []);

 useEffect(() => { fetchMenus(); }, [fetchMenus]);

 const handleCreate = async () => {
 if (!title) return;
 setCreating(true);
 await supabase.from("events").insert({
 name: title,
 notes: notes || null,
 status: "draft",
 event_date: new Date().toISOString(),
 });
 setTitle("");
 setNotes("");
 setDialogOpen(false);
 setCreating(false);
 fetchMenus();
 };

 const handleDelete = async (id: string) => {
 await supabase.from("events").delete().eq("id", id);
 fetchMenus();
 };

 return (
 <div className="space-y-6">
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h1 className="text-3xl font-bold tracking-tight">Menus</h1>
 <p className="text-gray-400 mt-1">Create and manage event menus</p>
 </div>
 <Button
 onClick={() => setDialogOpen(true)}
 className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
 >
 <Plus className="mr-2 h-4 w-4" /> New Menu
 </Button>
 </div>

 {dialogOpen && (
 <Card className="bg-[#111] border-amber-500/30">
 <CardHeader className="flex flex-row items-center justify-between">
 <CardTitle>Create New Menu</CardTitle>
 <Button variant="ghost" size="icon" onClick={() => setDialogOpen(false)}>
 <X className="h-4 w-4" />
 </Button>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="space-y-2">
 <Label htmlFor="title">Title *</Label>
 <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-[#0a0a0a] border-[#2a2a2a]" />
 </div>
 <div className="space-y-2">
 <Label htmlFor="notes">Notes</Label>
 <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-[#0a0a0a] border-[#2a2a2a]" />
 </div>
 <div className="flex gap-2 justify-end">
 <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-[#2a2a2a]">Cancel</Button>
 <Button onClick={handleCreate} disabled={!title || creating} className="bg-amber-500 hover:bg-amber-600 text-black">
 {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
 Create
 </Button>
 </div>
 </CardContent>
 </Card>
 )}

 {loading ? (
 <div className="flex justify-center py-12">
 <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
 </div>
 ) : menus.length === 0 ? (
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
 {menus.map((menu) => (
 <Card key={menu.id} className="bg-[#111] border-[#1a1a1a] hover:border-amber-500/30 transition-colors">
 <CardHeader className="pb-3">
 <div className="flex items-start justify-between">
 <CardTitle className="text-lg">{menu.name}</CardTitle>
 <Button
 variant="ghost"
 size="icon"
 className="h-8 w-8 text-gray-500 hover:text-red-400"
 onClick={() => handleDelete(menu.id)}
 >
 <Trash2 className="h-4 w-4" />
 </Button>
 </div>
 </CardHeader>
 <CardContent>
 <div className="flex items-center text-sm text-gray-400">
 <UtensilsCrossed className="mr-2 h-4 w-4" />
 {menu.event_type ?? "General"} · {menu.guest_count ?? 0} guests
 </div>
 {menu.notes && (
 <p className="text-sm text-gray-500 mt-2 truncate">{menu.notes}</p>
 )}
 <span className={`text-xs px-2 py-1 rounded-full mt-3 inline-block ${
 menu.status === "confirmed" ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500"
 }`}>
 {menu.status}
 </span>
 </CardContent>
 </Card>
 ))}
 </div>
 )}
 </div>
 );
}
