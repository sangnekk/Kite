import { tool, type ToolSet } from "ai";
import { z } from "zod";
import { nodeDetails } from "./catalog";
import {
  createEventListener,
  createMessage,
  createVariable,
  validateFlow,
} from "./kite";

const flowSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      position: z.object({ x: z.number(), y: z.number() }).optional(),
      data: z.record(z.string(), z.any()).optional(),
    })
  ),
  edges: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      target: z.string(),
      sourceHandle: z.string().optional(),
    })
  ),
});

const buttonsSchema = z
  .array(
    z.object({
      label: z.string(),
      style: z.enum(["primary", "secondary", "success", "danger"]).optional(),
      flow: flowSchema.describe(
        "the button's flow, starting with an entry_component_button node"
      ),
    })
  )
  .optional();

const styleNum: Record<string, number> = {
  primary: 1,
  secondary: 2,
  success: 3,
  danger: 4,
};

// Builds Discord MessageData (action rows of buttons) + FlowSources map from a
// simple buttons list. Shared shape used by both create_message (editor) and the
// frontend when accepting a proposed message.
function buildMessage(content: string | undefined, buttons?: z.infer<typeof buttonsSchema>) {
  const flowSources: Record<string, unknown> = {};
  const buttonComponents = (buttons ?? []).map((b) => {
    const id = crypto.randomUUID();
    flowSources[id] = b.flow;
    return {
      type: 2,
      style: styleNum[b.style ?? "primary"],
      label: b.label,
      flow_source_id: id,
    };
  });
  const rows: unknown[] = [];
  for (let i = 0; i < buttonComponents.length; i += 5) {
    rows.push({ type: 1, components: buttonComponents.slice(i, i + 5) });
  }
  return { data: { content: content ?? "", components: rows }, flowSources };
}

// buildTools returns the agent's tools for the given mode.
// - "editor": acts on the open flow editor (update_flow client tool) and may
//   create resources immediately.
// - "page": the AI Studio — proposes whole entities (client tools) the user
//   reviews + accepts; only create_variable persists immediately (leaf).
export function buildTools(
  mode: string,
  appId: string,
  cookie: string
): ToolSet {
  const create_variable = tool({
    description:
      "Create a reusable stored variable. Returns its id to use as variable_id in action_variable_* blocks.",
    inputSchema: z.object({
      name: z.string().describe("lowercase letters, digits, underscore only"),
      scoped: z.boolean().optional().describe("true = per-user/guild value"),
    }),
    execute: async ({ name, scoped }) => {
      const r = await createVariable(appId, cookie, { name, scoped });
      return r.ok
        ? { ok: true, id: r.data!.id, name: r.data!.name }
        : { ok: false, error: r.error };
    },
  });

  const get_node_details = tool({
    description:
      "Get everything about one block type: its exact input fields, result shape, AND usage guidance from the docs (when to use it, what each field means, examples, gotchas, related blocks). Call this before using any block you're unsure about.",
    inputSchema: z.object({ type: z.string() }),
    execute: async ({ type }) =>
      nodeDetails(type) ?? { error: `unknown block type ${type}` },
  });

  const validate_flow = tool({
    description:
      "Validate a flow's connections and node data with the real compiler. Call before applying/proposing; fix any returned error and re-validate.",
    inputSchema: z.object({ flow: flowSchema }),
    execute: async ({ flow }) => {
      const r = await validateFlow(appId, cookie, flow);
      if (!r.ok) return { valid: false, error: r.error };
      return r.data;
    },
  });

  if (mode === "page") {
    // Proposal tools (client-side, no execute): the AI Studio stages these for
    // the user to preview and accept.
    return {
      validate_flow,
      get_node_details,
      create_variable,
      propose_command: tool({
        description:
          "Propose a new slash command for the user to review and accept. Provide a complete flow starting with entry_command (name/description in its data).",
        inputSchema: z.object({ flow: flowSchema }),
      }),
      propose_event_listener: tool({
        description:
          "Propose a new event listener for review. Provide a flow starting with entry_event.",
        inputSchema: z.object({ flow: flowSchema }),
      }),
      propose_message: tool({
        description:
          "Propose a new message template for review. Optionally add buttons; each button has its own flow (entry_component_button).",
        inputSchema: z.object({
          name: z.string(),
          content: z.string().optional(),
          buttons: buttonsSchema,
        }),
      }),
    };
  }

  // editor mode (in-flow copilot)
  return {
    validate_flow,
    get_node_details,
    create_variable,
    create_message: tool({
      description:
        "Create a reusable message template. Optionally add buttons; EACH button runs its own flow (must start with entry_component_button) — that flow can itself send another message with buttons (recursive nesting). Returns the message id to use as message_template_id.",
      inputSchema: z.object({
        name: z.string(),
        content: z.string().optional(),
        buttons: buttonsSchema,
      }),
      execute: async ({ name, content, buttons }) => {
        const { data, flowSources } = buildMessage(content, buttons);
        const r = await createMessage(appId, cookie, { name, data, flowSources });
        return r.ok ? { ok: true, id: r.data!.id } : { ok: false, error: r.error };
      },
    }),
    create_event_listener: tool({
      description:
        "Create a SEPARATE, additional event-listener feature (not the flow being edited). The flow MUST start with an entry_event node. For commands or the current flow, use update_flow instead.",
      inputSchema: z.object({ flow: flowSchema }),
      execute: async ({ flow }) => {
        const hasEventEntry = flow.nodes?.some((n) => n.type === "entry_event");
        if (!hasEventEntry) {
          return {
            ok: false,
            error:
              "create_event_listener needs a flow starting with entry_event. To build the command/flow the user is editing, call update_flow instead.",
          };
        }
        const r = await createEventListener(appId, cookie, flow);
        return r.ok
          ? { ok: true, id: r.data!.id, type: r.data!.type }
          : { ok: false, error: r.error };
      },
    }),
    update_flow: tool({
      description:
        "Apply the finished, validated flow to the user's canvas. Call this once the flow is ready.",
      inputSchema: z.object({ flow: flowSchema }),
    }),
  };
}
