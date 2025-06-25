import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

import { CommandError } from "../CommandHandler.js";

import guildSettings from "../database/guildSettings.js";
import gameStates from "../database/gameStates.js";

import buildStateMsg from "../functions/buildStateMsg.js";
import fillHands from "../functions/fillHands.js";
import users from "../database/users.js";

const PNC_EMOJI_STR = "<a:pnc:1382712464268984340>"

async function createPrivateChannel(member, parentId) {
  const channel = await member.guild.channels.create({
    name: `battle-${member.user.username}`,
    type: ChannelType.GuildText,
    parent: parentId || undefined,
    permissionOverwrites: [
      {
        id: member.guild.roles.everyone.id,
        deny: PermissionFlagsBits.ViewChannel,
      },
      {
        id: member.id,
        allow: PermissionFlagsBits.ViewChannel,
      },
      {
        id: member.client.user.id,
        allow: PermissionFlagsBits.ViewChannel,
      },
    ],
  });

  return channel;
}

async function initState(member, targetMember, bet) {
  const firstMove = Math.random() < 0.5 ? "p1" : "p2";
  const state = {
    guildId: member.guild.id,
    p1MemberId: member.id,
    p2MemberId: targetMember.id,
    p1ChannelId: "",
    p2ChannelId: "",
    p1MainMsgId: "",
    p2MainMsgId: "",
    bet,
    status: {
      p1: { hp: 40, mp: 10, coin: 20, effect: null },
      p2: { hp: 40, mp: 10, coin: 20, effect: null },
    },
    currentAction: {
      target: firstMove,
      type: "attackSelecting",
    },
    hands: { p1: [], p2: [] },
    selected: { p1: [], p2: [] },
    miracle: { p1: null, p2: null },
  };

  await fillHands(state.p1MemberId, state.hands.p1);
  await fillHands(state.p2MemberId, state.hands.p2);

  return state;
}

export default {
  data: new SlashCommandBuilder()
    .setName("start")
    .setDescription("指定したメンバーと対戦を開始します")
    .addUserOption((option) =>
      option.setName("member").setDescription("対戦相手").setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("pnc_currency")
        .setDescription("賭けるPNCの量")
        .setMinValue(0)
        .setRequired(false)
    ),
  execute: async (interaction) => {
    const member = interaction.member;
    const opponentMember = interaction.options.getMember("member");
    const pncCurrency = interaction.options.getInteger("pnc_currency");
    if (member.id === opponentMember.id)
      throw new CommandError("自分と対戦はできません");

    if (
      !interaction.channel
        .permissionsFor(opponentMember)
        .has(PermissionFlagsBits.ViewChannel)
    )
      throw new CommandError(
        "対戦相手はこのチャンネルの閲覧権限が無いため対戦を申し込めません"
      );

    const dbUser = await users.get(member.id);
    const opponentDbUser = await users.get(opponentMember.id);
    if (!dbUser || !opponentDbUser)
      throw new CommandError("ユーザー情報を取得できません");
    if (
      pncCurrency !== undefined &&
      (dbUser.balance < pncCurrency ||
        opponentDbUser.balance < pncCurrency)
    )
      throw new CommandError("所持PNCが足りません");

    const response = await interaction.reply({
      content: `${opponentMember}
${member}さんがあなたに対戦を申し込んでいます
${PNC_EMOJI_STR} \`${pncCurrency || 0}\`
承諾する場合は、以下のボタンをクリックしてください`,
      components: [
        new ActionRowBuilder().setComponents(
          new ButtonBuilder()
            .setCustomId("acceptButton")
            .setEmoji("✅")
            .setLabel("承諾する")
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId("rejectButton")
            .setEmoji("❌")
            .setLabel("拒否する")
            .setStyle(ButtonStyle.Secondary)
        ),
      ],
      allowedMentions: {
        users: [opponentMember.id],
      },
    });
    const buttonInteraction = await response.awaitMessageComponent({
      filter: (i) =>
        i.user.id === opponentMember.id &&
        (i.customId === "acceptButton" || i.customId === "rejectButton"),
      time: 1000 * 60 * 5,
    });
    if (buttonInteraction.customId === "rejectButton")
      throw new CommandError("対戦申し込みが拒否されました", buttonInteraction);

    await buttonInteraction.update({
      content: `:white_check_mark: ${opponentMember}さんが対戦申し込みを承諾しました
:hourglass: チャンネルを作成中...`,
      components: [],
    });

    const state = await initState(member, opponentMember, pncCurrency).catch(
      (e) => {
        console.error("initStateエラー:", e);
        throw new CommandError("初期化中にエラーが発生しました", buttonInteraction);
      }
    );

    const categoryChannelId = guildSettings.get(
      interaction.guildId,
      "gameCategoryChannelId"
    );
    console.log(categoryChannelId)
    const p1Channel = await createPrivateChannel(member, categoryChannelId);
    const p2Channel = await createPrivateChannel(
      opponentMember,
      categoryChannelId
    );
    const p1MainMsg = await p1Channel.send(
      await buildStateMsg(state, "p1", interaction.guild)
    );
    const p2MainMsg = await p2Channel.send(
      await buildStateMsg(state, "p2", interaction.guild)
    );
    state.p1ChannelId = p1Channel.id;
    state.p2ChannelId = p2Channel.id;
    state.p1MainMsgId = p1MainMsg.id;
    state.p2MainMsgId = p2MainMsg.id;

    gameStates.add(state);
    await buttonInteraction.editReply({
      content: `:white_check_mark: ${opponentMember}さんが対戦申し込みを承諾しました
:white_check_mark: チャンネルを作成しました
- ${member}: ${p1Channel}
- ${opponentMember}: ${p2Channel}`,
      components: [],
    });
  },
};
