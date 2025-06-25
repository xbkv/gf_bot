import admin from "./commands/admin.js";
import start from "./commands/start.js";
import refresh from "./commands/refresh.js";
import quit from "./commands/quit.js";

import selectCardButton from "./actions/selectCardButton.js";
import attackConfirmButton from "./actions/attackConfirmButton.js";
import defendConfirmButton from "./actions/defendConfirmButton.js";
import buyConfirmbutton from "./actions/buyConfirmbutton.js";
import miracleConfirmButton from "./actions/miracleConfirmButton.js";
import exchangeEnterButton from "./actions/exchangeEnterButton.js";

export class CommandError extends Error {
  constructor(message, interaction) {
    super(message);
    this.name = "CommandError";
    this.interaction = interaction;
  }
}

export default class CommandHandler {
  static commands = [admin, start, refresh, quit];
  static actions = [
    selectCardButton,
    attackConfirmButton,
    defendConfirmButton,
    buyConfirmbutton,
    miracleConfirmButton,
    exchangeEnterButton,
  ];
  static ignoreList = [
    "acceptButton",
    "rejectButton",
    "exchangeModifyByValueButton",
    "exchangeModifyByDeltaButton",
    "exchangeModifyByValueModal",
    "exchangeConfirmButton",
  ];

  constructor() {}

  async handleCommand(interaction) {
    let commandName, command;
    if (
      interaction.isChatInputCommand() ||
      interaction.isContextMenuCommand() ||
      interaction.isAutocomplete()
    ) {
      commandName = interaction.commandName;
      command = CommandHandler.commands.find(
        (c) => c.data.name === commandName
      );
    } else if (
      interaction.isModalSubmit() ||
      interaction.isButton() ||
      interaction.isAnySelectMenu()
    ) {
      commandName = interaction.customId.split("#")[0];
      command = CommandHandler.actions.find((c) => c.data.name === commandName);
    }

    if (CommandHandler.ignoreList.includes(commandName)) return;

    if (!command) {
      console.error(`不明なコマンド: ${commandName}`);
      return;
    }

    if (interaction.isAutocomplete()) {
      try {
        await command.autocomplete(interaction);
      } catch (e) {
        console.error(e);
      }
      return;
    }

    try {
      await command.execute(interaction);
    } catch (e) {
      const errorInteraction = e.interaction || interaction;
      let message;
      if (e instanceof CommandError) {
        message = `:boom: ${e.message}`;
      } else if (e.code === "InteractionCollectorError") {
        message = `:boom: 一定時間以内に操作がなかったため、コマンドの実行を中止しました`;
      } else {
        console.error(e);
        message = `:boom: コマンドの実行中にエラーが発生しました: \`${e.toString()}\``;
      }

      if (
        (errorInteraction.isChatInputCommand() ||
          errorInteraction.isButton()) &&
        (errorInteraction.replied || errorInteraction.deferred)
      ) {
        await errorInteraction
          .editReply({
            content: message,
            components: [],
            files: [],
            ephemeral: true,
          })
          .catch((e) => console.error(e));
      } else {
        await errorInteraction
          .reply({
            content: message,
            ephemeral: true,
          })
          .catch((e) => console.error(e));
      }
    }
  }
}
