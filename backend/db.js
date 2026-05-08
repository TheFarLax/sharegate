import sqlite3 from "sqlite3";

const db =
  new sqlite3.Database(
    "./sharegate.db"
  );

db.serialize(() => {

  db.run(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      shareId TEXT,
      cid TEXT,

      ownerWallet TEXT,
      recipientWallet TEXT,

      fileName TEXT,
      fileType TEXT,
      expiry INTEGER,
      revoked INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

export default db;
