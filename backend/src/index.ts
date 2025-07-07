import express, { Request, Response } from "express";
import "dotenv/config";
import multer from "multer"
import { stringify } from "querystring";

const app = express()
const port = process.env.PORT

// setup multer config for defining file storage location
const UPLOADLOCATION = 'uploads/'
const storage = multer.diskStorage({

    destination: (req, file, callback) => {
        callback(null, UPLOADLOCATION)
    },

    filename: (req, file, callback) => {
        let uniqueName = Date.now() + "-" + file.originalname
        callback(null, uniqueName)
    },

})

const upload = multer({dest: UPLOADLOCATION, storage})

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

        res.status(200).json({message: "revieved pdf!", file: req.file, fileBody: req.body})
    }
    else {
        res.status(500).json("internal server error.")
    }
})


app.listen(port, () => {
    console.log(`server started on port: ${port}`)
})

