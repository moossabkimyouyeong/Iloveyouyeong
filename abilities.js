export const ABILITY_LABEL = {
  aka: "아카",
  ao: "아오",
  murasaki: "허식",
  domain: "영역전개",
};

export function resolveAbility(gesture) {
  if (!gesture) return null;
  if (gesture in ABILITY_LABEL) return gesture;
  return null;
}
