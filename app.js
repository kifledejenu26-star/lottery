const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();

// 1. ኮንፊገሬሽን
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
    isWinner: { type: Boolean, default: false },
    date: { type: Date, default: Date.now }
});
const Ticket = mongoose.model('Ticket', ticketSchema);

// 3. መንገዶች (Routes)

// ዋና ገጽ
app.get('/', (req, res) => res.render('index'));

// ክፍያ ለመጀመር
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

// ክፍያ ሲሳካ የሚታይ ገጽ
app.get('/success', async (req, res) => {
    try {
        const lastTicket = await Ticket.findOne().sort({ date: -1 });
        res.render('success', { ticket: lastTicket }); 
    } catch (e) { res.redirect('/'); }
});

// --- አዲስ የገቡ መንገዶች (Admin & Winner) ---

// 1. የአስተዳዳሪ ገጽ (ሁሉንም ቲኬቶች ለማየት)
app.get('/admin', async (req, res) => {
    try {
        const allTickets = await Ticket.find().sort({ date: -1 });
        res.send(`
            <div style="font-family:sans-serif; padding:20px;">
                <h2>የአስተዳዳሪ ገጽ (Admin Panel)</h2>
                <table border="1" style="width:100%; border-collapse:collapse; text-align:left;">
                    <tr style="background:#eee;">
                        <th>ስም</th> <th>ስልክ</th> <th>ቁጥር</th> <th>ሽልማት</th> <th>ሁኔታ</th>
                    </tr>
                    ${allTickets.map(t => `
                        <tr>
                            <td>${t.name}</td> <td>${t.phone}</td> <td>#${t.ticketNumber}</td> <td>${t.prizeType}</td> <td>${t.status}</td>
                        </tr>
                    `).join('')}
                </table>
                <br><a href="/">ወደ ዋና ገጽ</a>
            </div>
        `);
    } catch (err) { res.send("Error loading admin page"); }
});

// 2. የአሸናፊዎች ገጽ
app.get('/winner', async (req, res) => {
    try {
        const winners = await Ticket.find({ isWinner: true });
        res.send(`
            <div style="text-align:center; font-family:sans-serif; padding:50px;">
                <h1 style="color:#d4af37;">🏆 የእለቱ አሸናፊዎች 🏆</h1>
                <hr>
                ${winners.length > 0 ? winners.map(w => `<h3>${w.name} - #${w.ticketNumber}</h3>`).join('') : "<h3>ገና አልተመረጠም!</h3>"}
                <br><a href="/">ወደ ዋና ገጽ</a>
            </div>
        `);
    } catch (err) { res.send("Error loading winners page"); }
});

// የክፍያ ማረጋገጫ
app.all('/verify-payment/:id', async (req, res) => {
    try {
        await Ticket.findOneAndUpdate({ transactionId: req.params.id }, { status: 'Verified' });
        res.status(200).send("Verified");
    } catch (err) { res.status(500).send("Error"); }
});

// 4. Port Binding
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
