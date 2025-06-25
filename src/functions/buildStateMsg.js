import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

import renderStateImg from "./renderStateImg.js";

// 「確定する」ボタンをクリックできるか
function isReady(state, player) {
  const currentAction = state.currentAction;
  const selected = state.selected[player];
  const hands = state.hands[player];
  const selectedResolved = selected.map((idx) => hands[idx]); // ← ここに移動

  console.log("[isReady] currentAction:", currentAction);
  console.log("[isReady] selected indexes:", selected);

  if (selected.length === 0) {
    if (currentAction.type === "attackSelecting") {
      const allUndefined = hands.every((card) => card.attackPower === undefined);
      console.log("[isReady] No card selected. attackSelecting. all attackPower undefined:", allUndefined);
      return allUndefined;
    }
    if (currentAction.type === "defendSelecting") return true;

    if (currentAction.type === "transactionDefendSelecting") {
      const miracles = hands.filter((card) => card.type === "miracle");
      if (miracles.length === 0) return true;
      const mpMinimum = Math.min(...miracles.map((card) => card.attackPower));
      return state.status[player].mp < mpMinimum;
    }

    return false;
  }

  console.log("[isReady] Selected cards:", selectedResolved.map((c) => c.name));

  if (currentAction.type === "attackSelecting") {
    const first = selectedResolved[0];
    console.log("[isReady] Attack first card:", first.name, first.type, first.attackPower);

    if (first.attackPower === undefined) return false;

    const valid = selectedResolved.slice(1).every((card) =>
      card.type === "yokoyari" ||
      card.type === "both" ||
      card.attackPower !== undefined
    );

    console.log("[isReady] Attack group validity:", valid);
    return valid;
  }

  if (currentAction.type === "defendSelecting") {
    if (selected.length === 0) {
      console.log("[isReady] defendSelecting だが何も選択されていない");
      return true;
    }

    console.log("[isReady] defendSelectedResolved:", selectedResolved.map(c => ({
      name: c.name, type: c.type, def: c.defensePower, atk: c.attackPower
    })));

    return selectedResolved.every((card) =>
      card.type === "miracle" ||
      card.defensePower !== undefined ||
      (card.type === "both" && (card.defensePower !== undefined || card.attackPower !== undefined))
    );

  }

  if (currentAction.type === "transactionDefendSelecting") {
    const miracles = hands.filter((card) => card.type === "miracle");
    if (miracles.length === 0) return true;
    const mpMinimum = Math.min(...miracles.map((card) => card.attackPower));
    return state.status[player].mp < mpMinimum;
  }

  return false;
}


// 指定されたidxのカードがクリックできるか
function isCardSelectable(idx, state, player) {
  const currentAction = state.currentAction;
  const status = state.status[player];
  const selected = state.selected[player];
  const hands = state.hands[player];
  const card = hands[idx];

  if (selected.length === 0) {
    if (currentAction.type === "attackSelecting") {
      if (card.type === "miracle") return status.mp > card.attackPower;
      return (
        card.type === "attack" ||
        card.type === "yokoyari" ||
        card.type === "both" ||
        card.attackPower !== undefined
      );
    }

  if (currentAction.type === "defendSelecting") {
    if (card.type === "miracle") return status.mp > card.attackPower;
    return (
      card.type === "defense" ||
      card.type === "both" ||
      card.type === "reflect" || 
      card.defensePower !== undefined
    );
  }


    if (currentAction.type === "transactionDefendSelecting") {
      return card.type === "miracle" && status.mp > card.attackPower;
    }

    return false;
  }

  const firstSelectedIdx = selected[0];
  const firstSelected = hands[firstSelectedIdx];

  const table = {
    attack: () => card.type === "yokoyari" || idx === firstSelectedIdx,
    yokoyari: () => card.type === "yokoyari",
    defense: () =>
      card.type === "defense" ||
      card.type === "both" ||
      card.defensePower !== undefined,
    heal: () => idx === firstSelectedIdx,
    miracle: () => idx === firstSelectedIdx,
    transaction: () => {
      if (firstSelected.name === "売る")
        return selected.length < 2 || selected.includes(idx);
      return idx === firstSelectedIdx;
    },
    both: () => {
      if (currentAction.type === "attackSelecting") {
        return card.type === "yokoyari" || idx === firstSelectedIdx;
      }
      if (currentAction.type === "defendSelecting") {
        return (
          card.type === "both" ||
          card.type === "defense" ||
          card.defensePower !== undefined ||
          card.type === "miracle"
        );
      }
      return false;
    },
  };

  const func = table[firstSelected.type];
  if (!func) return false;

  return func();
}


