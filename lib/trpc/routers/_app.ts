import { router } from "@/lib/trpc/server";
import { organizationsRouter } from "./organizations";
import { eventsRouter } from "./events";
import { ticketsRouter } from "./tickets";
import { membersRouter } from "./members";
import { adminRouter } from "./admin";

export const appRouter = router({
  organizations: organizationsRouter,
  events: eventsRouter,
  tickets: ticketsRouter,
  members: membersRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
