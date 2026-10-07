import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { create, useStore } from "zustand";
import { immer } from "zustand/middleware/immer";

export type FlowContextType =
  | "command"
  | "component_button"
  | "component_select"
  | "event_discord"
  | "event_custom"
  | "schedule";

// An option of the select menu whose flow is being edited. The entry node
// renders one branch per option; they're read from the message editor instead
// of being stored in the flow, so they can't get out of sync.
export interface FlowComponentOption {
  id: number;
  label: string;
  value: string;
  emoji?: string;
}

export interface FlowContextStore {
  type: FlowContextType;
  componentOptions: FlowComponentOption[];
  setType(type: FlowContextType): void;
  setComponentOptions(options: FlowComponentOption[]): void;
}

export const createFlowContextStore = () => {
  return create<FlowContextStore>()(
    immer((set, get) => ({
      type: "command",
      componentOptions: [],

      setType: (type) => set({ type }),
      setComponentOptions: (componentOptions) => set({ componentOptions }),
    }))
  );
};

const FlowContextStoreContext = createContext<ReturnType<
  typeof createFlowContextStore
> | null>(null);

export function FlowContextStoreProvider({
  children,
  type,
  componentOptions,
}: {
  children: ReactNode;
  type: FlowContextType;
  componentOptions?: FlowComponentOption[];
}) {
  const [contextStore] = useState(() => createFlowContextStore());

  useEffect(() => {
    contextStore.getState().setType(type);
  }, [type, contextStore]);

  useEffect(() => {
    contextStore.getState().setComponentOptions(componentOptions ?? []);
  }, [componentOptions, contextStore]);

  return (
    <FlowContextStoreContext.Provider value={contextStore}>
      {children}
    </FlowContextStoreContext.Provider>
  );
}

export function useFlowContextStore() {
  const value = useContext(FlowContextStoreContext);
  if (!value) {
    throw new Error(
      "useFlowContextStore must be used within a FlowContextStore provider"
    );
  }
  return value;
}

export function useFlowContext<T>(selector: (store: FlowContextStore) => T): T {
  const store = useFlowContextStore();
  return useStore(store, selector);
}

const emptyStore = createFlowContextStore();

// useFlowComponentOptions returns the options of the select menu whose flow is
// being edited. Unlike useFlowContext it also works outside of a flow editor
// (e.g. in previews), where there are no options.
export function useFlowComponentOptions(): FlowComponentOption[] {
  const store = useContext(FlowContextStoreContext);
  return useStore(store ?? emptyStore, (s) => s.componentOptions);
}
