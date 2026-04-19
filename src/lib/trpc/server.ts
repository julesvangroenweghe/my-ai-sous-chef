import "server-only";
import { createTRPCContext } from "@/server/trpc";
import { appRouter } from "@/server/routers/_app";

export const serverTrpc = async () => {
 const ctx = await createTRPCContext();
 return appRouter.createCaller(ctx);
};
