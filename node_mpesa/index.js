const express = require('express');

const app = express();
require('dotenv').config();
const cors = require('cors');

const axios = require("axios");


const port = process.env.PORT;

app.listen(port, () => {
    console.log('app is running on port ' + port);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get("/", (req, res) => {
    res.send("<h1>RUNNING MPESA PAYMENT SYSTEM BACKEND</h1>")
})

app.get("/token", (req, res) => {
    generateToken();
});

// middleware function to generate token
const generateToken = async (req, res, next) => {
    const secretKey = process.env.MPESA_CONSUMER_SECRET;
    const consumer = process.env.MPESA_CONSUMER_KEY;

    const auth = new Buffer.from(`${consumer} : ${secretKey}`).toString("base64");

    await axios.get("https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials", 
    {
        
        headers: {
            authorization: `Basic ${auth}`,
        }
    }).then((data) => {
        console.log(data);
        next();
    }).catch((err) => {
        console.error(err);
        res.status(400).json(err.message);
    })
};

// mpesa api
app.post("/stk", generateToken, async (req, res) => {
    const phoneNumber = req.body.phoneNumber.substring(1);
    const amount = req.body.amount;

    
    res.json({ phoneNumber, amount });

    const date = new Date();
    const timestamp = date.getFullYear() + 
        ("0" + (date.getMonth() + 1)).slice(-2) + 
        ("0" + date.getDate()).slice(-2) +
        ("0" + date.getHours()).slice(-2) +
        ("0" + date.getMinutes()).slice(-2) +
        ("0" + date.getSeconds()).slice(-2);

    const shortCode = process.env.MPESA_PAYBILL;
    const passKey = process.env.MPESA_PASSKEY;

    const password = new Buffer.from(shortCode + passKey + timestamp).toString("base64");


    await axios.post(
        "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest",
        {    
            "BusinessShortCode": shortCode,     
            "Password": password,
            "Timestamp": timestamp,    
            "TransactionType": "CustomerPayBillOnline",    // "CustomerBuyGoodsOnline"
            "Amount": amount,    
            "PartyA": `254${phoneNumber}`,    
            "PartyB": shortCode,    
            "PhoneNumber": `254${phoneNumber}`,    
            "CallBackURL": "https://mydomain.com/path",   // domain plus the function thats receiving the callback   
            "AccountReference": `254${phoneNumber}`,    
            "TransactionDesc": "Customer Payment Test"
        },
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    ).then((data) => {
        console.log(data);
        res.status(200).json(data);
    }).catch((err) => {
        console.log(err.message)
        res.status(400).json(err.message)
    })
});

