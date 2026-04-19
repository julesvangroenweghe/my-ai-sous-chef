"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChefHat, Loader2 } from "lucide-react";

export default function RegisterPage() {
 const [fullName, setFullName] = useState("");
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [error, setError] = useState<string | null>(null);
 const [loading, setLoading] = useState(false);
 const router = useRouter();
 const supabase = createClient();

 const handleRegister = async (e: React.FormEvent) => {
 e.preventDefault();
 setLoading(true);
 setError(null);

 try {
 const { error } = await supabase.auth.signUp({
 email,
 password,
 options: {
 data: { full_name: fullName },
 emailRedirectTo: `${window.location.origin}/callback`,
 },
 });
 if (error) throw error;
 router.push("/dashboard");
 router.refresh();
 } catch (err) {
 setError(err instanceof Error ? err.message : "Failed to create account");
 } finally {
 setLoading(false);
 }
 };

 return (
 <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4">
 <Card className="w-full max-w-md bg-[#111] border-[#1a1a1a]">
 <CardHeader className="text-center">
 <div className="flex justify-center mb-4">
 <ChefHat className="h-10 w-10 text-amber-500" />
 </div>
 <CardTitle className="text-2xl">Create an account</CardTitle>
 <CardDescription>Start managing your kitchen today</CardDescription>
 </CardHeader>
 <CardContent>
 <form onSubmit={handleRegister} className="space-y-4">
 {error && (
 <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
 {error}
 </div>
 )}
 <div className="space-y-2">
 <Label htmlFor="fullName">Full Name</Label>
 <Input
 id="fullName"
 type="text"
 placeholder="Chef Gordon"
 value={fullName}
 onChange={(e) => setFullName(e.target.value)}
 required
 className="bg-[#0a0a0a] border-[#2a2a2a]"
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="email">Email</Label>
 <Input
 id="email"
 type="email"
 placeholder="chef@example.com"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 required
 className="bg-[#0a0a0a] border-[#2a2a2a]"
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="password">Password</Label>
 <Input
 id="password"
 type="password"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 required
 minLength={6}
 className="bg-[#0a0a0a] border-[#2a2a2a]"
 />
 </div>
 <Button
 type="submit"
 className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
 disabled={loading}
 >
 {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
 Create Account
 </Button>
 </form>
 </CardContent>
 <CardFooter className="justify-center">
 <p className="text-sm text-gray-500">
 Already have an account?{" "}
 <Link href="/login" className="text-amber-500 hover:underline">
 Sign in
 </Link>
 </p>
 </CardFooter>
 </Card>
 </div>
 );
}
