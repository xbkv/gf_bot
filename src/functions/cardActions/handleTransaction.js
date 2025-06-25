import fillHands from "../fillHands.js";
import handleStatusEffect from "./handleStatusEffect.js";

function collectCoins(amount, status, player) {
  let remainingPrice = amount;
  for (const bankKey of ["coin", "mp", "hp"]) {
    const result = status[player][bankKey] - remainingPrice;
    if (result >= 0) {
      status[player][bankKey] = result;
      break;
    } else {
      status[player][bankKey] = 0;
      remainingPrice = -result;
      continue;
    }
  }
}

function addCoins(amount, status, player) {
  status[player].coin += amount;
}

export async function handleSell(state, defendingPlayer, events) {
  const attackingPlayer = defendingPlayer === "p1" ? "p2" : "p1";
  const { selected, hands, status, currentAction } = state;

  const attackingSelected = selected[attackingPlayer];
  const card = hands[attackingPlayer][attackingSelected[1]];

  collectCoins(card.price, status, defendingPlayer);
  addCoins(card.attackPower, status, attackingPlayer); // 売った側のコインを増やす

  events.push({
    label: `:money_with_wings: {${defendingPlayer}} は :coin:${card.price} を支払った`,
  });

  hands[attackingPlayer] = hands[attackingPlayer].filter(
    (_card, idx) => !selected[attackingPlayer].includes(idx)
  );
  hands[defendingPlayer].push(card);
  selected[attackingPlayer] = [];

  await fillHands(state.p1MemberId, hands.p1);
  await fillHands(state.p2MemberId, hands.p2);

  currentAction.type = "attackSelecting";
  currentAction.target = defendingPlayer;

  await handleStatusEffect(state, attackingPlayer, events);
}

export async function handleBuyRequest(state, defendingPlayer, _events) {
  const attackingPlayer = defendingPlayer === "p1" ? "p2" : "p1";
  const { selected, hands, currentAction } = state;

  const idx = Math.floor(Math.random() * hands[defendingPlayer].length);
  selected[defendingPlayer] = [idx];

  currentAction.type = "buyConfirming";
  currentAction.target = attackingPlayer;
}

export async function handleBuyConfirm(state, attackingPlayer, events) {
  const defendingPlayer = attackingPlayer === "p1" ? "p2" : "p1";
  const { selected, hands, status, currentAction } = state;

  const defendingSelected = selected[defendingPlayer];
  const card = hands[defendingPlayer][defendingSelected[0]];

  collectCoins(card.price, status, attackingPlayer);
  addCoins(card.attackPower, status, defendingPlayer); // 売った側のコインを増やす

  events.push({
    label: `:money_with_wings: {${attackingPlayer}} は :coin:${card.price} を支払った`,
  });

  hands[attackingPlayer].push(card);
  hands[attackingPlayer] = hands[attackingPlayer].filter(
    (_card, idx) => !selected[attackingPlayer].includes(idx)
  );
  hands[defendingPlayer] = hands[defendingPlayer].filter(
    (_card, idx) => !selected[defendingPlayer].includes(idx)
  );
  selected[attackingPlayer] = [];
  selected[defendingPlayer] = [];

  currentAction.type = "attackSelecting";
  currentAction.target = defendingPlayer;

  await handleStatusEffect(state, attackingPlayer, events);
}

export async function handleBuyCancel(state, attackingPlayer, events) {
  const defendingPlayer = attackingPlayer === "p1" ? "p2" : "p1";
  const { selected, hands, currentAction } = state;

  events.push({
    label: `:money_with_wings: {${attackingPlayer}} は購入を取り下げた`,
  });

  selected.p1 = [];
  selected.p2 = [];
  hands[attackingPlayer] = hands[attackingPlayer].filter(
    (_card, idx) => !selected[attackingPlayer].includes(idx)
  );

  currentAction.type = "attackSelecting";
  currentAction.target = defendingPlayer;

  await handleStatusEffect(state, attackingPlayer, events);
}
