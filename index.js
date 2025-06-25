import { Client, Events, GatewayIntentBits } from "discord.js";

import botConfig, { writeCurrentConfig } from "./src/botConfig.js";
import CommandHandler from "./src/CommandHandler.js";
import deployCommands from "./src/functions/deployCommands.js";
import { mongodb } from "./src/database/db.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
});

const commandHandler = new CommandHandler();
client.on(Events.InteractionCreate, (i) => commandHandler.handleCommand(i));

client.once(Events.ClientReady, async (c) => {
  console.log(`[起動完了] ${c.user.tag}`);

  const guilds = await c.guilds.fetch();
  for (const guild of guilds.values()) {
    if (botConfig.guildIds.includes(guild.id)) continue;
    console.log(`[サーバー追加] ${guild.name}`);
    await deployCommands([guild.id]);

    botConfig.guildIds.push(guild.id);
    writeCurrentConfig();
  }
});

client.on(Events.GuildCreate, async (guild) => {
  if (botConfig.guildIds.includes(guild.id)) return;
  console.log(`[サーバー追加] ${guild.name}`);
  await deployCommands([guild.id]);

  botConfig.guildIds.push(guild.id);
  writeCurrentConfig();
});

client.on(Events.GuildDelete, (guild) => {
  console.log(`[サーバー削除] ${guild.name}`);

  botConfig.guildIds = botConfig.guildIds.filter((id) => id !== guild.id);
  writeCurrentConfig();
});

process.on("SIGINT", () => {
  console.log("[終了]");
  mongodb.close();
  client.destroy();
  process.exit();
});

client.login(botConfig.token);
