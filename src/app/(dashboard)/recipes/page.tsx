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
import { Plus, Search, Clock, Users, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function RecipesPage() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [course, setCourse] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [cookTime, setCookTime] = useState("");
  const [servings, setServings] = useState("4");
  const [instructions, setInstructions] = useState("");

  const { toast } = useToast();
  const utils = trpc.useUtils();
  const recipesQuery = trpc.recipe.list.useQuery(
    { search: search || undefined },
    { retry: false }
  );

  const createMutation = trpc.recipe.create.useMutation({
    onSuccess: () => {
      utils.recipe.list.invalidate();
      setDialogOpen(false);
      resetForm();
      toast({ title: "Recipe created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = trpc.recipe.delete.useMutation({
    onSuccess: () => {
      utils.recipe.list.invalidate();
      toast({ title: "Recipe deleted" });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCuisine("");
    setCourse("");
    setPrepTime("");
    setCookTime("");
    setServings("4");
    setInstructions("");
  };

  const handleCreate = () => {
    createMutation.mutate({
      title,
      description: description || undefined,
      cuisine: cuisine || undefined,
      course: course || undefined,
      prepTime: prepTime ? parseInt(prepTime) : undefined,
      cookTime: cookTime ? parseInt(cookTime) : undefined,
      servings: servings ? parseInt(servings) : undefined,
      instructions: instructions || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recipes</h1>
          <p className="text-gray-400 mt-1">Manage your recipe collection</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              <Plus className="mr-2 h-4 w-4" /> New Recipe
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#111] border-[#1a1a1a] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Recipe</DialogTitle>
              <DialogDescription>Add a new recipe to your collection.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-[#0a0a0a] border-[#2a2a2a]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-[#0a0a0a] border-[#2a2a2a]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cuisine">Cuisine</Label>
                  <Input id="cuisine" value={cuisine} onChange={(e) => setCuisine(e.target.value)} placeholder="e.g. Italian" className="bg-[#0a0a0a] border-[#2a2a2a]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course">Course</Label>
                  <Input id="course" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="e.g. Main" className="bg-[#0a0a0a] border-[#2a2a2a]" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prep">Prep (min)</Label>
                  <Input id="prep" type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} className="bg-[#0a0a0a] border-[#2a2a2a]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cook">Cook (min)</Label>
                  <Input id="cook" type="number" value={cookTime} onChange={(e) => setCookTime(e.target.value)} className="bg-[#0a0a0a] border-[#2a2a2a]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="servings">Servings</Label>
                  <Input id="servings" type="number" value={servings} onChange={(e) => setServings(e.target.value)} className="bg-[#0a0a0a] border-[#2a2a2a]" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea id="instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={5} className="bg-[#0a0a0a] border-[#2a2a2a]" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-[#2a2a2a]">Cancel</Button>
              <Button onClick={handleCreate} disabled={!title || createMutation.isPending} className="bg-amber-500 hover:bg-amber-600 text-black">
                {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search recipes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-[#111] border-[#1a1a1a]"
        />
      </div>

      {recipesQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : recipesQuery.data?.recipes.length === 0 ? (
        <Card className="bg-[#111] border-[#1a1a1a]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 mb-4">No recipes found</p>
            <Button onClick={() => setDialogOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-black">
              <Plus className="mr-2 h-4 w-4" /> Create your first recipe
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipesQuery.data?.recipes.map((recipe) => (
            <Card key={recipe.id} className="bg-[#111] border-[#1a1a1a] hover:border-amber-500/30 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{recipe.title}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-red-400"
                    onClick={() => deleteMutation.mutate({ id: recipe.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {recipe.description && (
                  <p className="text-sm text-gray-500 line-clamp-2">{recipe.description}</p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-3">
                  {recipe.cuisine && <Badge variant="secondary">{recipe.cuisine}</Badge>}
                  {recipe.course && <Badge variant="outline">{recipe.course}</Badge>}
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  {(recipe.prepTime || recipe.cookTime) && (
                    <div className="flex items-center">
                      <Clock className="mr-1 h-3.5 w-3.5" />
                      {(recipe.prepTime ?? 0) + (recipe.cookTime ?? 0)} min
                    </div>
                  )}
                  {recipe.servings && (
                    <div className="flex items-center">
                      <Users className="mr-1 h-3.5 w-3.5" />
                      {recipe.servings} servings
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
