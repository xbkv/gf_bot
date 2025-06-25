import fillHands from "../fillHands.js";
import handleStatusEffect from "./handleStatusEffect.js";

export default async function handleHeal(state, player, events) {
  const selected = state.selected[player];
  const hands = state.hands[player];
  const status = state.status[player];
  const { currentAction } = state;

  const healCard = hands[selected[0]];
  if (healCard.type !== "heal") return;

  status.hp += healCard.attackPower;
  events.push({
    label: `:heart: {${player}}のHPを**${healCard.attackPower}**回復`,
  });

  state.hands[player] = hands.filter((_card, idx) => !selected.includes(idx));
  state.selected[player] = [];

  await fillHands(state[player + "MemberId"], state.hands[player]);

  currentAction.type = "attackSelecting";
  currentAction.target = player === "p1" ? "p2" : "p1";

  await handleStatusEffect(state, player, events);
}
