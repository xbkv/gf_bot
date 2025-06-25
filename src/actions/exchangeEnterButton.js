import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { CommandError } from "../CommandHandler.js";

import gameStates from "../database/gameStates.js";

import buildStateMsg from "../functions/buildStateMsg.js";
import handleGameSet from "../functions/handleGameSet.js";

function buildExchangeStateMsg(orgStatus, currentStatus, noteText) {
  const orgTotal = orgStatus.hp + orgStatus.mp + orgStatus.coin;
  const newTotal = currentStatus.hp + currentStatus.mp + currentStatus.coin;
  const lines = [
    "## :currency_exchange: ステータス両替",
    `- :heart: HP: \`${orgStatus.hp}\` → \`${currentStatus.hp}\``,
    `- :magic_wand: MP: \`${orgStatus.mp}\` → \`${currentStatus.mp}\``,
    `- :coin: COIN: \`${orgStatus.coin}\` → \`${currentStatus.coin}\``,
    `\n合計: \`${newTotal}/${orgTotal}\``,
  ];

  let isReady = false;
  if (orgTotal > newTotal)
    lines.push(
      `:warning: 元の合計値より ${orgTotal - newTotal} 不足しています`
    );
  else if (orgTotal < newTotal)
    lines.push(`:warning: 元の合計値を ${newTotal - orgTotal} 超過しています`);
  else isReady = true;

  if (noteText) lines.push(noteText);

  const components = [];
  for (const key of ["hp", "mp", "coin"]) {
    const newValue = currentStatus[key];
    const emoji = {
      hp: "❤️",
      mp: "🪄",
      coin: "🪙",
    }[key];

    components.push(
      new ActionRowBuilder().setComponents(
        new ButtonBuilder()
          .setCustomId(`exchangeModifyByValueButton#${key}`)
          .setLabel("直接入力")
          .setEmoji(emoji)
          .setStyle(ButtonStyle.Secondary),
        ...[-5, -1, 1, 5].map((delta) => {
          return new ButtonBuilder()
            .setCustomId(`exchangeModifyByDeltaButton#${key}#${delta}`)
            .setLabel(delta < 0 ? `${delta}` : `+${delta}`)
            .setDisabled(newValue + delta < 0 || newValue + delta > orgTotal)
            .setStyle(ButtonStyle.Secondary);
        })
      )
    );
  }

  components.push(
    new ActionRowBuilder().setComponents(
      new ButtonBuilder()
        .setCustomId("exchangeConfirmButton")
        .setLabel("確定する")
        .setDisabled(!isReady)
        .setStyle(ButtonStyle.Primary)
    )
  );

  return {
    content: lines.join("\n"),
    components,
    ephemeral: true,
  };
}

async function handleModifyEvent(i, interaction, orgStatus, currentStatus) {
  const [customId, key, deltaStr] = i.customId.split("#");

  if (customId === "exchangeModifyByDeltaButton") {
    const delta = Number(deltaStr);
    currentStatus[key] += delta;
    await i.update(buildExchangeStateMsg(orgStatus, currentStatus));
  }

  if (customId === "exchangeModifyByValueButton") {
    await i.showModal(
      new ModalBuilder()
        .setCustomId("exchangeModifyByValueModal")
        .setTitle(`${key.toUpperCase()}を直接入力`)
        .setComponents(
          new ActionRowBuilder().setComponents(
            new TextInputBuilder()
              .setCustomId("value")
              .setLabel(key.toUpperCase())
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        )
    );

    const modalInteraction = await i
      .awaitModalSubmit({
        filter: (i) =>
          i.user.id === interaction.user.id &&
          i.customId === "exchangeModifyByValueModal",
        time: 1000 * 60 * 5,
      })
      .catch(() => null);
    const valueStr = modalInteraction.fields.getTextInputValue("value");

    const value = Number(valueStr);
    if (isNaN(value) || value < 0) {
      const noteText = ":boom: 0以上の半角数字で入力してください";
      await modalInteraction.update(
        buildExchangeStateMsg(orgStatus, currentStatus, noteText)
      );
      return;
    }

    currentStatus[key] = value;
    await modalInteraction.update(
      buildExchangeStateMsg(orgStatus, currentStatus)
    );
  }
}

export default {
  data: { name: "exchangeEnterButton" },
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

    const { currentAction, status, selected, hands } = state;
    if (currentAction.target !== player) return;
    if (currentAction.type !== "exchangeEntering") return;

    const orgStatus = { ...status[player] };
    const currentStatus = { ...status[player] };
    Object.freeze(orgStatus);
    const response = await interaction.reply({
      ...buildExchangeStateMsg(orgStatus, currentStatus),
      fetchReply: true,
    });

    const collector = response.createMessageComponentCollector({
      filter: (i) =>
        i.user.id === interaction.user.id && i.customId.startsWith("exchange"),
      idle: 1000 * 60 * 5,
    });

    collector.on("collect", async (i) => {
      if (i.customId !== "exchangeConfirmButton") {
        await handleModifyEvent(i, interaction, orgStatus, currentStatus).catch(
          async (e) => {
            console.error(e);
            await interaction.editReply({
              content: `:boom: コマンドの実行中にエラーが発生しました: \`${e.toString()}\``,
              components: [],
            });
            collector.stop("error");
          }
        );
        return;
      }

      await i.deferUpdate();
      collector.stop();

      status[player] = currentStatus;
      hands[player] = hands[player].filter(
        (_card, idx) => !selected[player].includes(idx)
      );
      selected[player] = [];
      currentAction.type = "attackSelecting";
      currentAction.target = opponent;

      gameStates.set(id, state);

      const events = [];
      events.push({
        label: `:currency_exchange: {${player}} はステータスを両替した`,
      });

      await interaction.message.edit(
        await buildStateMsg(state, player, interaction.guild, events)
      );
      await opponentChannel.messages.edit(
        state[opponent + "MainMsgId"],
        await buildStateMsg(state, opponent, interaction.guild, events)
      );

      await handleGameSet(state, interaction.guild);
    });

    collector.on("end", async () => {
      await interaction.deleteReply();
    });
  },
};
