import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const eventRouter = router({
 list: protectedProcedure
 .input(
 z.object({
 limit: z.number().min(1).max(100).default(20),
 cursor: z.string().uuid().optional(),
 status: z.string().optional(),
 upcoming: z.boolean().optional(),
 }).optional()
 )
 .query(async ({ ctx, input }) => {
 const limit = input?.limit ?? 20;
 const events = await ctx.prisma.event.findMany({
 where: {
 userId: ctx.user.id,
 ...(input?.status ? { status: input.status } : {}),
 ...(input?.upcoming ? { eventDate: { gte: new Date() } } : {}),
 },
 take: limit + 1,
 ...(input?.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
 orderBy: { eventDate: "asc" },
 include: { menus: true },
 });

 let nextCursor: string | undefined;
 if (events.length > limit) {
 const nextItem = events.pop();
 nextCursor = nextItem?.id;
 }

 return { events, nextCursor };
 }),

 getById: protectedProcedure
 .input(z.object({ id: z.string().uuid() }))
 .query(async ({ ctx, input }) => {
 const event = await ctx.prisma.event.findFirst({
 where: { id: input.id, userId: ctx.user.id },
 include: {
 menus: {
 include: {
 items: { include: { recipe: true } },
 },
 },
 },
 });
 if (!event) {
 throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
 }
 return event;
 }),

 create: protectedProcedure
 .input(
 z.object({
 title: z.string().min(1).max(200),
 description: z.string().optional(),
 eventDate: z.string().datetime(),
 location: z.string().optional(),
 guestCount: z.number().int().nonnegative().optional(),
 status: z.string().optional(),
 budget: z.number().nonnegative().optional(),
 notes: z.string().optional(),
 })
 )
 .mutation(async ({ ctx, input }) => {
 try {
 return await ctx.prisma.event.create({
 data: {
 ...input,
 eventDate: new Date(input.eventDate),
 userId: ctx.user.id,
 },
 });
 } catch (error) {
 throw new TRPCError({
 code: "INTERNAL_SERVER_ERROR",
 message: "Failed to create event",
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
 eventDate: z.string().datetime().optional(),
 location: z.string().optional(),
 guestCount: z.number().int().nonnegative().optional(),
 status: z.string().optional(),
 budget: z.number().nonnegative().optional(),
 notes: z.string().optional(),
 })
 )
 .mutation(async ({ ctx, input }) => {
 const { id, eventDate, ...rest } = input;
 const existing = await ctx.prisma.event.findFirst({
 where: { id, userId: ctx.user.id },
 });
 if (!existing) {
 throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
 }
 try {
 return await ctx.prisma.event.update({
 where: { id },
 data: {
 ...rest,
 ...(eventDate ? { eventDate: new Date(eventDate) } : {}),
 },
 });
 } catch (error) {
 throw new TRPCError({
 code: "INTERNAL_SERVER_ERROR",
 message: "Failed to update event",
 cause: error,
 });
 }
 }),

 delete: protectedProcedure
 .input(z.object({ id: z.string().uuid() }))
 .mutation(async ({ ctx, input }) => {
 const existing = await ctx.prisma.event.findFirst({
 where: { id: input.id, userId: ctx.user.id },
 });
 if (!existing) {
 throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
 }
 try {
 await ctx.prisma.event.delete({ where: { id: input.id } });
 return { success: true };
 } catch (error) {
 throw new TRPCError({
 code: "INTERNAL_SERVER_ERROR",
 message: "Failed to delete event",
 cause: error,
 });
 }
 }),
});
