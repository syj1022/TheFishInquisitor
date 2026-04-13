// abstract: Placeholder solver-backed evaluation adapter implementing the shared engine interface.
// out_of_scope: Live solver integration, transport, and credential management.

import type { EvaluationResult, HandScenario, InfoMode } from "../../types/poker";
import type { EvaluationEngine } from "./engine";

export class SolverAdapter implements EvaluationEngine {
  evaluate(_scenario: HandScenario, _targetPlayerId: string, _mode: InfoMode): EvaluationResult {
    throw new Error("SolverAdapter is not implemented in MVP.");
  }
}
