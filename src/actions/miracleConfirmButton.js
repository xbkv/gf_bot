import { CommandError } from "../CommandHandler.js";

import gameStates from "../database/gameStates.js";

import buildStateMsg from "../functions/buildStateMsg.js";
import handleGameSet from "../functions/handleGameSet.js";

import {
  handleMiracleCancel,
  handleMiracleConfirm,
} from "../functions/cardActions/handleMiracle.js";

export default {
  data: { name: "miracleConfirmButton" },
  execute: async (interaction) => {
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

    const { currentAction } = state;
    if (currentAction.target !== player) return;
    if (currentAction.type !== "miracleConfirming") return;

    const confirmed = interaction.customId.split("#")[1] === "1";

    const events = [];
    if (confirmed) await handleMiracleConfirm(state, player, events);
    else await handleMiracleCancel(state, player, events);
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
