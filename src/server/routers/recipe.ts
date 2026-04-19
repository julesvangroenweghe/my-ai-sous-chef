import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const recipeRouter = router({
 list: protectedProcedure
 .input(
 z.object({
 limit: z.number().min(1).max(100).default(20),
 cursor: z.string().uuid().optional(),
 cuisine: z.string().optional(),
 course: z.string().optional(),
 search: z.string().optional(),
 }).optional()
 )
 .query(async ({ ctx, input }) => {
 const limit = input?.limit ?? 20;
 const recipes = await ctx.prisma.recipe.findMany({
 where: {
 userId: ctx.user.id,
 ...(input?.cuisine ? { cuisine: input.cuisine } : {}),
 ...(input?.course ? { course: input.course } : {}),
 ...(input?.search
 ? {
 OR: [
 { title: { contains: input.search, mode: "insensitive" } },
 { description: { contains: input.search, mode: "insensitive" } },
 ],
 }
 : {}),
 },
 take: limit + 1,
 ...(input?.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
 orderBy: { createdAt: "desc" },
 include: {
 ingredients: {
 include: { ingredient: true },
 },
 },
 });

 let nextCursor: string | undefined;
 if (recipes.length > limit) {
 const nextItem = recipes.pop();
 nextCursor = nextItem?.id;
 }

 return { recipes, nextCursor };
 }),

 getById: protectedProcedure
 .input(z.object({ id: z.string().uuid() }))
 .query(async ({ ctx, input }) => {
 const recipe = await ctx.prisma.recipe.findFirst({
 where: { id: input.id, userId: ctx.user.id },
 include: {
 ingredients: {
 include: { ingredient: true },
 },
 },
 });
 if (!recipe) {
 throw new TRPCError({ code: "NOT_FOUND", message: "Recipe not found" });
 }
 return recipe;
 }),

 create: protectedProcedure
 .input(
 z.object({
 title: z.string().min(1).max(200),
 description: z.string().optional(),
 cuisine: z.string().optional(),
 course: z.string().optional(),
 prepTime: z.number().int().positive().optional(),
 cookTime: z.number().int().positive().optional(),
 servings: z.number().int().positive().optional(),
 instructions: z.string().optional(),
 imageUrl: z.string().url().optional(),
 isPublic: z.boolean().optional(),
 tags: z.array(z.string()).optional(),
 })
 )
 .mutation(async ({ ctx, input }) => {
 try {
 return await ctx.prisma.recipe.create({
 data: { ...input, userId: ctx.user.id },
 });
 } catch (error) {
 throw new TRPCError({
 code: "INTERNAL_SERVER_ERROR",
 message: "Failed to create recipe",
 cause: error,
 });
 }
 }),

 update: protectedProcedure
 .input(
 z.object({
 id: z.string().uuid(),
 title: z.string().min(1).max(200).optional(),
 description: z.string().optional(),
 cuisine: z.string().optional(),
 course: z.string().optional(),
 prepTime: z.number().int().positive().optional(),
 cookTime: z.number().int().positive().optional(),
 servings: z.number().int().positive().optional(),
 instructions: z.string().optional(),
 imageUrl: z.string().url().optional(),
 isPublic: z.boolean().optional(),
 tags: z.array(z.string()).optional(),
 })
 )
 .mutation(async ({ ctx, input }) => {
 const { id, ...data } = input;
 const existing = await ctx.prisma.recipe.findFirst({
 where: { id, userId: ctx.user.id },
 });
 if (!existing) {
 throw new TRPCError({ code: "NOT_FOUND", message: "Recipe not found" });
 }
 try {
 return await ctx.prisma.recipe.update({ where: { id }, data });
 } catch (error) {
 throw new TRPCError({
 code: "INTERNAL_SERVER_ERROR",
 message: "Failed to update recipe",
 cause: error,
 });
 }
 }),

 delete: protectedProcedure
 .input(z.object({ id: z.string().uuid() }))
 .mutation(async ({ ctx, input }) => {
 const existing = await ctx.prisma.recipe.findFirst({
 where: { id: input.id, userId: ctx.user.id },
 });
 if (!existing) {
 throw new TRPCError({ code: "NOT_FOUND", message: "Recipe not found" });
 }
 try {
 await ctx.prisma.recipe.delete({ where: { id: input.id } });
 return { success: true };
 } catch (error) {
 throw new TRPCError({
 code: "INTERNAL_SERVER_ERROR",
 message: "Failed to delete recipe",
 cause: error,
 });
 }
 }),
});
