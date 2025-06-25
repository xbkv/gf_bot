import { sqlite } from "./db.js";

export class GameStates {
  constructor() {}

  #parseValue(value) {
    if (!value) return;
    return JSON.parse(value);
  }

  get(id) {
    const result = sqlite
      .prepare(`SELECT * FROM gameStates WHERE id = ?`)
      .get(id);
    if (!result) return;
    return {
      ...result,
      state: this.#parseValue(result.state),
    };
  }

  getByChannelId(channelId) {
    const result = sqlite
      .prepare(
        `SELECT * FROM gameStates WHERE p1ChannelId = ? OR p2ChannelId = ?`
      )
      .get(channelId, channelId);
    if (!result) return;
    return {
      ...result,
      state: this.#parseValue(result.state),
    };
  }

  add(state) {
    sqlite
      .prepare(
        `INSERT INTO gameStates (
          guildId,
          p1MemberId,
          p2MemberId,
          p1ChannelId,
          p2ChannelId,
          state
        ) VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        state.guildId,
        state.p1MemberId,
        state.p2MemberId,
        state.p1ChannelId,
        state.p2ChannelId,
        JSON.stringify(state)
      );
  }

  set(id, state) {
    sqlite
      .prepare(`INSERT OR REPLACE INTO gameStates VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(
        id,
        state.guildId,
        state.p1MemberId,
        state.p2MemberId,
        state.p1ChannelId,
        state.p2ChannelId,
        JSON.stringify(state)
      );
  }

  delete(id) {
    sqlite.prepare(`DELETE FROM gameStates WHERE id = ?`).run(id);
  }
}

export default new GameStates();
