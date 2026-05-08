const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();

// 1. ኮንፊገሬሽን (የ MongoDB ሊንክህ እና Chapa Key)
const dbURI = "mongodb+srv://israel_user:israel2026@cluster0.j2yp1l9.mongodb.net/lotteryDB?retryWrites=true&w=majority";
const CHAPA_SECRET_KEY = 'CHASECK_TEST-9b6jscSvjH68fsL6QR0IJyCB0HoGSacz'; 

mongoose.connect(dbURI)
    .then(() => console.log('✅ MongoDB connected successfully!'))
    .catch(err => console.error('❌ MongoDB connection error:', err.message));

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

// ክፍያ ለመጀመር (Buy Route)
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

// የአስተዳዳሪ ገጽ (የተከፋፈለ አደራደር)
app.get('/admin', async (req, res) => {
    try {
        const allTickets = await Ticket.find().sort({ date: -1 });
        const carTickets = allTickets.filter(t => t.prizeType === "መኪና");
        const houseTickets = allTickets.filter(t => t.prizeType === "ቤት");

        const createTable = (tickets, title, color) => `
            <h3 style="color:${color}; border-left: 5px solid ${color}; padding-left:10px;">📍 የ${title} ተመዝጋቢዎች (${tickets.length})</h3>
            <table border="1" style="width:100%; border-collapse:collapse; margin-bottom:30px;">
                <tr style="background:#f8f9fa;">
                    <th style="padding:10px;">ስም</th> <th style="padding:10px;">ስልክ</th> <th style="padding:10px;">ቁጥር</th> <th style="padding:10px;">ሁኔታ</th>
                </tr>
                ${tickets.map(t => `
                    <tr>
                        <td style="padding:8px;">${t.name}</td>
                        <td style="padding:8px;">${t.phone}</td>
                        <td style="padding:8px; font-weight:bold; color:#007bff;">#${t.ticketNumber}</td>
                        <td style="padding:8px; color:${t.status === 'Verified' ? 'green' : 'orange'};">${t.status}</td>
                    </tr>
                `).join('')}
            </table>
        `;

        res.send(`
            <div style="font-family:sans-serif; padding:20px; max-width:1000px; margin:auto;">
                <h2>የአስተዳዳሪ መቆጣጠሪያ (Admin Panel)</h2>
                <hr>
                ${createTable(carTickets, "መኪና", "#e67e22")}
                ${createTable(houseTickets, "ቤት", "#27ae60")}
                <br><a href="/">ወደ ዋና ገጽ</a>
            </div>
        `);
    } catch (err) { res.send("Error"); }
});

// የአሸናፊዎች ገጽ
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
    } catch (err) { res.send("Error"); }
});

// የክፍያ ማረጋገጫ (Webhook)
app.all('/verify-payment/:id', async (req, res) => {
    try {
        await Ticket.findOneAndUpdate({ transactionId: req.params.id }, { status: 'Verified' });
        res.status(200).send("Verified");
    } catch (err) { res.status(500).send("Error"); }
});

// 4. ሰርቨር ማስነሳት
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
