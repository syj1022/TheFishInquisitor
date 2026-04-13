// abstract: Zod schemas defining the canonical hand-scenario contract for parser modules.
// out_of_scope: Model-provider integration details and UI presentation logic.

import { z } from "zod";

const StreetSchema = z.enum(["preflop", "flop", "turn", "river"]);
const ActionSchema = z.enum(["fold", "check", "call", "bet", "raise", "all_in"]);

export const HandScenarioSchema = z.object({
  handId: z.string().min(1),
  players: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        stack: z.number().positive(),
        position: z.string().min(1)
      })
    )
    .min(2),
  potSize: z.number().positive(),
  actions: z
    .array(
      z.object({
        street: StreetSchema,
        actorId: z.string().min(1),
        action: ActionSchema,
        amount: z.number().positive().optional()
      })
    )
    .min(1),
  board: z
    .object({
      flop: z.array(z.string()).length(3).optional(),
      turn: z.string().optional(),
      river: z.string().optional()
    })
    .optional(),
  holeCards: z.record(z.tuple([z.string(), z.string()])).optional()
});
