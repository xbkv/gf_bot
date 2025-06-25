import { CommandError } from "../CommandHandler.js";
import characters from "../database/characters.js";
import metaCards from "../database/metaCards.js";

function getRandomCardFromMeta() {
  const candidates = metaCards.metaCards.filter((card) => card.type !== "miracle");
  if (candidates.length === 0) throw new Error("カード候補がありません");
  const randomIndex = Math.floor(Math.random() * candidates.length);
  return candidates[randomIndex];
}


export default async function fillHands(_userId, hands) {
  let count = 0;
  while (hands.length < 10) {
    const card = getRandomCardFromMeta();
    if (card) hands.push(card);
    if (++count > 50) throw new Error("カード生成が50回試行しても失敗しました");
  }
  console.log("手札生成成功", hands.map(c => c.name));
}

