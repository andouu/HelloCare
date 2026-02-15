"use client";

import ReactMarkdown from "react-markdown";

const markdownComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="list-disc list-inside mb-2 space-y-0.5">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="list-decimal list-inside mb-2 space-y-0.5">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="ml-2">{children}</li>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-bold">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic">{children}</em>
  ),
  code: ({
    className,
    children,
  }: {
    className?: string;
    children?: React.ReactNode;
  }) => {
    const isBlock = className?.includes("language-");
    return isBlock ? (
      <code className="block p-3 rounded-lg bg-neutral-200/80 text-sm overflow-x-auto my-2">
        {children}
      </code>
    ) : (
      <code className="px-1.5 py-0.5 rounded bg-neutral-200/80 text-sm font-mono">
        {children}
      </code>
    );
  },
  pre: ({ children }: { children?: React.ReactNode }) => (
    <pre className="overflow-x-auto my-2">{children}</pre>
  ),
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-base font-bold mt-3 mb-1 first:mt-0">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-sm font-bold mt-3 mb-1 first:mt-0">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-sm font-semibold mt-2 mb-1 first:mt-0">{children}</h3>
  ),
  a: ({
    href,
    children,
  }: {
    href?: string;
    children?: React.ReactNode;
  }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline hover:opacity-80"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-2 border-neutral-300 pl-3 my-2 text-neutral-600">
      {children}
    </blockquote>
  ),
};

type StreamingTextProps = {
  content: string;
  messageId?: string;
  className?: string;
};

export function StreamingText({
  content,
  className = "",
}: StreamingTextProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>
    </div>
  );
}
