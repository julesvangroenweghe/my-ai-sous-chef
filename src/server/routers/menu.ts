import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const menuRouter = router({
 list: protectedProcedure
 .input(
 z.object({
 limit: z.number().min(1).max(100).default(20),
 cursor: z.string().uuid().optional(),
 eventId: z.string().uuid().optional(),
 }).optional()
 )
 .query(async ({ ctx, input }) => {
 const limit = input?.limit ?? 20;
 const menus = await ctx.prisma.menu.findMany({
 where: {
 userId: ctx.user.id,
 ...(input?.eventId ? { eventId: input.eventId } : {}),
 },
 take: limit + 1,
 ...(input?.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
 orderBy: { createdAt: "desc" },
 include: {
 event: true,
 items: {
 include: { recipe: true },
 orderBy: { position: "asc" },
 },
 },
 });

 let nextCursor: string | undefined;
 if (menus.length > limit) {
 const nextItem = menus.pop();
 nextCursor = nextItem?.id;
 }

 return { menus, nextCursor };
 }),

 getById: protectedProcedure
 .input(z.object({ id: z.string().uuid() }))
 .query(async ({ ctx, input }) => {
 const menu = await ctx.prisma.menu.findFirst({
 where: { id: input.id, userId: ctx.user.id },
 include: {
 event: true,
 items: {
 include: { recipe: true },
 orderBy: { position: "asc" },
 },
 },
 });
 if (!menu) {
 throw new TRPCError({ code: "NOT_FOUND", message: "Menu not found" });
 }
 return menu;
 }),

 create: protectedProcedure
 .input(
 z.object({
 title: z.string().min(1).max(200),
 eventId: z.string().uuid().optional(),
 notes: z.string().optional(),
 })
 )
 .mutation(async ({ ctx, input }) => {
 try {
 return await ctx.prisma.menu.create({
 data: { ...input, userId: ctx.user.id },
 });
 } catch (error) {
 throw new TRPCError({
 code: "INTERNAL_SERVER_ERROR",
 message: "Failed to create menu",
 cause: error,
 });
 }
 }),

 update: protectedProcedure
 .input(
 z.object({
 id: z.string().uuid(),
 title: z.string().min(1).max(200).optional(),
 eventId: z.string().uuid().nullable().optional(),
 notes: z.string().optional(),
 })
 )
 .mutation(async ({ ctx, input }) => {
 const { id, ...data } = input;
 const existing = await ctx.prisma.menu.findFirst({
 where: { id, userId: ctx.user.id },
 });
 if (!existing) {
 throw new TRPCError({ code: "NOT_FOUND", message: "Menu not found" });
 }
 try {
 return await ctx.prisma.menu.update({ where: { id }, data });
 } catch (error) {
 throw new TRPCError({
 code: "INTERNAL_SERVER_ERROR",
 message: "Failed to update menu",
 cause: error,
 });
 }
 }),

 delete: protectedProcedure
 .input(z.object({ id: z.string().uuid() }))
 .mutation(async ({ ctx, input }) => {
 const existing = await ctx.prisma.menu.findFirst({
 where: { id: input.id, userId: ctx.user.id },
 });
 if (!existing) {
 throw new TRPCError({ code: "NOT_FOUND", message: "Menu not found" });
 }
 try {
 await ctx.prisma.menu.delete({ where: { id: input.id } });
 return { success: true };
 } catch (error) {
 throw new TRPCError({
 code: "INTERNAL_SERVER_ERROR",
 message: "Failed to delete menu",
 cause: error,
 });
 }
 }),

 addItem: protectedProcedure
 .input(
 z.object({
 menuId: z.string().uuid(),
 recipeId: z.string().uuid(),
 course: z.string().optional(),
 position: z.number().int().nonnegative().optional(),
 notes: z.string().optional(),
 })
 )
 .mutation(async ({ ctx, input }) => {
 const menu = await ctx.prisma.menu.findFirst({
 where: { id: input.menuId, userId: ctx.user.id },
 });
 if (!menu) {
 throw new TRPCError({ code: "NOT_FOUND", message: "Menu not found" });
 }
 try {
 return await ctx.prisma.menuItem.create({ data: input });
 } catch (error) {
 throw new TRPCError({
 code: "INTERNAL_SERVER_ERROR",
 message: "Failed to add menu item",
 cause: error,
 });
 }
 }),

 removeItem: protectedProcedure
 .input(z.object({ itemId: z.string().uuid() }))
 .mutation(async ({ ctx, input }) => {
 const item = await ctx.prisma.menuItem.findFirst({
 where: { id: input.itemId },
 include: { menu: true },
 });
 if (!item || item.menu.userId !== ctx.user.id) {
 throw new TRPCError({ code: "NOT_FOUND", message: "Menu item not found" });
 }
 try {
 await ctx.prisma.menuItem.delete({ where: { id: input.itemId } });
 return { success: true };
 } catch (error) {
 throw new TRPCError({
 code: "INTERNAL_SERVER_ERROR",
 message: "Failed to remove menu item",
 cause: error,
 });
 }
 }),
});
