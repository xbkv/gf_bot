import characters from "../../database/characters.js";
import metaCards from "../../database/metaCards.js";
import {
  handleAttack,
  handleAttackBlocked,
  handleAttackReflected,
} from "./handleAttack.js";

export function collectMp(amount, status, player) {
  status[player].mp = Math.max(0, status[player].mp - amount);
}

export async function handleMiracleConvert(state, player, _events) {
  const hands = state.hands[player];
  const selected = state.selected[player];
  const { currentAction } = state;

  const miracleCard = hands[selected[0]];
  const toolCard = metaCards.getRandomToolCard(
    miracleCard,
    currentAction.type === "defendSelecting"
  );
  state.miracle[player] = {
    toolCard,
    miracleCard,
  };
  hands[selected[0]] = toolCard;
  collectMp(miracleCard.attackPower, state.status, player);

  currentAction.type = "miracleConfirming";
  currentAction.target = player;
}

export async function handleMiracleConfirm(state, player, events) {
  const { currentAction } = state;
  const hands = state.hands[player];
  const selected = state.selected[player];
  const miracle = state.miracle[player];
  const { toolCard, miracleCard } = miracle;

  const rand = Math.random();
  let probability = characters.getMiracleProbability(miracleCard.attackPower);
  if (toolCard.name === "キック返し") {
    if (rand < probability) await handleAttackReflected(state, player, events);
    else await handleAttack(state, player, events);

    hands[selected[0]] = miracleCard;
    selected.splice(0, selected.length);
    miracle[player] = null;
  } else if (toolCard.name === "枠落とし無効") {
    if (rand < probability) await handleAttackBlocked(state, player, events);
    else await handleAttack(state, player, events);

    hands[selected[0]] = miracleCard;
    selected.splice(0, selected.length);
    miracle[player] = null;
  } else if (toolCard.name === "クラッシュ") {
    probability = 0.05;
    if (rand < probability) await handleInstantKill(state, player, events);
    else events.push({ label: `:x: {${player}} のクラッシュ攻撃は外れた` });

    hands[selected[0]] = miracleCard;
    selected.splice(0, selected.length);
    miracle[player] = null;

    currentAction.type = "attackSelecting";
    currentAction.target = player === "p1" ? "p2" : "p1";
  } else if (toolCard.name === "メンケアプロ") {
    if (rand < probability) {
      state.status[player].effect = "healing";
      events.push({
        label: `:heart: {${player}} に持続回復効果が付与された`,
      });
    } else {
      events.push({
        label: `:x: {${player}} に持続回復効果は付与されなかった`,
      });
    }

    hands[selected[0]] = miracleCard;
    selected.splice(0, selected.length);
    miracle[player] = null;

    currentAction.type = "attackSelecting";
    currentAction.target = player === "p1" ? "p2" : "p1";
  } else if (toolCard.name === "味方なし") {
    if (rand < probability)
      await handleInstantKillIfNoHeal(state, player, events);
    else events.push({ label: `:x: {${player}} の味方なし攻撃は外れた` });

    hands[selected[0]] = miracleCard;
    selected.splice(0, selected.length);
    miracle[player] = null;

    currentAction.type = "attackSelecting";
    currentAction.target = player === "p1" ? "p2" : "p1";
  }
}

export async function handleMiracleCancel(state, player, _events) {
  const opponent = player === "p1" ? "p2" : "p1";
  const hands = state.hands[player];
  const selected = state.selected[player];
  const { currentAction } = state;

  hands[selected[0]] = miracleCard;
  selected.splice(0, selected.length);
  miracle = null;

  currentAction.type = "attackSelecting";
  currentAction.target = opponent;
}

async function handleInstantKill(state, player, events) {
  const opponent = player === "p1" ? "p2" : "p1";

  const { status } = state;
  const hp = status[opponent].hp;
  status[opponent].hp = 0;

  events.push({
    label: `:skull_crossbones: {${opponent}} に ${hp} のダメージ`,
  });
}

async function handleInstantKillIfNoHeal(state, player, events) {
  const opponent = player === "p1" ? "p2" : "p1";

  const opponentHands = state.hands[opponent];
  if (!opponentHands.every((card) => card.type !== "heal")) {
    events.push({ label: `:x: {${opponent}} は回復カードを持っていた` });
    return;
  }

  await handleInstantKill(state, player, events);
}
