/**
 * Generate a random seed between 0 and 1000000.
 */
export const generateSeed = () => {
  return Math.floor(Math.random() * 1000000);
};

/**
 * Parse a seed from a string to a number.
 */
export const parseSeed = (seed: string) => {
  const parsedSeed = Number.parseInt(seed, 10);

  if (Number.isNaN(parsedSeed)) {
    return null;
  }

  return parsedSeed;
};
