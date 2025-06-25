import { Long, mongodb } from "./db.js";

export class Users {
  constructor() {
    this.db = mongodb.db("paypay_bot");
    this.collection = this.db.collection("users");
    // console.log(this.db, this.collection);
  }

  async getCardCollection(userId) {
    return await this.collection.distinct("ownedCards", { userId });
  }

  async get(user_id) {
    const longId = Long.fromString(String(user_id));
    return await this.collection.findOne({ user_id: longId });
  }

  async set(userId, data) {
    await this.collection.updateOne(
      { userId },
      { $set: data },
      { upsert: true }
    );
  }

  async dumpAll() {
    const allUsers = await this.collection.find({}).toArray();
    console.log(allUsers);
    return allUsers;
  }
}

export default new Users();
