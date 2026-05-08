import Database from "better-sqlite3";

const db =
  new Database(
    "./sharegate.db"
  );

db.exec(`
  CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    shareId TEXT,
    cid TEXT,

    ownerWallet TEXT,
    recipientWallet TEXT,

    fileName TEXT,
    fileType TEXT,

    expiry INTEGER DEFAULT 0,

    revoked INTEGER DEFAULT 0,

    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export default db;
