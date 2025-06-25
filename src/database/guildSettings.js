import { sqlite } from "./db.js";

export class GuildSettings {
  constructor() {}

  #parseValue(value) {
    if (!value) return;
    return JSON.parse(value);
  }

  get(guildId, key) {
    return this.#parseValue(
      sqlite
        .prepare(
          `SELECT value FROM guildSettings WHERE guildId = ? AND key = ?`
        )
        .pluck()
        .get(guildId, key)
    );
  }

  getAllAcrossGuilds(key) {
    return sqlite
      .prepare(`SELECT value FROM guildSettings WHERE key = ?`)
      .pluck()
      .all(key)
      .map((entry) => this.#parseValue(entry));
  }

  set(guildId, key, value) {
    sqlite
      .prepare(`INSERT OR REPLACE INTO guildSettings VALUES (?, ?, ?)`)
      .run(guildId, key, JSON.stringify(value));
  }

  delete(guildId, key) {
    sqlite
      .prepare(`DELETE FROM guildSettings WHERE guildId = ? AND key = ?`)
      .run(guildId, key);
  }
}

export default new GuildSettings();
