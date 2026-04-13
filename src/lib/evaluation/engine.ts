// abstract: Common evaluation-engine interface shared by rule and future solver implementations.
// out_of_scope: Concrete scoring algorithms and UI integration.

import type { EvaluationResult, HandScenario, InfoMode } from "../../types/poker";

export interface EvaluationEngine {
  evaluate(scenario: HandScenario, targetPlayerId: string, mode: InfoMode): EvaluationResult;
}
