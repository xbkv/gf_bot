import { CommandError } from "../CommandHandler.js";

import gameStates from "../database/gameStates.js";

import buildStateMsg from "../functions/buildStateMsg.js";
import handleGameSet from "../functions/handleGameSet.js";
import { handleAttack } from "../functions/cardActions/handleAttack.js";
import {
  handleBuyRequest,
  handleSell,
} from "../functions/cardActions/handleTransaction.js";
import { handleMiracleConvert } from "../functions/cardActions/handleMiracle.js";

export default {
  data: { name: "defendConfirmButton" },
  execute: async (interaction) => {
    console.log("[defendConfirmButton] called");
    const { id, state } = gameStates.getByChannelId(interaction.channel.id);
    let player;
    let opponent;
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
    if (
      currentAction.type !== "defendSelecting" &&
      currentAction.type !== "transactionDefendSelecting"
    )
      return;

    const events = [];
    const opponentFirstSelectedIdx = selected[opponent][0];
    const opponentFirstSelected = hands[opponent][opponentFirstSelectedIdx];

    switch (opponentFirstSelected.type) {
      case "attack":
      case "yokoyari":
      case "both":
        const defenseCardIdx = selected[player][0];
        const defenseCard = hands[player][defenseCardIdx];
        const isUsingMiracle = defenseCard?.type === "miracle";

        if (isUsingMiracle) await handleMiracleConvert(state, player, events);
        else await handleAttack(state, player, events, defenseCard);
        break;
      case "transaction":
        if (opponentFirstSelected.name === "売る")
          await handleSell(state, player, events);
        else if (opponentFirstSelected.name === "買う")
          await handleBuyRequest(state, player, events);
        else return;
        break;
      default:
        return;
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
