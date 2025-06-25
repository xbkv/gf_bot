import { CommandError } from "../CommandHandler.js";

import gameStates from "../database/gameStates.js";

import buildStateMsg from "../functions/buildStateMsg.js";
import handleGameSet from "../functions/handleGameSet.js";
import fillHands from "../functions/fillHands.js";

import { resolveUnknownAttackPower } from "../functions/cardActions/handleAttack.js";
import handleHeal from "../functions/cardActions/handleHeal.js";
import { handleMiracleConvert } from "../functions/cardActions/handleMiracle.js";

export default {
  data: { name: "attackConfirmButton" },
  execute: async (interaction) => {
    const { id, state } = gameStates.getByChannelId(interaction.channel.id);
    let player, opponent;

    if (state.p1MemberId === interaction.user.id) {
      if (state.p1ChannelId !== interaction.channel.id) return;
      player = "p1";
      opponent = "p2";
    } else if (state.p2MemberId === interaction.user.id) {
      if (state.p2ChannelId !== interaction.channel.id) return;
      player = "p2";
      opponent = "p1";
    } else return;

    const opponentChannel = await interaction.guild.channels
      .fetch(state[opponent + "ChannelId"])
      .catch(() => null);
    if (!opponentChannel)
      throw new CommandError("対戦相手のチャンネルを取得できません");

    const { currentAction, selected, hands } = state;

    if (currentAction.target !== player) return;
    if (currentAction.type !== "attackSelecting") return;

    const events = [];

    console.log("[attackConfirmButton] selected:", selected[player]);
    if (selected[player].length === 0) {
      // 祈り処理
      hands[player].shift();
      await fillHands(state[player + "MemberId"], hands[player]);
      events.push({ label: `:pray: {${player}} は祈った` });

      state.currentAction.type = "attackSelecting";
      state.currentAction.target = opponent;
    } else {
      const firstSelectedIdx = selected[player][0];
      const firstSelected = hands[player][firstSelectedIdx];

      console.log("[attackConfirmButton] selected card:", firstSelected.name, firstSelected.type);
      
      switch (firstSelected.type) {
        case "attack":
        case "yokoyari":
        case "both": // ここで both を許容
          resolveUnknownAttackPower(state, player);
          currentAction.type = "defendSelecting";
          currentAction.target = opponent;
          break;

        case "heal":
          await handleHeal(state, player, events);
          break;

        case "miracle":
          await handleMiracleConvert(state, player, events);
          break;

        case "transaction":
          if (firstSelected.name === "両替") {
            currentAction.type = "exchangeEntering";
            currentAction.target = player;
          } else {
            currentAction.type = "transactionDefendSelecting";
            currentAction.target = opponent;
          }
          break;

        default:
          console.warn("[attackConfirmButton] 不明なカードタイプ:", firstSelected);
          return;
      }
    }

    gameStates.set(id, state);

    await interaction.update(
      await buildStateMsg(state, player, interaction.guild, events)
    );
    await opponentChannel.messages.edit(
      state[opponent + "MainMsgId"],
      await buildStateMsg(state, opponent, interaction.guild, events)
    );

    await handleGameSet(state, interaction.guild);
  },
};
