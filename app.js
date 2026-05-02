const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const axios = require('axios');
const path = require('path');
const app = express();

// --- 1. ኮንፊገሬሽን ---
// ያገኘኸውን Secret Key እዚህ አስገባ
CHASECK_TEST-9b6jscSvjH68fsL6QR0IJyCB0HoGSacz

// MongoDB ግንኙነት
const dbURI = 'mongodb+srv://israel_user:israel2026@cluster0.j2yp1l9.mongodb.net/lotteryDB?retryWrites=true&w=majority';
mongoose.connect(dbURI).then(() => console.log('MongoDB connected!'));

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// --- 2. ዳታ ሞዴል (Schema) ---
const ticketSchema = new mongoose.Schema({
    name: String,
    phone: String,
    ticketNumber: Number,
    transactionId: String, // Chapa tx_ref
    prizeType: String,
    status: { type: String, default: 'Pending' }, // Pending, Verified, Winner
    date: { type: Date, default: Date.now }
});
const Ticket = mongoose.model('Ticket', ticketSchema);

// --- 3. መንገዶች (Routes) ---

// የመነሻ ገጽ
app.get('/', (req, res) => res.render('index'));

// ቲኬት ሲገዙ ወደ Chapa መላኪያ
app.post('/buy', async (req, res) => {
    try {
        const { name, phone, prizeType } = req.body;
        const ticketNumber = Math.floor(100000 + Math.random() * 900000);
        let price = (prizeType === "መኪና") ? 50 : 100;
        
        const tx_ref = `tx-${ticketNumber}-${Date.now()}`;

        const response = await axios.post('https://api.chapa.co/v1/transaction/initialize', {
            amount: price,
            currency: 'ETB',
            email: 'israel@example.com', 
            first_name: name,
            phone_number: phone,
            tx_ref: tx_ref,
            callback_url: "https://lottery-d43d.onrender.com/verify-payment/" + tx_ref,
            return_url: "https://lottery-d43d.onrender.com/success", 
            "customization[title]": "የሎተሪ ክፍያ",
            "customization[description]": `${prizeType} ቲኬት ቁጥር ${ticketNumber}`
        }, {
            headers: { Authorization: `Bearer ${CHAPA_SECRET_KEY}` }
        });

        if (response.data.status === 'success') {
            const newTicket = new Ticket({ name, phone, ticketNumber, prizeType, transactionId: tx_ref });
            await newTicket.save();
            res.redirect(response.data.data.checkout_url);
        }
    } catch (err) {
        res.status(500).send("Chapa Error: " + err.message);
    }
});

// ክፍያ ማረጋገጫ (Verification)
app.get('/verify-payment/:id', async (req, res) => {
    const tx_ref = req.params.id;
    try {
        const response = await axios.get(`https://api.chapa.co/v1/transaction/verify/${tx_ref}`, {
            headers: { Authorization: `Bearer ${CHAPA_SECRET_KEY}` }
        });

        if (response.data.status === 'success') {
            await Ticket.findOneAndUpdate({ transactionId: tx_ref }, { status: 'Verified' });
            res.render('success');
        }
    } catch (err) { res.status(500).send("Verification Failed"); }
});

// ስኬታማ ገጽ
app.get('/success', (req, res) => res.render('success'));

// አሸናፊዎችን ማሳያ
app.get('/winner', async (req, res) => {
    try {
        const winners = await Ticket.find({ status: 'Winner' });
        res.render('winner', { winners });
    } catch (err) { res.status(500).send("Error"); }
});

// አድሚን ገጽ
app.get('/admin', async (req, res) => {
    const { pass } = req.query;
    if (pass === "israel2026") {
        const tickets = await Ticket.find().sort({ date: -1 });
        res.render('admin', { tickets });
    } else { res.send("Password Required"); }
});

// አሸናፊ መምረጫ
app.post('/make-winner/:id', async (req, res) => {
    try {
        await Ticket.findByIdAndUpdate(req.params.id, { status: 'Winner' });
        res.redirect('/admin?pass=israel2026');
    } catch (err) { res.status(500).send("Error"); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
