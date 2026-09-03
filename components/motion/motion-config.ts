/** Shared motion vocabulary. Transform + opacity only, expo-out, 300–600ms. */
export const EASE_EXPO = [0.16, 1, 0.3, 1] as const;

export const DURATION = {
  fast: 0.3,
  base: 0.45,
  slow: 0.6,
} as const;

export const STAGGER = 0.05; // 50ms between siblings

export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export const maskLine = {
  hidden: { y: "110%" },
  visible: { y: "0%" },
};

export const VIEWPORT = { once: true, margin: "-10% 0px -10% 0px" } as const;
