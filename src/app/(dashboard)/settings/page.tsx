"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
 Settings, Users, CreditCard, Building, ChefHat, Check,
 UtensilsCrossed, Store, CalendarDays, Truck, Building2,
 Link2, RefreshCw, AlertCircle
} from "lucide-react";
import { useKitchen } from "@/providers/kitchen-provider";
import { useGoogleIntegration } from "@/hooks/use-google-integration";
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
 <h1 className="text-2xl font-display font-extrabold text-[#2C1810]">Instellingen</h1>
 <p className="text-[#9E7E60] mt-1">Beheer je keuken, team en abonnement</p>
 </div>

 <div className="grid gap-6">
 {/* Keuken Modus Selector */}
 <Card className="bg-[#FDFAF6]/80 border-[#E8D5B5]">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-[#2C1810]">
 <ChefHat className="h-5 w-5 text-brand-400" /> Keuken Modus
 </CardTitle>
 <CardDescription className="text-[#9E7E60]">
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
 : 'border-[#E8D5B5]/60 bg-white/30 hover:border-[#D4B896] hover:bg-[#FDF8F2]/80'
 }
 `}
 >
 {isSelected && (
 <div className="absolute top-2 right-2">
 <Check className="w-4 h-4 text-brand-400" />
 </div>
 )}
 <div className={`${isSelected ? 'text-[#2C1810]' : 'text-[#9E7E60]'}`}>
 {mode.icon}
 </div>
 <div>
 <div className={`font-semibold text-sm ${isSelected ? 'text-[#2C1810]' : 'text-[#5C4730]'}`}>
 {mode.label}
 </div>
 <div className="text-xs text-[#B8997A] mt-0.5">{mode.description}</div>
 </div>
 <div className="text-[10px] text-[#B8997A] font-mono">
 FC target: {mode.targets}
 </div>
 </button>
 );
 })}
 </div>
 </CardContent>
 </Card>

 {/* Kitchen Info */}
 <Card className="bg-[#FDFAF6]/80 border-[#E8D5B5]">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-[#2C1810]">
 <Building className="h-5 w-5 text-[#9E7E60]" /> Keuken Informatie
 </CardTitle>
 </CardHeader>
 <CardContent className="space-y-4">
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label className="text-[#5C4730]">Keuken Naam</Label>
 <Input 
 value={kitchenName}
 onChange={(e) => setKitchenName(e.target.value)}
 className="bg-white border-[#E8D5B5] text-[#2C1810]"
 placeholder="Mijn Restaurant"
 />
 </div>
 <div className="space-y-2">
 <Label className="text-[#5C4730]">Type</Label>
 <div className="flex items-center gap-2 h-10 px-3 rounded-md bg-white border border-[#E8D5B5]">
 <Badge variant="outline" className="text-brand-400 border-brand-400/30">
 {kitchenModes.find(m => m.type === selectedType)?.label || selectedType}
 </Badge>
 <span className="text-xs text-[#B8997A]">Selecteer hierboven</span>
 </div>
 </div>
 </div>
 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label className="text-[#5C4730]">Food Cost Doelstelling Min %</Label>
 <Input 
 type="number" 
 value={foodCostMin}
 onChange={(e) => setFoodCostMin(Number(e.target.value))}
 className="bg-white border-[#E8D5B5] text-[#2C1810]"
 min={10} max={50}
 />
 </div>
 <div className="space-y-2">
 <Label className="text-[#5C4730]">Food Cost Doelstelling Max %</Label>
 <Input 
 type="number" 
 value={foodCostMax}
 onChange={(e) => setFoodCostMax(Number(e.target.value))}
 className="bg-white border-[#E8D5B5] text-[#2C1810]"
 min={10} max={50}
 />
 </div>
 </div>
 <Button 
 onClick={handleSave} 
 disabled={saving}
 className="bg-brand-600 hover:bg-brand-700 text-[#2C1810]"
 >
 {saving ? 'Opslaan...' : saved ? ' Opgeslagen!' : 'Opslaan'}
 </Button>
 </CardContent>
 </Card>

        {/* Integrations */}
        <GoogleIntegrationCard />

 {/* Team */}
 <Card className="bg-[#FDFAF6]/80 border-[#E8D5B5]">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-[#2C1810]">
 <Users className="h-5 w-5 text-[#9E7E60]" /> Team
 </CardTitle>
 <CardDescription className="text-[#9E7E60]">
 Beheer wie toegang heeft tot deze keuken
 </CardDescription>
 </CardHeader>
 <CardContent>
 <p className="text-[#B8997A] mb-4">Nog geen teamleden toegevoegd.</p>
 <Button variant="outline" className="border-[#E8D5B5] text-[#5C4730] hover:bg-white">
 Chef Uitnodigen
 </Button>
 </CardContent>
 </Card>

 {/* Billing */}
 <Card className="bg-[#FDFAF6]/80 border-[#E8D5B5]">
 <CardHeader>
 <CardTitle className="flex items-center gap-2 text-[#2C1810]">
 <CreditCard className="h-5 w-5 text-[#9E7E60]" /> Abonnement
 </CardTitle>
 </CardHeader>
 <CardContent>
 <div className="flex items-center gap-2 mb-4">
 <span className="font-medium text-[#5C4730]">Huidig plan:</span>
 <Badge className="bg-[#FDF8F2] text-[#5C4730]">Free</Badge>
 </div>
 <Button className="bg-brand-600 hover:bg-brand-700 text-[#2C1810]">
 Upgrade Plan
 </Button>
 </CardContent>
 </Card>
 </div>
 </div>
 );
}

function GoogleIntegrationCard() {
  const {
    connected, email, status, last_synced,
    loading, syncing, disconnecting,
    connect, disconnect, syncCalendar,
  } = useGoogleIntegration();

  const needsReauth = status === 'needs_reauth';

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Nooit';
    const d = new Date(dateStr);
    return d.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="bg-[#FDFAF6]/80 border-[#E8D5B5]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-[#2C1810]">
          <Link2 className="h-5 w-5 text-[#9E7E60]" /> Integraties
        </CardTitle>
        <CardDescription className="text-[#9E7E60]">
          Koppel externe diensten aan je keuken
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-[#E8D5B5]/60 bg-white/30 p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              {/* Google icon */}
              <div className="w-10 h-10 rounded-lg bg-white/5 border border-[#E8D5B5]/60 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#3D2810] text-sm">Google</span>
                  {loading ? (
                    <Badge variant="outline" className="text-[#B8997A] border-[#D4B896] text-[10px]">Laden...</Badge>
                  ) : connected && !needsReauth ? (
                    <Badge className="bg-green-500/10 text-green-400 border border-green-500/20 text-[10px]">Actief</Badge>
                  ) : needsReauth ? (
                    <Badge className="bg-orange-500/10 text-orange-400 border border-orange-500/20 text-[10px]">Herconnectie nodig</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[#B8997A] border-[#D4B896] text-[10px]">Niet gekoppeld</Badge>
                  )}
                </div>
                {connected && email && (
                  <p className="text-[#9E7E60] text-xs mt-1">{email}</p>
                )}
                {connected && (
                  <p className="text-[#B8997A] text-[11px] mt-0.5">
                    Laatste sync: {formatDate(last_synced)}
                  </p>
                )}
                {!connected && !loading && (
                  <p className="text-[#B8997A] text-xs mt-1">
                    Calendar, Gmail en contactgegevens
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {connected && !needsReauth && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => syncCalendar()}
                    disabled={syncing}
                    className="border-[#E8D5B5] text-[#5C4730] hover:bg-white h-8 text-xs"
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                    Sync
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={disconnect}
                    disabled={disconnecting}
                    className="border-[#E8D5B5] text-red-400 hover:bg-red-500/10 hover:border-red-500/30 h-8 text-xs"
                  >
                    {disconnecting ? 'Ontkoppelen...' : 'Ontkoppel'}
                  </Button>
                </>
              )}
              {needsReauth && (
                <Button
                  size="sm"
                  onClick={connect}
                  className="bg-orange-600 hover:bg-orange-700 text-[#2C1810] h-8 text-xs"
                >
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Herconnecteer
                </Button>
              )}
              {!connected && !loading && (
                <Button
                  size="sm"
                  onClick={connect}
                  className="bg-brand-600 hover:bg-brand-700 text-[#2C1810] h-8 text-xs"
                >
                  Koppel Google
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getDefaultFeatures(type: KitchenType): string[] {
 const featureMap: Record<string, string[]> = {
 restaurant: ['dashboard', 'recipes', 'menu', 'ingredients', 'mep', 'invoices', 'food_cost', 'jules_ai'],
 brasserie: ['dashboard', 'recipes', 'suggestions', 'ingredients', 'mep', 'invoices', 'food_cost', 'jules_ai'],
 catering: ['dashboard', 'recipes', 'events', 'calendar', 'ingredients', 'mep', 'invoices', 'food_cost', 'jules_ai'],
 foodtruck: ['dashboard', 'recipes', 'ingredients', 'daily_prep', 'invoices', 'food_cost'],
 hotel: ['dashboard', 'recipes', 'outlets', 'events', 'calendar', 'ingredients', 'mep', 'invoices', 'food_cost', 'jules_ai'],
 dark_kitchen: ['dashboard', 'recipes', 'brands', 'ingredients', 'daily_prep', 'invoices', 'food_cost'],
 };
 return featureMap[type] || featureMap.restaurant;
}
