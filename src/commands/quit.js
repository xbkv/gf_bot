import { SlashCommandBuilder } from "discord.js";

import { CommandError } from "../CommandHandler.js";

import gameStates from "../database/gameStates.js";

export default {
  data: new SlashCommandBuilder()
    .setName("quit")
    .setDescription("ゲームを中断します"),
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

    gameStates.delete(id);

    await interaction.reply({
      content: `:warning: ゲームを中断しました
:information_source: このチャンネルは3分後に削除されます`,
    });
    const opponentMsg = await opponentChannel.send({
      content: `:warning: ${interaction.user} がゲームを中断しました
:information_source: このチャンネルは3分後に削除されます`,
    });

    new Promise((resolve) => setTimeout(resolve, 1000 * 60 * 3))
      .then(async () => {
        await interaction.channel.delete();
        await opponentChannel.delete();
      })
      .catch(async () => {
        await interaction.editReply({
          content: `:warning: ゲームを中断しました
:boom: チャンネルの削除に失敗しました`,
        });
        await opponentMsg.edit({
          content: `:warning: ゲームを中断しました
:boom: チャンネルの削除に失敗しました`,
        });
      });
  },
};
