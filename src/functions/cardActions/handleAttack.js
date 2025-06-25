import fillHands from "../fillHands.js";
import handleStatusEffect from "./handleStatusEffect.js";

function collectHp(amount, status, player) {
  status[player].hp = Math.max(0, status[player].hp - amount);
}

// 攻撃力"?"の実際の値を取得
function getRandomAttackPower() {
  const isCritical = Math.random() <= 0.15;
  if (isCritical) return 10 + Math.floor(Math.random() * 10) + 1;
  return Math.floor(Math.random() * 10) + 1;
}

// 手札内の攻撃力"?"を実際の攻撃力に置き換え
export function resolveUnknownAttackPower(state, player) {
  const selected = state.selected[player];
  const hands = state.hands[player];

  for (const idx of selected) {
    const card = hands[idx];
    if (card.attackPower === undefined && card.attackPowerOptions) {
      card.attackPower = card.attackPowerOptions[0];
      console.log(`[resolveUnknownAttackPower] resolved: ${card.name} → ${card.attackPower}`);
    } else {
      console.log(`[resolveUnknownAttackPower] already known: ${card.name} → ${card.attackPower}`);
    }
  }
}


export async function handleAttack(state, defendingPlayer, events) {
  const attackingPlayer = defendingPlayer === "p1" ? "p2" : "p1";
  const { selected, hands, status, currentAction } = state;

  console.log("[handleAttack] called. Attacker:", attackingPlayer, "Defender:", defendingPlayer);
  console.log("[handleAttack] attack cards:", selected[attackingPlayer].map(i => hands[attackingPlayer][i].name));
  console.log("[handleAttack] defend cards:", selected[defendingPlayer].map(i => hands[defendingPlayer][i].name));

  const attackCards = selected[attackingPlayer]
    .map((idx) => hands[attackingPlayer][idx])
    .filter((card) => card.type === "attack" || card.type === "yokoyari" || card.type === "both");

  const defendCards = selected[defendingPlayer]
    .map((idx) => hands[defendingPlayer][idx])
    .filter((card) =>
      card.type === "defense" ||
      card.type === "both" ||
      card.type === "tool" ||
      card.canDefend === true
    );

  const attackSum = attackCards.reduce((sum, card) => sum + card.attackPower, 0);
  const defendSum = defendCards.reduce((sum, card) => {
    const power = card.defensePower ?? (
      card.attackPower === "?" ? getRandomAttackPower() : card.attackPower
    );
    return sum + power;
  }, 0);

  if (selected[defendingPlayer].length === 0 || defendCards.length === 0) {
    // ノーガード
    collectHp(attackSum, status, defendingPlayer);
    events.push({
      label: `:boom:  {${defendingPlayer}} に **${attackSum}** ダメージ！`,
    });
  } else if (attackSum > defendSum) {
    const diff = attackSum - defendSum;
    collectHp(diff, status, defendingPlayer);
    events.push({
      label: `:boom: {${defendingPlayer}} に **${diff}** のダメージ`,
    });
  } else {
    events.push({
      label: `:shield: {${defendingPlayer}} は攻撃を防いだ`,
    });
  }

  hands[attackingPlayer] = hands[attackingPlayer].filter(
    (_card, idx) => !selected[attackingPlayer].includes(idx)
  );
  hands[defendingPlayer] = hands[defendingPlayer].filter(
    (_card, idx) => !selected[defendingPlayer].includes(idx)
  );
  selected[attackingPlayer] = [];
  selected[defendingPlayer] = [];

  await fillHands(state.p1MemberId, hands.p1);
  await fillHands(state.p2MemberId, hands.p2);

  currentAction.type = "attackSelecting";
  currentAction.target = defendingPlayer;

  await handleStatusEffect(state, attackingPlayer, events);
}


export async function handleAttackReflected(state, defendingPlayer, events) {
  const attackingPlayer = defendingPlayer === "p1" ? "p2" : "p1";
  const { selected, hands, status, currentAction } = state;

  const attackCards = selected[attackingPlayer].map(
    (idx) => hands[attackingPlayer][idx]
  );
  const attackSum = attackCards.reduce((sum, card) => {
    return sum + card.attackPower;
  }, 0);

  collectHp(attackSum, status, attackingPlayer);
  events.push(
    {
      label: `:boomerang: {${defendingPlayer}} は攻撃を弾いた`,
    },
    {
      label: `:boom: {${attackingPlayer}} に **${attackSum}** のダメージ`,
    }
  );

  hands[attackingPlayer] = hands[attackingPlayer].filter(
    (_card, idx) => !selected[attackingPlayer].includes(idx)
  );
  selected[attackingPlayer] = [];
  await fillHands(state[attackingPlayer + "MemberId"], hands[attackingPlayer]);

  currentAction.type = "attackSelecting";
  currentAction.target = defendingPlayer;

  await handleStatusEffect(state, attackingPlayer, events);
}

export async function handleAttackBlocked(state, defendingPlayer, events) {
  const attackingPlayer = defendingPlayer === "p1" ? "p2" : "p1";
  const { selected, hands, currentAction } = state;

  events.push({
    label: `:shield: {${defendingPlayer}} は攻撃を防いた`,
  });

  hands[attackingPlayer] = hands[attackingPlayer].filter(
    (_card, idx) => !selected[attackingPlayer].includes(idx)
  );
  selected[attackingPlayer] = [];
  await fillHands(state[attackingPlayer + "MemberId"], hands[attackingPlayer]);

  currentAction.type = "attackSelecting";
  currentAction.target = defendingPlayer;

  await handleStatusEffect(state, attackingPlayer, events);
}
