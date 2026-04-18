import { router } from "../trpc";
import { recipeRouter } from "./recipe";
import { ingredientRouter } from "./ingredient";
import { eventRouter } from "./event";
import { menuRouter } from "./menu";

export const appRouter = router({
  recipe: recipeRouter,
  ingredient: ingredientRouter,
  event: eventRouter,
  menu: menuRouter,
});

export type AppRouter = typeof appRouter;
