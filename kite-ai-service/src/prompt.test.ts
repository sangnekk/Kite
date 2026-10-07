import { strict as assert } from "node:assert";
import { buildSystemPrompt } from "./prompt";

const prompt = buildSystemPrompt({ nodes: [], edges: [] }, "component_select");
assert.match(prompt, /editing a SELECT MENU flow/);
assert.match(prompt, /option_<optionID>_unselected/);
assert.match(prompt, /component_<componentID>_option_<optionID>/);
assert.match(prompt, /\{\{select\.values\}\}/);
assert.doesNotMatch(prompt, /Do NOT set sourceHandle\/targetHandle, EXCEPT control_error_handler/);
console.log("Select menu prompt checks passed");
