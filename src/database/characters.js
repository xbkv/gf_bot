import { mongodb } from "./db.js";

export class Characters {
  constructor() {
    this.db = mongodb.db("TestCard");
    this.characters = this.db.collection("characters");
  }

  async init() {
    const miracleCards = await this.characters
      .find({ type: "miracle" })
      .toArray();
    if (miracleCards.length > 0) {
      this.miracleAttackPowerMinMax = {
        min: Math.min(...miracleCards.map((c) => c.attackPower)),
        max: Math.max(...miracleCards.map((c) => c.attackPower)),
      };
    } else {
      this.miracleAttackPowerMinMax = { min: 0, max: 1 }; // デフォルト値
    }
  }

  getMiracleProbability(attackPower) {
    const { min, max } = this.miracleAttackPowerMinMax;
    const minProbability = 0.15;
    return (
      minProbability +
      ((1 - minProbability) * (attackPower - min)) / (max - min)
    );
  }

  async get(name) {
    return await this.characters.findOne({ name });
  }
}

const characters = new Characters();
await characters.init();

export default characters;
