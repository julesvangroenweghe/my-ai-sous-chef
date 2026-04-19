"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
 Settings, Users, CreditCard, Building, ChefHat, Check,
 UtensilsCrossed, Store, CalendarDays, Truck, Building2
} from "lucide-react";
import { useKitchen } from "@/providers/kitchen-provider";
import { createClient } from "@/lib/supabase/client";
import type { KitchenType } from "@/types/database";

const kitchenModes: {
 type: KitchenType;
 label: string;
 description: string;
 icon: React.ReactNode;
 color: string;
 targets: string;
}[] = [
 {
 type: 'restaurant',
 label: 'Restaurant',
 description: 'Vaste menukaart, dagschotels, à la carte service',
 icon: <UtensilsCrossed className="w-6 h-6" />,
 color: 'border-amber-500/50 bg-amber-500/5',
 targets: '28-32%',
 },
 {
 type: 'brasserie',
 label: 'Brasserie',
 description: 'Mix van vaste kaart en dagelijks wisselende suggesties',
 icon: <Store className="w-6 h-6" />,
 color: 'border-yellow-500/50 bg-yellow-500/5',
 targets: '28-35%',
 },
 {
 type: 'catering',
 label: 'Catering',
 description: 'Event-driven, variabele volumes per opdracht',
 icon: <CalendarDays className="w-6 h-6" />,
 color: 'border-orange-500/50 bg-orange-500/5',
 targets: '25-30%',
 },
 {
 type: 'foodtruck',
 label: 'Foodtruck',
 description: 'Compact menu, hoge turnover, locatie-gebonden',
 icon: <Truck className="w-6 h-6" />,
 color: 'border-green-500/50 bg-green-500/5',
 targets: '20-25%',
 },
 {
 type: 'hotel',
 label: 'Hotel',
 description: 'Meerdere outlets, ontbijt/lunch/diner, banqueting',
 icon: <Building2 className="w-6 h-6" />,
 color: 'border-blue-500/50 bg-blue-500/5',
 targets: '25-32%',
 },
 {
 type: 'dark_kitchen',
 label: 'Dark Kitchen',
 description: 'Delivery-only, multi-brand concepten',
 icon: <ChefHat className="w-6 h-6" />,
 color: 'border-purple-500/50 bg-purple-500/5',
 targets: '22-28%',
 },
];

