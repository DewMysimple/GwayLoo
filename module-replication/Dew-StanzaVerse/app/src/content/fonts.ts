/**
 * Branch-local font contract copied from the main project's content
 * definition. The files remain local to this replica; these paths never point
 * back into the main project or to a remote origin.
 */
export const fontAssets = {
  canelaThin: {
    family: "Canela Text",
    path: "/assets/fonts/CanelaText-Thin.woff2",
    weight: 100,
  },
  roobertRegular: {
    family: "Roobert",
    path: "/assets/fonts/Roobert-Regular.woff2",
    weight: 400,
  },
} as const;
