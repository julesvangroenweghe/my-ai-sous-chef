import { initTRPC, TRPCError } from "@trpc/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import superjson from "superjson";

export const createTRPCContext = async () => {
 const supabase = await createClient();
 const {
 data: { user },
 } = await supabase.auth.getUser();

 return {
 prisma,
 supabase,
 user,
 };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
 transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const enforceUserIsAuthed = t.middleware(async ({ ctx, next }) => {
 if (!ctx.user) {
 throw new TRPCError({ code: "UNAUTHORIZED", message: "Not authenticated" });
 }
 return next({
 ctx: {
 ...ctx,
 user: ctx.user,
 },
 });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
