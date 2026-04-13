// abstract: Transforms evaluation outcomes into constrained roommate-style comments and reasons.
// out_of_scope: Voice playback and strategic score calculation internals.

import type { EvaluationResult } from "../../types/poker";

export const APPROVED_LINES = [
  "鱼",
  "你干嘛啊",
  "纯在找爸爸",
  "你在讲什么鬼故事",
  "该你收池，打得有问题，不该call的",
  "太overplay了",
  "没必要",
  "好fo好fo",
  "好打好打",
  "打得没问题"
] as const;

export interface CommentaryPayload {
  roastLine: string;
  gtoReason: string;
}

export function buildRoastLine(result: EvaluationResult): string {
  if (result.verdict === "good") {
    return result.severity >= 2 ? "好fo好fo" : "打得没问题";
  }
  if (result.verdict === "bad") {
    return result.summary.toLowerCase().includes("call") ? "该你收池，打得有问题，不该call的" : "太overplay了";
  }
  return "你干嘛啊";
}

export function buildCommentary(result: EvaluationResult): CommentaryPayload {
  return {
    roastLine: buildRoastLine(result),
    gtoReason: result.rationale.join(" ")
  };
}
