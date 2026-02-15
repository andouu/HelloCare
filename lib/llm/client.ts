import { generateText, Output } from "ai";
import type { z } from "zod";

import { createModel } from "./provider";
import type {
  StructuredQueryOptions,
  StructuredQueryResult,
  TextQueryOptions,
  TextQueryResult,
} from "./types";

/**
 * Executes a structured (schema-based) LLM query and returns typed output.
 *
 * The response is validated against the provided Zod schema via the
 * Vercel AI SDK's structured output support.
 *
 * @example
 * ```ts
 * const { output } = await queryLLMStructured({
 *   name: "Sentiment",
 *   description: "Sentiment analysis result",
 *   schema: z.object({ sentiment: z.enum(["positive", "negative", "neutral"]) }),
 *   prompt: "Analyze: 'I love this product!'",
 * });
 * console.log(output.sentiment); // "positive"
 * ```
 */
export async function queryLLMStructured<TSchema extends z.ZodType>(
  options: StructuredQueryOptions<TSchema>,
): Promise<StructuredQueryResult<z.infer<TSchema>>> {
  const model = await createModel(options.model);

  const result = await generateText({
    model,
    output: Output.object({
      name: options.name,
      description: options.description,
      schema: options.schema,
    }),
    ...(options.system !== undefined && { system: options.system }),
    prompt: options.prompt,
    ...(options.temperature !== undefined && {
      temperature: options.temperature,
    }),
  });

  // The AI SDK validates the response against the schema at runtime.
  // The cast is needed because TypeScript cannot infer the generic through
  // generateText's complex overload signatures.
  return {
    output: result.output as z.infer<TSchema>,
    usage: result.usage,
  };
}

/**
 * Executes a plain text LLM query and returns the raw text response.
 *
 * @example
 * ```ts
 * const { text } = await queryLLMText({
 *   system: "You are a helpful assistant.",
 *   prompt: "Summarize the benefits of exercise in one sentence.",
 * });
 * ```
 */
export async function queryLLMText(
  options: TextQueryOptions,
): Promise<TextQueryResult> {
  const model = await createModel(options.model);

  const result = await generateText({
    model,
    ...(options.system !== undefined && { system: options.system }),
    prompt: options.prompt,
    ...(options.temperature !== undefined && {
      temperature: options.temperature,
    }),
  });

  return {
    text: result.text,
    usage: result.usage,
  };
}
