import { SlashCommandBuilder } from "discord.js";

import { CommandError } from "../CommandHandler.js";

import gameStates from "../database/gameStates.js";

import buildStateMsg from "../functions/buildStateMsg.js";

export default {
  data: new SlashCommandBuilder()
    .setName("refresh")
    .setDescription("ゲームUIを更新します"),
  execute: async (interaction) => {
    const { state } = gameStates.getByChannelId(interaction.channel.id);
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
    } else {
      throw new CommandError(
        "このコマンドはゲームの参加者がゲーム中のチャンネルでのみ実行できます"
      );
    }

    const opponentChannel = await interaction.guild.channels
      .fetch(state[opponent + "ChannelId"])
      .catch(() => null);
    if (!opponentChannel)
      throw new CommandError("対戦相手のチャンネルを取得できません");

    await interaction.deferReply({ ephemeral: true });

    await interaction.channel.messages.edit(
      state[player + "MainMsgId"],
      await buildStateMsg(state, player, interaction.guild)
    );
    await opponentChannel.messages.edit(
      state[opponent + "MainMsgId"],
      await buildStateMsg(state, opponent, interaction.guild)
    );

    await interaction.editReply({
      content: ":white_check_mark: ゲームUIを更新しました",
      ephemeral: true,
    });
  },
};
