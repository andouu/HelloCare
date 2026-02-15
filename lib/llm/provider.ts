import type { LanguageModel } from "ai";

/** Supported LLM provider identifiers. */
export type LLMProviderName = "openai" | "anthropic";

/** Default model id for each provider. */
const DEFAULT_MODELS: Record<LLMProviderName, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-4-20250514",
};

const SUPPORTED_PROVIDERS = Object.keys(DEFAULT_MODELS) as LLMProviderName[];

/**
 * Creates a `LanguageModel` instance from environment configuration.
 *
 * Provider: `LLM_PROVIDER` env var (default `"openai"`).
 * Model:    `LLM_MODEL` env var, or the provider's default.
 *
 * @param overrideModel – Optional model id that takes priority over env/defaults.
 *
 * @example
 * ```ts
 * // Uses env config (defaults to openai / gpt-4o-mini)
 * const model = await createModel();
 *
 * // Explicit override
 * const model = await createModel("gpt-4o");
 * ```
 */
export async function createModel(
  overrideModel?: string,
): Promise<LanguageModel> {
  const providerName = (process.env.LLM_PROVIDER ?? "openai") as string;

  if (!SUPPORTED_PROVIDERS.includes(providerName as LLMProviderName)) {
    throw new Error(
      `Unsupported LLM provider: "${providerName}". ` +
        `Set LLM_PROVIDER to one of: ${SUPPORTED_PROVIDERS.join(", ")}`,
    );
  }

  const provider = providerName as LLMProviderName;
  const modelId =
    overrideModel ?? process.env.LLM_MODEL ?? DEFAULT_MODELS[provider];

  switch (provider) {
    case "openai": {
      const { openai } = await import("@ai-sdk/openai");
      return openai(modelId);
    }

    case "anthropic": {
      try {
        // Optional peer dependency — only required when LLM_PROVIDER=anthropic.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error — @ai-sdk/anthropic is an optional dependency
        const { anthropic } = await import("@ai-sdk/anthropic");
        return anthropic(modelId);
      } catch {
        throw new Error(
          "Anthropic provider requested but @ai-sdk/anthropic is not installed. " +
            "Run: npm install @ai-sdk/anthropic",
        );
      }
    }
  }
}
