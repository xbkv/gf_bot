import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import setCategory from "./admin/setCategory.js";

export default {
  data: new SlashCommandBuilder()
    .setName("admin")
    .setDescription("管理者用の各種設定を行います")
    .addSubcommand(setCategory.data)
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  execute: async (interaction) => {
    const subcommandName = interaction.options.getSubcommand();
    if (subcommandName === "set_category")
      await setCategory.execute(interaction);
  },
};
