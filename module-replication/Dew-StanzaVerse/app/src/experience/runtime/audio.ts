import type { ExperienceThemeName } from "../definition";

export type RuntimeAudioMode = "main" | "poem" | "landscape";

/** Keeps runtime state semantics separate from authored audio element names. */
export function themeForAudioMode(mode: RuntimeAudioMode): ExperienceThemeName {
  switch (mode) {
    case "poem":
      return "loop-poem";
    case "landscape":
      return "loop-painting";
    case "main":
    default:
      return "loop-main";
  }
}
