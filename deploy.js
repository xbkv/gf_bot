import botConfig from "./src/botConfig.js";
import { mongodb } from "./src/database/db.js";

import deployCommands from "./src/functions/deployCommands.js";

await deployCommands(botConfig.guildIds);
await mongodb.close();
