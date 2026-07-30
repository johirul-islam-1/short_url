import express, { application } from "express"
import { DatabaseSync } from "node:sqlite"
import path, { format } from "node:path"
import base62 from "base62"
import "dotenv/config"
import { time } from "node:console"


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
        longUrl TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS clicks(
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        urlId INTEGER NOT NULL,
        clickedAt DATETIME DEFAULT CURRENT_TIMESTAMP,


        FOREIGN KEY (urlId)
            REFERENCES url(id)
            ON DELETE CASCADE 
    );

    CREATE INDEX IF NOT EXISTS index_clicks_urlId_clickedAt ON clicks (urlId, clickedAt)
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
    const LongUrl  = shortStmt.get(id)

    // console.log(longUrl)


    if(LongUrl){
        const { longUrl } = LongUrl
        console.log("redirect: shortUrl found, redirecting")

        recordRedirectedClicks(id)

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





const recordRedirectedClicks = (url_id) => {
    db
    .prepare(`INSERT INTO clicks (urlId) VALUES (?)`)
    .run(url_id)

}

const timelines = {
    day: {
        start: "start of day",
        offset: "+0 day",
        end: "+1 day",
        unit: "hour",
        formats: "%H"
    },

    week: {
        start: "start of day",
        offset: "-6 days",
        end: "+1 day",
        unit: "day",
        formats: "%Y-%m-%d"
    },

    month: {
        start: "start of month",
        offset: "+0 month",
        end: "+1 month",
        unit: "day",
        formats: "%Y-%m-%d"
    },

    year: {
        start: "start of year",
        offset: "+0 year",
        end: "+1 year",
        unit: "month",
        formats: "%Y-%m"
    }
}

const clickCountAnalytics = (url_id, timeline) => {

    const config = timelines[timeline]

    if(!config){
        return null
    }
    
    const dbAnalytics =  db
                        .prepare(`
                            SELECT 
                                strftime('${config.formats}', clickedAt) AS ${config.unit},
                                COUNT(*) AS totalClicks
                            FROM clicks

                            WHERE urlId = ?
                                AND clickedAt >= datetime('now','${config.start}','${config.offset}')
                                AND clickedAt < datetime('now','${config.start}','${config.end}')
                            GROUP BY strftime('${config.formats}', clickedAt)
                            ORDER BY ${config.unit}
                        `)
                        .all(url_id)
    
    
    const fullAnalytics = fullAnalysisWithMissingValues(dbAnalytics,timeline)

    return fullAnalytics
}


const fullAnalysisWithMissingValues = (dbAnalytics, timeline)=>{
    const config = timelines[timeline]

    const counts = new Map(
        dbAnalytics.map((row)=>[
            row[config.unit],// if key comes form var then use []
            Number(row.totalClicks) // if key is known then use .
        ])
    )

    const result = []
    const now = new Date()

    if(timeline === "day") {
        for(let hour = 0; hour < 24; hour++){
            const key = String(hour).padStart(2,"0")

            result.push({
                hour: key,
                totalClicks: counts.get(key) ?? 0
            })
        }
    }

    else if(timeline === "week") {
        

        for(let day = 6; day>=0; day--){
            const date = new Date(now)

            date.setUTCDate(date.getUTCDate() - day)

            const key = date.toISOString().slice(0,10)

            result.push({
                day: key,
                totalClicks: counts.get(key) ?? 0
            })
        }
    }

    else if(timeline === "month"){
        const year = now.getUTCFullYear()
        const month = now.getUTCMonth()

        const daysInMonth = new Date(Date.UTC(year,month+1,0)).getUTCDate()

        for(let day = 1;day <= daysInMonth; day++){
            const key = [year,String(month+1).padStart(2,"0"),String(day).padStart(2,"0")].join("-")

            result.push({
                day: key,
                totalClicks: counts.get(key) ?? 0
            })
        }
    }

    else if(timeline === "year") {
        const year = now.getUTCFullYear()

        for(let month = 1; month <= 12; month++){
            const key = [year,String(month).padStart(2,"0")].join("-")

            result.push({
                month: key,
                totalClicks: counts.get(key) ?? 0
            })
        }
    }

    return result
}


const AnalyticsClickCountApi = (req,res)=>{

    const shortCode = req.params.urlId
    const timeline = req.params.timeline

    console.log(`/api//:urlId/analytics/clickCount/:timeline route hit. shortCode: ${shortCode}, timeline: ${timeline}`)


    const url = db.prepare(`
        SELECT id FROM url where shortCode = ?
    `).get(shortCode)

    if(!url) {
        return res.status(404).json({
        message: "Url not found"
        });
    }

    const clickCountAnalytic = clickCountAnalytics(shortCode, timeline)

    if(!clickCountAnalytic){
        return res.status(400).json({message:"Invalid timeline. Use day, week, month, or year"})
    }

    let totalClickCount = 0
    for(const item of clickCountAnalytic){
        totalClickCount = totalClickCount + item.totalClicks
    }


    return res.status(200).json({
        totalClick: totalClickCount,
        data: clickCountAnalytic
    })
}



app.post("/api/shorten", shortenUrl)
app.get("/api/:id", redirect)
app.get("/api/:urlId/analytics/clickCount/:timeline",AnalyticsClickCountApi)



// console.log(db.prepare(`SELECT * FROM url`).all())
// console.log(db.prepare(`SELECT * FROM clicks`).all())



// console.log(process.env.BASE_URL)


app.listen(PORT, ()=>{console.log(`server is running on port ${PORT}`)})