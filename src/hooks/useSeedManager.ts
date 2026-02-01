import { useState, useCallback } from 'react';

export function useSeedManager() {
  const [currentSeed, setCurrentSeed] = useState<number | null>(null);
  const [seedInput, setSeedInput] = useState<string>('');

  const generateNewSeed = useCallback(() => {
    const randomSeed = Math.floor(Math.random() * 1000000);
    setCurrentSeed(randomSeed);
    setSeedInput(randomSeed.toString());
    return randomSeed;
  }, []);

  const getReplaySeed = useCallback(() => {
    const seed = seedInput.trim() !== '' ? parseInt(seedInput, 10) : currentSeed;
    
    if (seed !== null && !isNaN(seed)) {
      setCurrentSeed(seed);
      setSeedInput(seed.toString());
      return seed;
    }
    
    return null;
  }, [seedInput, currentSeed]);

  return {
    currentSeed,
    seedInput,
    setSeedInput,
    generateNewSeed,
    getReplaySeed,
  };
}
