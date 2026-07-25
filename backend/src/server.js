import express from "express"
import "./config/db.js"

const app = express();

const PORT = 3000;



app.listen(PORT, ()=>{console.log(`server is running on port ${PORT}`)})