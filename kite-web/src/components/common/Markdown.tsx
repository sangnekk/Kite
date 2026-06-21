import { cn } from "@/lib/utils";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Styled per-element so it looks good without the tailwind typography plugin.
const components: Components = {
  p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
  ul: ({ node, ...props }) => (
    <ul className="mb-2 list-disc space-y-0.5 pl-5 last:mb-0" {...props} />
  ),
  ol: ({ node, ...props }) => (
    <ol className="mb-2 list-decimal space-y-0.5 pl-5 last:mb-0" {...props} />
  ),
  strong: ({ node, ...props }) => (
    <strong className="font-semibold" {...props} />
  ),
  em: ({ node, ...props }) => <em className="italic" {...props} />,
  a: ({ node, ...props }) => (
    <a
      className="text-primary underline"
      target="_blank"
      rel="noreferrer"
      {...props}
    />
  ),
  h1: ({ node, ...props }) => (
    <h1 className="mb-1 mt-2 text-base font-bold first:mt-0" {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h2 className="mb-1 mt-2 text-sm font-bold first:mt-0" {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h3 className="mb-1 mt-2 text-sm font-semibold first:mt-0" {...props} />
  ),
  blockquote: ({ node, ...props }) => (
    <blockquote
      className="my-2 border-l-2 border-border pl-3 text-muted-foreground"
      {...props}
    />
  ),
  pre: ({ node, ...props }) => (
    <pre
      className="mb-2 overflow-x-auto rounded-md bg-muted p-2 text-xs last:mb-0"
      {...props}
    />
  ),
  code: ({ node, className, children, ...props }) => {
    const isBlock = /language-/.test(className ?? "");
    return isBlock ? (
      <code className={cn("font-mono", className)} {...props}>
        {children}
      </code>
    ) : (
      <code
        className="rounded bg-muted px-1 py-0.5 font-mono text-xs"
        {...props}
      >
        {children}
      </code>
    );
  },
};

export default function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed [&>:first-child]:mt-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
