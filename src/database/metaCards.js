import { readFileSync } from "fs";

import botConfig from "../botConfig.js";

export class MetaCards {
  constructor() {
    this.metaCards = JSON.parse(readFileSync(botConfig.metaCardsDbPath));
    Object.freeze(this.metaCards);
  }

  // 売る・買うなどの取引カードをランダムで取得
  getRandomTransactionCard() {
    const cards = this.metaCards.filter((c) => c.type === "transaction");
    const card = cards[Math.floor(Math.random() * cards.length)];

    return card;
  }

  // ツールカードをランダムで取得
  // 攻撃回避等のツールカードは防御時にしか効果を発揮しないため、
  // defendSelectableによって絞り込めるようになっている
  getRandomToolCard(miracleCard, defendSelectable = false) {
    const cards = this.metaCards.filter(
      (c) => c.type === "tool" && c.defendSelectable === defendSelectable
    );
    const card = cards[Math.floor(Math.random() * cards.length)];

    return {
      ...card,
      attackPower: miracleCard.attackPower,
    };
  }

  getByName(name) {
    return this.metaCards.find((c) => c.name === name);
  }
}

export default new MetaCards();
