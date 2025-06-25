import { CommandError } from "../CommandHandler.js";

import gameStates from "../database/gameStates.js";

import buildStateMsg from "../functions/buildStateMsg.js";

export default {
  data: { name: "selectCardButton" },
  execute: async (interaction) => {
    const idx = Number(interaction.customId.split("#")[1]);

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
    } else
      throw new CommandError("ゲームに参加しているメンバーのみが操作できます");

    const opponentChannel = await interaction.guild.channels
      .fetch(state[opponent + "ChannelId"])
      .catch(() => null);
    if (!opponentChannel)
      throw new CommandError("対戦相手のチャンネルを取得できません");

    const { currentAction, selected, hands } = state;
    if (currentAction.target !== player) return;
    if (
      currentAction.type !== "attackSelecting" &&
      currentAction.type !== "defendSelecting" &&
      currentAction.type !== "transactionDefendSelecting"
    )
      return;

    if (currentAction.type === "defendSelecting") {
      const card = hands[player][idx];
      console.log("[selectCardButton] 選択カード:", card.name, "type:", card.type, "canDefend:", card.canDefend);

      if (
        card.type !== "defense" &&
        card.type !== "tool" &&
        card.type !== "both" &&
        !card.canDefend
      ) {
        console.log("[selectCardButton] 選択不可: 条件に一致せず");
        return;
      }
    }
    if (
      currentAction.type === "attackSelecting" &&
      selected[player][0] === idx &&
      hands[player][selected[player][0]].type === "attack"
    ) {
      // 攻撃カードを選択中に先頭の攻撃カードを選択解除した場合、
      // すべてのカードを選択解除する
      selected[player] = [];
    } else {
      console.log("[selectCardButton] 選択前:", selected[player].slice());

      if (selected[player].includes(idx)) {
        selected[player] = selected[player].filter((i) => i !== idx);
        console.log(`[selectCardButton] カード ${idx} を選択解除`);
      } else {
        selected[player].push(idx);
        console.log(`[selectCardButton] カード ${idx} を選択`);
      }

      console.log("[selectCardButton] 選択後:", selected[player].slice());
    }
    gameStates.set(id, state);

    await interaction.update(
      await buildStateMsg(state, player, interaction.guild)
    );
    await opponentChannel.messages.edit(
      state[opponent + "MainMsgId"],
      await buildStateMsg(state, opponent, interaction.guild)
    );
  },
};
