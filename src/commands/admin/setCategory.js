import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandSubcommandBuilder,
} from "discord.js";

import { CommandError } from "../../CommandHandler.js";

import guildSettings from "../../database/guildSettings.js";

export default {
  data: new SlashCommandSubcommandBuilder()
    .setName("set_category")
    .setDescription("対戦用チャンネルの作成先カテゴリを設定します")
    .addChannelOption((option) =>
      option
        .setName("category")
        .setDescription("対戦用チャンネルの作成先カテゴリ")
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true)
    ),
  execute: async (interaction) => {
    const categoryChannel = interaction.options.getChannel("category");

    const botMember = interaction.guild.members.me;
    if (
      !categoryChannel
        .permissionsFor(botMember)
        .has(PermissionFlagsBits.ManageChannels)
    )
      throw new CommandError(
        "このカテゴリにチャンネルを作成する権限が付与されていません"
      );

    guildSettings.set(
      interaction.guildId,
      "gameCategoryChannelId",
      categoryChannel.id
    );

    await interaction.reply({
      content: `:white_check_mark: 対戦用チャンネルの作成先カテゴリを${categoryChannel}に設定しました`,
      ephemeral: true,
    });
  },
};
