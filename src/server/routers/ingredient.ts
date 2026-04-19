import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const ingredientRouter = router({
 list: protectedProcedure
 .input(
 z.object({
 limit: z.number().min(1).max(100).default(50),
 cursor: z.string().uuid().optional(),
 category: z.string().optional(),
 search: z.string().optional(),
 inStock: z.boolean().optional(),
 }).optional()
 )
 .query(async ({ ctx, input }) => {
 const limit = input?.limit ?? 50;
 const ingredients = await ctx.prisma.ingredient.findMany({
 where: {
 userId: ctx.user.id,
 ...(input?.category ? { category: input.category } : {}),
 ...(input?.inStock !== undefined ? { inStock: input.inStock } : {}),
 ...(input?.search
 ? { name: { contains: input.search, mode: "insensitive" } }
 : {}),
 },
 take: limit + 1,
 ...(input?.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
 orderBy: { name: "asc" },
 });

 let nextCursor: string | undefined;
 if (ingredients.length > limit) {
 const nextItem = ingredients.pop();
 nextCursor = nextItem?.id;
 }

 return { ingredients, nextCursor };
 }),

 create: protectedProcedure
 .input(
 z.object({
 name: z.string().min(1).max(200),
 category: z.string().optional(),
 unit: z.string().optional(),
 cost: z.number().nonnegative().optional(),
 supplier: z.string().optional(),
 inStock: z.boolean().optional(),
 notes: z.string().optional(),
 })
 )
 .mutation(async ({ ctx, input }) => {
 try {
 return await ctx.prisma.ingredient.create({
 data: { ...input, userId: ctx.user.id },
 });
 } catch (error) {
 throw new TRPCError({
 code: "INTERNAL_SERVER_ERROR",
 message: "Failed to create ingredient",
 cause: error,
 });
 }
 }),

 update: protectedProcedure
 .input(
 z.object({
 id: z.string().uuid(),
 name: z.string().min(1).max(200).optional(),
 category: z.string().optional(),
 unit: z.string().optional(),
 cost: z.number().nonnegative().optional(),
 supplier: z.string().optional(),
 inStock: z.boolean().optional(),
 notes: z.string().optional(),
 })
 )
 .mutation(async ({ ctx, input }) => {
 const { id, ...data } = input;
 const existing = await ctx.prisma.ingredient.findFirst({
 where: { id, userId: ctx.user.id },
 });
 if (!existing) {
 throw new TRPCError({ code: "NOT_FOUND", message: "Ingredient not found" });
 }
 try {
 return await ctx.prisma.ingredient.update({ where: { id }, data });
 } catch (error) {
 throw new TRPCError({
 code: "INTERNAL_SERVER_ERROR",
 message: "Failed to update ingredient",
 cause: error,
 });
 }
 }),

 delete: protectedProcedure
 .input(z.object({ id: z.string().uuid() }))
 .mutation(async ({ ctx, input }) => {
 const existing = await ctx.prisma.ingredient.findFirst({
 where: { id: input.id, userId: ctx.user.id },
 });
 if (!existing) {
 throw new TRPCError({ code: "NOT_FOUND", message: "Ingredient not found" });
 }
 try {
 await ctx.prisma.ingredient.delete({ where: { id: input.id } });
 return { success: true };
 } catch (error) {
 throw new TRPCError({
 code: "INTERNAL_SERVER_ERROR",
 message: "Failed to delete ingredient",
 cause: error,
 });
 }
 }),
});
