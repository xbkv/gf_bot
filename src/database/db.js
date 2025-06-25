import Database from "better-sqlite3";
import { MongoClient } from "mongodb";

import botConfig from "../botConfig.js";

async function initializeMongoDB() {
  const mongodb = new MongoClient(botConfig.mongodbUri);
  await mongodb.connect();

  return mongodb;
}

function initializeSqlite() {
  const sqlite = new Database("main.db", {
    // verbose: console.log,
  });
  sqlite.pragma(`journal_mode = WAL`);

  sqlite
    .prepare(
      `CREATE TABLE IF NOT EXISTS guildSettings(
      guildId TEXT,
      key TEXT,
      value TEXT,
      PRIMARY KEY(guildId, key)
    )`
    )
    .run();

  sqlite
    .prepare(
      `CREATE TABLE IF NOT EXISTS gameStates(
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guildId TEXT NOT NULL,
      p1MemberId TEXT NOT NULL,
      p2MemberId TEXT NOT NULL,
      p1ChannelId TEXT NOT NULL UNIQUE,
      p2ChannelId TEXT NOT NULL UNIQUE,
      state TEXT NOT NULL
    )`
    )
    .run();

  return sqlite;
}

export { Long } from "mongodb";
export const sqlite = initializeSqlite();
export const mongodb = await initializeMongoDB();
