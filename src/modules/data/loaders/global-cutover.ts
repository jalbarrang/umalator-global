type MasterUmaEntry = {
  outfits: Record<string, string>;
};

/**
 * Outfit IDs present in the master.mdb extract — live on the Global client.
 */
export function collectReleasedOutfitIds(
  masterUmas: Record<string, MasterUmaEntry>
): Set<string> {
  const outfitIds = new Set<string>();

  for (const uma of Object.values(masterUmas)) {
    for (const outfitId of Object.keys(uma.outfits)) {
      outfitIds.add(outfitId);
    }
  }

  return outfitIds;
}

/**
 * Support card IDs present in the master.mdb extract — live on the Global client.
 */
export function collectReleasedSupportCardIds(
  masterSupportCards: Record<string, unknown>
): Set<string> {
  return new Set(Object.keys(masterSupportCards));
}
