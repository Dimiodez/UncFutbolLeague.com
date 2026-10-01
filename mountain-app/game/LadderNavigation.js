export function ladderAtFeet(
  ladders,
  playerX,
  feetY,
  horizontalTolerance = 28,
  topMountPadding = 34,
  bottomPadding = 30,
) {
  return ladders.find((ladder) => (
    Math.abs(playerX - ladder.x) < horizontalTolerance
    && feetY > ladder.top - topMountPadding
    && feetY < ladder.bottom + bottomPadding
  )) || null;
}
