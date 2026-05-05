const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const { Infobip, AuthType } = require('@infobip-api-client/sdk'); 

const app = express();

// --- 1. ኮንፊገሬሽን ---

// Infobip መረጃዎች (በሰጠኸኝ መሰረት ተስተካክሏል)
const INFOBIP_API_KEY = "d9aab6e1c252ed1226bfd82c94ab929f-60ef815d-7148-41e3-9fba-299c09c3d527";
const INFOBIP_BASE_URL = "https://m9xgn9.api.infobip.com"; 

const CHAPA_SECRET_KEY = 'CHASECK_TEST-9b6jscSvjH68fsL6QR0IJyCB0HoGSacz'; 

// Infobip Setup
const infobip = new Infobip({
    baseUrl: INFOBIP_BASE_URL,
    apiKey: INFOBIP_API_KEY,
    authType: AuthType.ApiKey,
});

// MongoDB Setup
const dbURI = process.env.MONGODB_URI;
mongoose.connect(dbURI)
    .then(() => console.log('✅ MongoDB connected successfully!'))
    .catch(err => console.error('❌ MongoDB connection error:', err.message));

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// --- 2. ዳታ ሞዴል ---
const ticketSchema = new mongoose.Schema({
    name: String,
    phone: String,
    ticketNumber: Number,
    transactionId: String,
    prizeType: String,
    status: { type: String, default: 'Pending' },
    date: { type: Date, default: Date.now }
});
const Ticket = mongoose.model('Ticket', ticketSchema);

// --- 3. መንገዶች (Routes) ---

app.get('/', (req, res) => res.render('index'));

app.post('/buy', async (req, res) => {
    try {
        const { name, phone, prizeType } = req.body;
        const cleanPhone = phone.replace(/\s+/g, '');
        const ticketNumber = Math.floor(100000 + Math.random() * 900000);
        let price = (prizeType === "መኪና") ? 50 : 100;
        const tx_ref = `tx-${ticketNumber}-${Date.now()}`;

        const response = await axios.post('https://api.chapa.co/v1/transaction/initialize', {
            amount: price,
            currency: 'ETB',
            email: 'israel@gmail.com', 
            first_name: name,
            phone_number: cleanPhone,
            tx_ref: tx_ref,
            callback_url: "https://lottery-d43d.onrender.com/verify-payment/" + tx_ref,
            return_url: "https://lottery-d43d.onrender.com/success", 
            "customization[title]": "የሎተሪ ክፍያ",
            "customization[description]": `${prizeType} ቲኬት ቁጥር ${ticketNumber}`
        }, {
            headers: { Authorization: `Bearer ${CHAPA_SECRET_KEY}` }
        });

        if (response.data.status === 'success') {
            const newTicket = new Ticket({ name, phone: cleanPhone, ticketNumber, prizeType, transactionId: tx_ref });
            await newTicket.save();
            res.redirect(response.data.data.checkout_url);
        }
    } catch (err) {
        res.status(500).send("Chapa Error: " + err.message);
    }
});

app.get('/success', async (req, res) => {
    try {
        const lastTicket = await Ticket.findOne().sort({ date: -1 });
        res.send(`
            <div style="text-align:center; margin-top:50px; font-family:sans-serif;">
                <h1 style="color:green; font-size: 50px;">✔️</h1>
                <h1 style="color:#333;">ክፍያዎ ተሳክቷል!</h1>
                <div style="background:#f4f4f4; padding:20px; border-radius:10px; display:inline-block; text-align:left; border: 1px solid #ddd;">
                   <p><strong>ስም፦</strong> ${lastTicket.name}</p>
                   <p><strong>የትኬት ቁጥር፦</strong> <span style="font-size:20px; color:#007bff;">#${lastTicket.ticketNumber}</span></p>
                   <p><strong>ሽልማት፦</strong> ${lastTicket.prizeType}</p>
                </div>
                <p style="color:blue; margin-top:20px;">የትኬት ቁጥሩ በ SMS ወደ ስልክዎ ይላካል!</p>
                <br><br>
                <a href="/" style="padding:12px 25px; background:#007bff; color:white; text-decoration:none; border-radius:5px; font-weight:bold;">ወደ ዋናው ገጽ ተመለስ</a>
            </div>
        `);
    } catch (e) { res.redirect('/'); }
});

app.all('/verify-payment/:id', async (req, res) => {
    const tx_ref = req.params.id;
    try {
        const response = await axios.get(`https://api.chapa.co/v1/transaction/verify/${tx_ref}`, {
            headers: { Authorization: `Bearer ${CHAPA_SECRET_KEY}` }
        });

        if (response.data.status === 'success' && response.data.data.status === 'success') {
            const ticket = await Ticket.findOneAndUpdate({ transactionId: tx_ref }, { status: 'Verified' }, { new: true });
            
            if (ticket) {
                try {
                    await infobip.channels.sms.send({
                        messages: [{
                            from: "Lottery",
                            destinations: [{ to: ticket.phone }],
                            text: `ሰላም ${ticket.name}፣ የሎተሪ ትኬት ቁጥርዎ #${ticket.ticketNumber} ነው። መልካም ዕድል!`
                        }]
                    });
                    console.log("✅ SMS sent to " + ticket.phone);
                } catch (smsErr) {
                    console.error("❌ SMS Error:", smsErr.message);
                }
            }
            return res.status(200).send("Verified");
        }
    } catch (err) { res.status(500).send("Error"); }
});

app.get('/admin', async (req, res) => {
    const { pass } = req.query;
    if (pass === "israel2026") {
        const tickets = await Ticket.find().sort({ date: -1 });
        res.render('admin', { tickets });
    } else { res.send("Password Required"); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));
