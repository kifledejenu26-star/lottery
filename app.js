const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const axios = require('axios');
const { Infobip, AuthType } = require('@infobip-api-client/sdk'); 

const app = express();

// 1. Configurations
const dbURI = "mongodb+srv://israel_user:israel2026@cluster0.j2yp1l9.mongodb.net/lotteryDB?retryWrites=true&w=majority";
const CHAPA_SECRET_KEY = 'CHASECK_TEST-9b6jscSvjH68fsL6QR0IJyCB0HoGSacz'; 

const infobip = new Infobip({
    baseUrl: "https://m9xgn9.api.infobip.com",
    apiKey: "d9aab6e1c252ed1226bfd82c94ab929f-60ef815d-7148-41e3-9fba-299c09c3d527",
    authType: AuthType.ApiKey,
});

// 2. Database Connection
mongoose.connect(dbURI)
    .then(() => console.log('✅ MongoDB connected successfully!'))
    .catch(err => console.error('❌ MongoDB error:', err.message));

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 3. Ticket Schema
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

// 4. Routes
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
        res.status(500).send("Error: " + err.message);
    }
});

app.get('/success', async (req, res) => {
    try {
        const lastTicket = await Ticket.findOne().sort({ date: -1 });
        res.render('success', { ticket: lastTicket }); 
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
                // SMS መላኪያ
                try {
                    await infobip.channels.sms.send({
                        messages: [{
                            from: "InfoSMS",
                            destinations: [{ to: ticket.phone }],
                            text: `ሰላም ${ticket.name}፣ የሎተሪ ትኬት ቁጥርዎ #${ticket.ticketNumber} ነው። መልካም ዕድል!`
                        }]
                    });
                } catch (smsErr) { console.error("SMS Failed"); }
            }
            return res.status(200).send("Verified");
        }
    } catch (err) { res.status(500).send("Error"); }
});

// 5. Server (Port Binding)
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
