// Master switch for the in-app AI assistant UI (flow copilot, AI Studio tab,
// AI buttons). Set to false to hide all AI entry points while the feature is not
// ready for users — independent of the per-plan `ai_included` flag. Flip back to
// true to re-enable (entry points then still respect `ai_included`).
export const AI_FEATURES_ENABLED = false;
