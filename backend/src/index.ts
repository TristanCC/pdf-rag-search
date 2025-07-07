import express, { Request, Response } from "express";
import "dotenv/config";
import multer from "multer"

const app = express()
const port = process.env.PORT

// setup multer config for defining file storage location

const upload = multer({dest: 'uploads/'})

app.use((req, res, next) => {
    console.log("i am middleware!")
    next()
})

app.get("/", (req,res) => {
    console.log("hello world!")
    res.send("hello world!")
})

app.post(`/uploadPDF`, upload.single('uploadedPDF') ,(req, res) => {
    const pdf = req.file
    if(pdf) {
        res.status(200).json("recieved pdf!")
    }
    else {
        res.status(500).json("internal server error.")
    }
})


app.listen(port, () => {
    console.log(`server started on port: ${port}`)
})