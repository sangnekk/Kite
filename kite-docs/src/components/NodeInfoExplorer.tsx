import { useEffect, useState } from "react";
import JsonSchemaExplorer from "./JsonSchemaExplorer";
import { cn } from "../lib/util";
import type { JsonSchema7Type } from "zod-to-json-schema";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";

type NodeInfo = {
  title: string;
  description: string;
  color: string;
  dataSchema: JsonSchema7Type | null;
  resultSchema: JsonSchema7Type | null;
  dataFields: string[];
  creditsCost: number | null;
};

type CatalogNode = NodeInfo & { type: string };

// The node catalog is a static asset (static/flow-nodes.json) generated from the
// flow editor's source of truth via `npm run gen:catalog` in kite-web. It is
// served by the docs site itself, so no Next.js backend is required for embed /
// static builds. Fetch it once and share it across every NodeInfoExplorer.
let catalogPromise: Promise<Record<string, NodeInfo>> | null = null;

function loadCatalog(baseUrl: string): Promise<Record<string, NodeInfo>> {
  if (!catalogPromise) {
    catalogPromise = fetch(`${baseUrl}flow-nodes.json`)
      .then((res) => res.json())
      .then((json: { nodes: CatalogNode[] }) => {
        const byType: Record<string, NodeInfo> = {};
        for (const node of json.nodes) {
          byType[node.type] = node;
        }
        return byType;
      })
      .catch((error) => {
        // Allow a later mount to retry instead of caching the failure forever.
        catalogPromise = null;
        throw error;
      });
  }
  return catalogPromise;
}

export default function NodeInfoExplorer({ type }: { type: string }) {
  const [tab, setTab] = useState<"data" | "result">("result");
  const [data, setData] = useState<NodeInfo | null>(null);
  const [loaded, setLoaded] = useState(false);

  const {
    siteConfig: { baseUrl },
  } = useDocusaurusContext();

  useEffect(() => {
    let active = true;

    loadCatalog(baseUrl)
      .then((byType) => {
        if (active) {
          setData(byType[type] ?? null);
          setLoaded(true);
        }
      })
      .catch((error) => {
        console.error("Failed to load node info:", error);
        if (active) {
          setLoaded(true);
        }
      });

    return () => {
      active = false;
    };
  }, [type, baseUrl]);

  useEffect(() => {
    if (data?.resultSchema) {
      setTab("result");
    } else if (data?.dataSchema) {
      setTab("data");
    }
  }, [data]);

  if (!loaded) {
    return <div>Loading...</div>;
  }

  // Loaded, but this node type isn't in the catalog (e.g. not yet registered in
  // the flow editor's nodeTypes). Render nothing rather than hang on "Loading".
  if (!data) {
    return null;
  }

  const schema = tab === "data" ? data.dataSchema : data.resultSchema;

  return (
    <div>
      <div className="flex border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-lg mb-3">
        {data.resultSchema && (
          <div
            className={cn(
              "flex-1 px-3 py-1.5 font-bold rounded-md cursor-pointer transition-colors",
              tab === "result" && "bg-white dark:bg-zinc-700"
            )}
            role="button"
            onClick={() => setTab("result")}
          >
            Result Data
          </div>
        )}
        {data.dataSchema && (
          <div
            className={cn(
              "flex-1 px-3 py-1.5 font-bold rounded-md cursor-pointer transition-colors",
              tab === "data" && "bg-white dark:bg-zinc-700"
            )}
            role="button"
            onClick={() => setTab("data")}
          >
            Input Data
          </div>
        )}
      </div>

      <div className="bg-zinc-100 dark:bg-zinc-800 px-6 py-3 rounded-lg">
        {schema && <JsonSchemaExplorer schema={schema} />}
      </div>
    </div>
  );
}
