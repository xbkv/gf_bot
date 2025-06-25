import users from "../database/users.js";

export default async function handleGameSet(state, guild) {
  const { status } = state;

  let gameSet = false;
  if (status.p1.hp <= 0) {
    status.p1.hp = 0;
    gameSet = true;
    status.winner = "p1";
    status.loser = "p2";
  } else if (status.p2.hp <= 0) {
    status.p2.hp = 0;
    gameSet = true;
    status.winner = "p2";
    status.loser = "p1";
  }
  if (!gameSet) return false;

  const winnerUser = await users.get(state[status.winner + "MemberId"]);
  const loserUser = await users.get(state[status.loser + "MemberId"]);
  if (!winnerUser || !loserUser) return;
  winnerUser.rate += 100;
  loserUser.rate -= 100;
  if (state.bet !== undefined) {
    winnerUser.coin += state.bet;
    loserUser.coin -= state.bet;
  }
  await users.set(state[status.winner + "MemberId"], winnerUser);
  await users.set(state[status.loser + "MemberId"], loserUser);

  const p1Channel = await guild.channels
    .fetch(state.p1ChannelId)
    .catch(() => null);
  const p2Channel = await guild.channels
    .fetch(state.p2ChannelId)
    .catch(() => null);
  const winner = await guild.members
    .fetch(state[status.winner + "MemberId"])
    .catch(() => null);
  const loser = await guild.members
    .fetch(state[status.loser + "MemberId"])
    .catch(() => null);
  if (!p1Channel || !p2Channel || !winner || !loser) return;

  await p1Channel.messages.edit(state.p1MainMsgId, {
    content: `## ${winner}の勝利！
:trophy: レート変動:
- ${winner}: \`${winnerUser.rate - 100}\` → \`${winnerUser.rate}\`
- ${loser}: \`${loserUser.rate + 100}\` → \`${loserUser.rate}\``,
    components: [],
  });
  await p2Channel.messages.edit(state.p2MainMsgId, {
    content: `## ${winner}の勝利！
:trophy: レート変動:
- ${winner}: \`${winnerUser.rate - 100}\` → \`${winnerUser.rate}\`
- ${loser}: \`${loserUser.rate + 100}\` → \`${loserUser.rate}\``,
    components: [],
  });

  return true;
}
