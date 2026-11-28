export function isLocalWorld(hostname: string): boolean {
  return ['localhost', '127.0.0.1', '[::1]', '::1'].includes(hostname);
}

/** Creator authority is an explicit tool mode, separate from the character's career. */
export function hasCreatorAccess(player: any): boolean {
  return player?.isAdmin === true || (player?.creatorAccess === true && player?.creatorMode === true);
}

// Local ownership enables the tools without issuing civic roles or player rewards.
export function grantLocalCredentials(gameplay: any, issuedAt: string) {
  const player = gameplay.player;
  if (player.creatorAccess === true) return gameplay;
  return { ...gameplay, player: { ...player, creatorAccess: true, creatorMode: false, creatorAccessGrantedAt: issuedAt } };
}
