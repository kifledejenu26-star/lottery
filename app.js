const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const app = express();

// --- 1. ኮንፊገሬሽን ---
const CHAPA_SECRET_KEY = 'CHASECK_TEST-9b6jscSvjH68fsL6QR0IJyCB0HoGSacz'; 

const dbURI = 'mongodb+srv://israel_user:israel2026@cluster0.j2yp1l9.mongodb.net/lotteryDB?retryWrites=true&w=majority';
mongoose.connect(dbURI).then(() => console.log('MongoDB connected!'));

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // JSON መረጃዎችንም እንዲቀበል

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
            // ማሳሰቢያ፡ Render ላይ ያለው ሊንክህ በትክክል ይሄ መሆኑን አረጋግጥ
            callback_url: "https://lottery-d43d.onrender.com/verify-payment/" + tx_ref,
            return_url: "https://lottery-d43d.onrender.com/success", 
            "customization[title]": "የሎተሪ ክፍያ",
            "customization[description]": `${prizeType} ቲኬት ቁጥር ${ticketNumber}`
        }, {
            headers: { 
                Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.status === 'success') {
            const newTicket = new Ticket({ name, phone: cleanPhone, ticketNumber, prizeType, transactionId: tx_ref });
            await newTicket.save();
            res.redirect(response.data.data.checkout_url);
        }
    } catch (err) {
        console.error("Chapa Initialize Error:", err.response ? err.response.data : err.message);
        res.status(500).send("ክፍያ ማስጀመር አልተቻለም።");
    }
});

// የክፍያ ማረጋገጫ መንገድ (የተሻሻለ)
app.get('/verify-payment/:id', async (req, res) => {
    const tx_ref = req.params.id;
    try {
        const response = await axios.get(`https://api.chapa.co/v1/transaction/verify/${tx_ref}`, {
            headers: { Authorization: `Bearer ${CHAPA_SECRET_KEY}` }
        });

        // Chapa 'success' የሚለው በሁለት ቦታ ሊሆን ይችላል
        if (response.data.status === 'success' && response.data.data.status === 'success') {
            await Ticket.findOneAndUpdate({ transactionId: tx_ref }, { status: 'Verified' });
            return res.render('success');
        } else {
            return res.status(400).send("ክፍያው አልተሳካም ወይም አልተረጋገጠም።");
        }
    } catch (err) { 
        console.error("Verification Error:", err.message);
        res.status(500).send("Verification Failed"); 
    }
});

app.get('/pick-random-winner', async (req, res) => {
    try {
        const verifiedTickets = await Ticket.find({ status: 'Verified' });
        if (verifiedTickets.length === 0) {
            return res.send("<script>alert('ክፍያ የፈጸመ ሰው አልተገኘም!'); window.location.href='/admin?pass=israel2026';</script>");
        }
        const randomIndex = Math.floor(Math.random() * verifiedTickets.length);
        const winner = verifiedTickets[randomIndex];
        await Ticket.findByIdAndUpdate(winner._id, { status: 'Winner' });
        res.send(`<script>alert('አሸናፊው ተመርጧል: ${winner.name}'); window.location.href='/admin?pass=israel2026';</script>`);
    } catch (err) { res.status(500).send("Error picking winner"); }
});

app.get('/success', (req, res) => res.render('success'));

app.get('/winner', async (req, res) => {
    try {
        const winners = await Ticket.find({ status: 'Winner' });
        res.render('winner', { winners });
    } catch (err) { res.status(500).send("Error fetching winners"); }
});

app.get('/admin', async (req, res) => {
    const { pass } = req.query;
    if (pass === "israel2026") {
        const tickets = await Ticket.find().sort({ date: -1 });
        res.render('admin', { tickets });
    } else { res.send("Password Required"); }
});

app.get('/make-winner/:id', async (req, res) => {
    try {
        await Ticket.findByIdAndUpdate(req.params.id, { status: 'Winner' });
        res.redirect('/admin?pass=israel2026');
    } catch (err) { res.status(500).send("Error making winner"); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