export default function SettingsPage() {
 const { kitchen, kitchenType, settings, refetch } = useKitchen();
 const [kitchenName, setKitchenName] = useState("");
 const [selectedType, setSelectedType] = useState<KitchenType>("restaurant");
 const [foodCostMin, setFoodCostMin] = useState(28);
 const [foodCostMax, setFoodCostMax] = useState(32);
 const [saving, setSaving] = useState(false);
 const [saved, setSaved] = useState(false);
 const supabase = createClient();

 useEffect(() => {
 if (kitchen) {
 setKitchenName(kitchen.name);
 setSelectedType(kitchen.type);
 setFoodCostMin(settings?.food_cost_target_min ?? 28);
 setFoodCostMax(settings?.food_cost_target_max ?? 32);
 }
 }, [kitchen, settings]);

 const handleSave = async () => {
 if (!kitchen) return;
 setSaving(true);
 setSaved(false);

 // Find the mode defaults for the selected type
 const mode = kitchenModes.find(m => m.type === selectedType);
 const [targetMin, targetMax] = mode?.targets.replace('%', '').split('-').map(Number) || [foodCostMin, foodCostMax];
 
 // Build new settings
 const newSettings = {
 ...(settings || {}),
 mode: selectedType,
 food_cost_target_min: foodCostMin,
 food_cost_target_max: foodCostMax,
 // Update features based on type
 features: getDefaultFeatures(selectedType),
 };

 const { error } = await supabase
 .from('kitchens')
 .update({
 name: kitchenName,
 type: selectedType,
 settings: newSettings,
 })
 .eq('id', kitchen.id);

 if (!error) {
 await refetch();
 setSaved(true);
 setTimeout(() => setSaved(false), 3000);
 }

 setSaving(false);
 };

 const handleModeSelect = (type: KitchenType) => {
 setSelectedType(type);
 const mode = kitchenModes.find(m => m.type === type);
 if (mode) {
 const [min, max] = mode.targets.replace('%', '').split('-').map(Number);
 setFoodCostMin(min);
 setFoodCostMax(max);
 }
 };

 return (
 <div className="space-y-8">
 <div>
 <h1 className="text-2xl font-display font-bold text-stone-100">Instellingen</h1>
 <p className="text-stone-400 mt-1">Beheer je keuken, team en abonnement</p>
 </div>

 <div className="grid gap-6">
 {/* Kitchen Mode Selector */}
 <Card className="bg-stone-900/50 border-stone-800">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-stone-100">
 <ChefHat className="h-5 w-5 text-brand-400" /> Keuken Modus
 </CardTitle>
 <CardDescription className="text-stone-400">
 Kies je type keuken — dit bepaalt welke workflows en navigatie je ziet. 
 Je kan meerdere keukens aanmaken met verschillende types.
 </CardDescription>
 </CardHeader>
 <CardContent>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
 {kitchenModes.map((mode) => {
 const isSelected = selectedType === mode.type;
 return (
 <button
 key={mode.type}
 onClick={() => handleModeSelect(mode.type)}
 className={`
 relative flex flex-col items-start gap-2 p-4 rounded-xl border-2 
 transition-all duration-200 text-left
 ${isSelected 
 ? `${mode.color} border-opacity-100 ring-1 ring-white/10` 
 : 'border-stone-700/50 bg-stone-800/30 hover:border-stone-600 hover:bg-stone-800/50'
 }
 `}
 >
 {isSelected && (
 <div className="absolute top-2 right-2">
 <Check className="w-4 h-4 text-brand-400" />
 </div>
 )}
 <div className={`${isSelected ? 'text-white' : 'text-stone-400'}`}>
 {mode.icon}
 </div>
 <div>
 <div className={`font-semibold text-sm ${isSelected ? 'text-white' : 'text-stone-300'}`}>
 {mode.label}
 </div>
 <div className="text-xs text-stone-500 mt-0.5">{mode.description}</div>
 </div>
 <div className="text-[10px] text-stone-500 font-mono">
 FC target: {mode.targets}
 </div>
 </button>
 );
 })}
 </div>
 </CardContent>
 </Card>

 {/* Kitchen Info */}
 <Card className="bg-stone-900/50 border-stone-800">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-stone-100">
 <Building className="h-5 w-5 text-stone-400" /> Keuken Informatie
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label className="text-stone-300">Keuken Naam</Label>
 <Input 
 value={kitchenName}
 onChange={(e) => setKitchenName(e.target.value)}
 className="bg-stone-800 border-stone-700 text-stone-100"
 placeholder="Mijn Restaurant"
 />
 </div>
 <div className="space-y-2">
 <Label className="text-stone-300">Type</Label>
 <div className="flex items-center gap-2 h-10 px-3 rounded-md bg-stone-800 border border-stone-700">
 <Badge variant="outline" className="text-brand-400 border-brand-400/30">
 {kitchenModes.find(m => m.type === selectedType)?.label || selectedType}
 </Badge>
 <span className="text-xs text-stone-500">Selecteer hierboven</span>
 </div>
 </div>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label className="text-stone-300">Food Cost Target Min %</Label>
 <Input 
 type="number" 
 value={foodCostMin}
 onChange={(e) => setFoodCostMin(Number(e.target.value))}
 className="bg-stone-800 border-stone-700 text-stone-100"
 min={10} max={50}
 />
 </div>
 <div className="space-y-2">
 <Label className="text-stone-300">Food Cost Target Max %</Label>
 <Input 
 type="number" 
 value={foodCostMax}
 onChange={(e) => setFoodCostMax(Number(e.target.value))}
 className="bg-stone-800 border-stone-700 text-stone-100"
 min={10} max={50}
 />
 </div>
 </div>
 <Button 
 onClick={handleSave} 
 disabled={saving}
 className="bg-brand-600 hover:bg-brand-700 text-white"
 >
 {saving ? 'Opslaan...' : saved ? ' Opgeslagen!' : 'Opslaan'}
 </Button>
 </CardContent>
 </Card>

 {/* Team */}
 <Card className="bg-stone-900/50 border-stone-800">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-stone-100">
 <Users className="h-5 w-5 text-stone-400" /> Team
 </CardTitle>
 <CardDescription className="text-stone-400">
 Beheer wie toegang heeft tot deze keuken
 </CardDescription>
 </CardHeader>
 <CardContent>
 <p className="text-stone-500 mb-4">Nog geen teamleden toegevoegd.</p>
 <Button variant="outline" className="border-stone-700 text-stone-300 hover:bg-stone-800">
 Chef Uitnodigen
 </Button>
 </CardContent>
 </Card>

 {/* Billing */}
 <Card className="bg-stone-900/50 border-stone-800">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-stone-100">
 <CreditCard className="h-5 w-5 text-stone-400" /> Abonnement
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="flex items-center gap-2 mb-4">
 <span className="font-medium text-stone-300">Huidig plan:</span>
 <Badge className="bg-stone-700 text-stone-300">Free</Badge>
 </div>
 <Button className="bg-brand-600 hover:bg-brand-700 text-white">
 Upgrade Plan
 </Button>
 </CardContent>
 </Card>
 </div>
 </div>
 );
}

function getDefaultFeatures(type: KitchenType): string[] {
 const featureMap: Record<string, string[]> = {
 restaurant: ['dashboard', 'recipes', 'menu', 'ingredients', 'mep', 'invoices', 'food_cost', 'jules_ai'],
 brasserie: ['dashboard', 'recipes', 'suggestions', 'ingredients', 'mep', 'invoices', 'food_cost', 'jules_ai'],
 catering: ['dashboard', 'recipes', 'events', 'ingredients', 'mep', 'invoices', 'food_cost', 'jules_ai'],
 foodtruck: ['dashboard', 'recipes', 'ingredients', 'daily_prep', 'invoices', 'food_cost'],
 hotel: ['dashboard', 'recipes', 'outlets', 'events', 'ingredients', 'mep', 'invoices', 'food_cost', 'jules_ai'],
 dark_kitchen: ['dashboard', 'recipes', 'brands', 'ingredients', 'daily_prep', 'invoices', 'food_cost'],
 };
 return featureMap[type] || featureMap.restaurant;
}
