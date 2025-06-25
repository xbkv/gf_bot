import { REST, Routes } from "discord.js";

import botConfig from "../botConfig.js";
import CommandHandler from "../CommandHandler.js";

const commands = CommandHandler.commands.map((c) => c.data.toJSON());
const rest = new REST({ version: "10" }).setToken(botConfig.token);

export default async function deployCommands(guildIds) {
  try {
    for (const guildId of guildIds) {
      const data = await rest.put(
        Routes.applicationGuildCommands(botConfig.clientId, guildId),
        { body: commands },
      );
      console.log(`[コマンド登録完了] guildId: ${guildId} (${data.length}件)`);
    }
  } catch (e) {
    console.error(e);
  }
}
