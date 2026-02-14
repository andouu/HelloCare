"use client";

type HomeHeroProps = {
  subtitle: string;
};

export function HomeHero({ subtitle }: HomeHeroProps) {
  return (
    <div className="mt-6 flex flex-col items-center gap-6 sm:items-start">
      <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        HelloCare
      </h1>
      <p className="text-lg text-zinc-600 dark:text-zinc-400">{subtitle}</p>
    </div>
  );
}
