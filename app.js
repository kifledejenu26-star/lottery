const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();

// 1. ኮንፊገሬሽን (የ MongoDB ሊንክህ ገብቷል)
const dbURI = "mongodb+srv://israel_user:israel2026@cluster0.j2yp1l9.mongodb.net/lotteryDB?retryWrites=true&w=majority";
const CHAPA_SECRET_KEY = 'CHASECK_TEST-9b6jscSvjH68fsL6QR0IJyCB0HoGSacz'; 

mongoose.connect(dbURI)
    .then(() => console.log('✅ MongoDB connected!'))
    .catch(err => console.error('❌ MongoDB error:', err.message));

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 2. ዳታ ሞዴል
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

// 3. መንገዶች (Routes)
app.get('/', (req, res) => res.render('index'));

app.post('/buy', async (req, res) => {
    try {
        const { name, phone, prizeType } = req.body;
        const ticketNumber = Math.floor(100000 + Math.random() * 900000);
        let price = (prizeType === "መኪና") ? 50 : 100;
        const tx_ref = `tx-${ticketNumber}-${Date.now()}`;

        const response = await axios.post('https://api.chapa.co/v1/transaction/initialize', {
            amount: price,
            currency: 'ETB',
            email: 'israel@gmail.com',
            first_name: name,
            phone_number: phone,
            tx_ref: tx_ref,
            callback_url: "https://lottery-d43d.onrender.com/verify-payment/" + tx_ref,
            return_url: "https://lottery-d43d.onrender.com/success"
        }, {
            headers: { Authorization: `Bearer ${CHAPA_SECRET_KEY}` }
        });

        if (response.data.status === 'success') {
            const newTicket = new Ticket({ name, phone, ticketNumber, prizeType, transactionId: tx_ref });
            await newTicket.save();
            res.redirect(response.data.data.checkout_url);
        }
    } catch (err) { res.status(500).send("Error"); }
});

app.get('/success', async (req, res) => {
    try {
        const lastTicket = await Ticket.findOne().sort({ date: -1 });
        res.send(`
            <div style="text-align:center; padding:50px; font-family:sans-serif;">
                <h1 style="color:green;">✔️ ክፍያዎ ተሳክቷል!</h1>
                <div style="background:#f4f4f4; padding:20px; border-radius:10px; display:inline-block; text-align:left;">
                    <p><strong>ስም፦</strong> ${lastTicket.name}</p>
                    <p><strong>የሎተሪ ቁጥርዎ፦</strong> <span style="font-size:24px; color:#007bff;">#${lastTicket.ticketNumber}</span></p>
                    <p><strong>ሽልማት፦</strong> ${lastTicket.prizeType}</p>
                </div>
                <p>እባክዎ ይህንን ገጽ ፎቶ አንስተው ያስቀምጡ!</p>
                <br><a href="/">ተመለስ</a>
            </div>
        `);
    } catch (e) { res.redirect('/'); }
});

app.all('/verify-payment/:id', async (req, res) => {
    try {
        await Ticket.findOneAndUpdate({ transactionId: req.params.id }, { status: 'Verified' });
        res.status(200).send("Verified");
    } catch (err) { res.status(500).send("Error"); }
});

// 4. Port Binding (ለ Render የግድ አስፈላጊ ነው)
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
