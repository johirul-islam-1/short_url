import express, { application } from "express"
import { DatabaseSync } from "node:sqlite"
import path from "node:path"
import base62 from "base62"
import "dotenv/config"


const app = express();
app.use(express.json())
const PORT = process.env.PORT;



// initialize database
const Path = path.resolve(import.meta.dirname,"..","url.db")
const db = new DatabaseSync(Path)

db.exec(`
    CREATE TABLE IF NOT EXISTS url(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        shortCode TEXT NOT NULL UNIQUE,
        longUrl TEXT NOT NULL
    )
`)

console.log("db created")


const getLongUrl = (longUrl) => {
    const LongUrl = db.prepare(`
        SELECT * FROM url WHERE longUrl = ?
    `)

    return LongUrl.get(longUrl)
}


const store = (longUrl, shortCode) => {
    const insertStmt = db.prepare(`
        INSERT INTO url (shortCode, longUrl) VALUES(?, ?)
    `)

    insertStmt.run(shortCode,longUrl)
}

const createShortCode = () => {
    const getLastId = db.prepare('SELECT max(id) AS lastId FROM url')
    const { lastId } = getLastId.get()

    const nextId = (lastId ?? 0) + 1
    const shortCode = base62.encode(nextId)

    return shortCode

}



const shortenUrl = (req, res) => {
    let LongUrl = getLongUrl(req.body.longUrl)
    if(LongUrl != undefined){
        console.log("shortenUrl: shortUrl found")

        const fullUrl = process.env.BASE_URL + "/api/" + LongUrl.shortCode

        return res.status(200).json({
            "shortUrl": fullUrl
        })
    }

    else{
        console.log("shortenUrl: creating shortUrl")

        LongUrl = req.body.longUrl
        const shortCode = createShortCode()
        store(LongUrl,shortCode)


        const fullUrl = process.env.BASE_URL + "/api/" + shortCode
        return res.status(200).json({
            "shortUrl": fullUrl
        })
    }
}

const redirect = (req,res)=>{
    const id = req.params.id

    const shortStmt = db.prepare("SELECT longUrl FROM url WHERE shortCode = ?")
    const { longUrl } = shortStmt.get(id)

    console.log(longUrl)


    if(longUrl){
        console.log("redirect: shortUrl found, redirecting")
        if(!/^https?:\/\//i.test(longUrl)){
            const url = "https://"+longUrl
            return res.redirect(302,url)
        }

        return res.redirect(302,longUrl)
    }

    else{
        console.log("redirect: shortUrl found not found")

        return res.status(404).json({
            "message" : "Short URL not found!"
        })
    }

}

app.post("/api/shorten", shortenUrl)
app.get("/api/:id", redirect)


// const stmt = db.prepare(`
//     SELECT * FROM url
// `)
// console.log(stmt.get())

// console.log(process.env.BASE_URL)


app.listen(PORT, ()=>{console.log(`server is running on port ${PORT}`)})