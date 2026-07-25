import { DatabaseSync } from "node:sqlite"
import path from "node:path"


const dbPath = path.resolve(import.meta.dirname,"..","..","url.db")
const db = new DatabaseSync(dbPath)


db.exec(`
    CREATE TABLE IF NOT EXISTS url (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shortUrl TEXT NOT NULL UNIQUE,
        longUrl TEXT NOT NULL
    )
`)

console.log("db initialized")

export default db