import { create } from "zustand";
import { FlowData } from "../flow/dataSchema";
import { immer } from "zustand/middleware/immer";
import { pruneSelectOptionEdges } from "../flow/selectHandles";

export interface FlowStore {
  flowSources: Record<string, FlowData>;
  replaceAll(data: Record<string, FlowData>): void;
  replaceFlow(id: string, data: FlowData): void;
  getFlow(id: string): FlowData | undefined;
  // cloneFlows copies the flows of duplicated components to their copies
  // (old flow_source_id -> new flow_source_id).
  cloneFlows(mapping: Record<string, string>): void;
  // pruneSelectOptionEdges removes the branches of select menu options that no
  // longer exist from the flow with the given id.
  pruneSelectOptionEdges(id: string, optionIds: number[]): void;
}

export const createFlowStore = (initialData?: Record<string, FlowData>) => {
  return create<FlowStore>()(
    immer((set, get) => ({
      flowSources: initialData || {},

      replaceAll: (data) => set({ flowSources: data }),
      replaceFlow: (id: string, data: FlowData) =>
        set((state) => {
          state.flowSources[id] = data;
        }),
      getFlow: (id: string) => get().flowSources[id],
      cloneFlows: (mapping) =>
        set((state) => {
          for (const [oldId, newId] of Object.entries(mapping)) {
            const flow = state.flowSources[oldId];
            if (flow) {
              state.flowSources[newId] = JSON.parse(JSON.stringify(flow));
            }
          }
        }),
      pruneSelectOptionEdges: (id, optionIds) =>
        set((state) => {
          const flow = state.flowSources[id];
          if (!flow) return;
          const pruned = pruneSelectOptionEdges(flow as FlowData, optionIds);
          if (pruned.edges.length !== flow.edges.length) {
            state.flowSources[id] = pruned as any;
          }
        }),
    }))
  );
};