// 対戦状況の埋め込みを作成
async function buildEmbed(state, player, guild, events) {
  const embed = new EmbedBuilder()
    .setTitle(":crossed_swords: 対戦状況")
    .setImage("attachment://state.webp");

  const lines = [];
  for (const p of ["p1", "p2"]) {
    const status = state.status[p];
    const member = await guild.members.fetch(state[p + "MemberId"]);
    lines.push(
      `### ${member}`,
      `- :heart: HP: \`${status.hp}\``,
      `- :magic_wand: MP: \`${status.mp}\``,
      `- :coin: COIN: \`${status.coin}\``
    );
  }
  lines.push("### --------------------");

  // ダメージ・支払いなどのイベントメッセージ
  for (const event of events)
    lines.push(
      // "{p1}" "{p2}" を実際のメンバー名に置換
      event.label.replace(
        /\{(p[1|2])\}/g,
        (_, player) =>
          guild.members.cache.get(state[player + "MemberId"]).displayName
      )
    );

  lines.push(
    `### :game_die: ${state.currentAction.target === player ? "あなた" : "相手"}のターンです`
  );

  embed.setDescription(lines.join("\n"));

  return embed;
}

// ボタンを作成
function buildComponents(state, player) {
  const components = [];
  if (state.currentAction.target !== player) return components;

  if (
    state.currentAction.type === "attackSelecting" ||
    state.currentAction.type === "defendSelecting" ||
    state.currentAction.type === "transactionDefendSelecting"
  ) {
    console.log("[buildComponents] currentAction:", state.currentAction);
    console.log("[buildComponents] selected[player]:", state.selected[player]);
    console.log(
      "[buildComponents] hands[player]:",
      state.hands[player].map((c, i) => `${i}:${c.name}(${c.type})`)
    );

    const buttons = [];
    for (let i = 0; i < state.hands[player].length; i++) {
      const isSelected = state.selected[player].includes(i);
      const canPress = isCardSelectable(i, state, player);
      console.log(`[buildComponents] Card ${i} - ${state.hands[player][i].name}: isSelected=${isSelected}, canPress=${canPress}`);
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`selectCardButton#${i}`)
          .setLabel((i + 1).toString())
          .setDisabled(!canPress)
          .setStyle(isSelected ? ButtonStyle.Primary : ButtonStyle.Secondary)
      );
    }

    const canPressConfirmButton = isReady(state, player);
    console.log("[buildComponents] canPressConfirmButton:", canPressConfirmButton);

    components.push(
      new ActionRowBuilder().setComponents(buttons.slice(0, 5)),
      new ActionRowBuilder().setComponents(buttons.slice(5, 10)),
      new ActionRowBuilder().setComponents(
        new ButtonBuilder()
          .setCustomId(
            state.currentAction.type === "attackSelecting"
              ? "attackConfirmButton"
              : "defendConfirmButton"
          )
          .setLabel("確定する")
          .setDisabled(!canPressConfirmButton)
          .setStyle(ButtonStyle.Success)
      )
    );
  }

  if (state.currentAction.type === "buyConfirming") {
    components.push(
      new ActionRowBuilder().setComponents(
        new ButtonBuilder()
          .setCustomId("buyConfirmButton#1")
          .setLabel("買う")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("buyConfirmButton#0")
          .setLabel("買わない")
          .setStyle(ButtonStyle.Secondary)
      )
    );
  }

  if (state.currentAction.type === "miracleConfirming") {
    components.push(
      new ActionRowBuilder().setComponents(
        new ButtonBuilder()
          .setCustomId("miracleConfirmButton#1")
          .setLabel("発動する")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("miracleConfirmButton#0")
          .setLabel("発動しない")
          .setStyle(ButtonStyle.Secondary)
      )
    );
  }

  if (state.currentAction.type === "exchangeEntering") {
    components.push(
      new ActionRowBuilder().setComponents(
        new ButtonBuilder()
          .setCustomId("exchangeEnterButton")
          .setLabel("入力する")
          .setStyle(ButtonStyle.Primary)
      )
    );
  }

  return components;
}


// 与えられたstateからゲームのUIメッセージを作成
export default async function buildStateMsg(state, player, guild, events = []) {
  const embed = await buildEmbed(state, player, guild, events);
  const file = new AttachmentBuilder(await renderStateImg(state, player), {
    name: "state.webp",
  });
  const components = buildComponents(state, player);

  return {
    content: "",
    embeds: [embed],
    files: [file],
    components,
  };
}
