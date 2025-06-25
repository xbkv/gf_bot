import { CommandError } from "../CommandHandler.js";

export default function verifyCollection(collection) {
  if (collection.length < 10) {
    throw new CommandError("カードの枚数が足りません");
  }
  let lowRarityCount = 0;
  let highRarityCount = 0;
  for (const card of collection) {
    if (card.rarity < 6) lowRarityCount++;
    else highRarityCount++;
  }

  if (lowRarityCount < highRarityCount)
    throw new CommandError(
      "レアリティ6未満のカードが6以上のカードよりも少ないため、ゲームを開始できません"
    );
}
