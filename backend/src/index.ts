import express, { Request, Response } from "express";
import "dotenv/config";

const app = express()
const port = process.env.PORT

app.use((req, res, next) => {
    console.log("i am middleware!")
    next()
})

app.get("/", (req,res) => {
    console.log("hello world!")
    res.send("hello world!")
})


app.listen(port, () => {
    console.log(`server started on port: ${port}`)
})