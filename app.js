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
        res.render('success', { ticket: lastTicket }); 
    } catch (e) { res.redirect('/'); }
});

// --- አስተዳዳሪ (Admin) እና የእጣ ማውጫ ---

app.get('/admin', async (req, res) => {
    try {
        const allTickets = await Ticket.find().sort({ date: -1 });
        const carTickets = allTickets.filter(t => t.prizeType === "መኪና");
        const houseTickets = allTickets.filter(t => t.prizeType === "ቤት");

        const createTable = (tickets, title, color, type) => `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:30px;">
                <h3 style="color:${color};">📍 የ${title} ተመዝጋቢዎች (${tickets.length})</h3>
                <form action="/draw-winner" method="POST">
                    <input type="hidden" name="prizeType" value="${type}">
                    <button type="submit" style="background:${color}; color:white; border:none; padding:8px 15px; border-radius:5px; cursor:pointer;">የ${title} እጣ አውጣ</button>
                </form>
            </div>
            <table border="1" style="width:100%; border-collapse:collapse; margin-bottom:10px;">
                <tr style="background:#f8f9fa;">
                    <th>ስም</th> <th>ስልክ</th> <th>ቁጥር</th> <th>ሁኔታ</th> <th>አሸናፊ?</th>
                </tr>
                ${tickets.map(t => `
                    <tr style="${t.isWinner ? 'background:#fff3cd;' : ''}">
                        <td style="padding:8px;">${t.name}</td>
                        <td style="padding:8px;">${t.phone}</td>
                        <td style="padding:8px; font-weight:bold;">#${t.ticketNumber}</td>
                        <td style="padding:8px;">${t.status}</td>
                        <td style="padding:8px; text-align:center;">${t.isWinner ? '🏆' : '-'}</td>
                    </tr>
                `).join('')}
            </table>
        `;

        res.send(`
            <div style="font-family:sans-serif; padding:20px; max-width:1000px; margin:auto;">
                <div style="display:flex; justify-content:space-between;">
                    <h2>የአስተዳዳሪ መቆጣጠሪያ</h2>
                    <a href="/winner" style="color:gold; font-weight:bold; background:#333; padding:10px; border-radius:5px; text-decoration:none;">የአሸናፊዎች ገጽ</a>
                </div>
                <hr>
                ${createTable(carTickets, "መኪና", "#e67e22", "መኪና")}
                ${createTable(houseTickets, "ቤት", "#27ae60", "ቤት")}
            </div>
        `);
    } catch (err) { res.send("Error"); }
});

// እጣ ማውጫ ተግባር (Random Selection)
app.post('/draw-winner', async (req, res) => {
    try {
        const { prizeType } = req.body;
        // ክፍያቸው የተረጋገጠ (Verified) ተመዝጋቢዎችን ብቻ መምረጥ
        const eligible = await Ticket.find({ prizeType: prizeType, status: 'Verified' });
        
        if (eligible.length > 0) {
            // የድሮ አሸናፊዎችን አጥፋ (አዲስ እጣ ከሆነ)
            await Ticket.updateMany({ prizeType: prizeType }, { isWinner: false });
            
            // በዘፈቀደ አንዱን መምረጥ
            const winner = eligible[Math.floor(Math.random() * eligible.length)];
            winner.isWinner = true;
            await winner.save();
            res.redirect('/admin');
        } else {
            res.send("<script>alert('ምንም የተከፈለበት ተመዝጋቢ የለም!'); window.location='/admin';</script>");
        }
    } catch (err) { res.redirect('/admin'); }
});

// --- አሸናፊዎችን ለይቶ የሚያሳይ ገጽ ---
app.get('/winner', async (req, res) => {
    try {
        const carWinner = await Ticket.findOne({ isWinner: true, prizeType: "መኪና" });
        const houseWinner = await Ticket.findOne({ isWinner: true, prizeType: "ቤት" });

        const winnerBox = (winner, title, color) => `
            <div style="border:3px solid ${color}; padding:20px; border-radius:15px; margin:20px; width:300px; display:inline-block; background:white;">
                <h2 style="color:${color};">${title} አሸናፊ</h2>
                ${winner ? `
                    <h1 style="margin:10px 0;">🏆</h1>
                    <h3 style="margin:5px 0;">${winner.name}</h3>
                    <h2 style="color:#007bff;">#${winner.ticketNumber}</h2>
                    <p style="color:#666;">ስልክ: ${winner.phone.substring(0, 4)}****</p>
                ` : `<p style="color:#999;">እጣው ገና አልወጣም</p>`}
            </div>
        `;

        res.send(`
            <div style="text-align:center; font-family:sans-serif; background:#f0f2f5; min-height:100vh; padding:50px 20px;">
                <h1 style="color:#333; font-size:40px;">🎊 የእለቱ ባለእድሎች 🎊</h1>
                <div style="display:flex; justify-content:center; flex-wrap:wrap;">
                    ${winnerBox(carWinner, "የመኪና", "#e67e22")}
                    ${winnerBox(houseWinner, "የቤት", "#27ae60")}
                </div>
                <br><br>
                <a href="/" style="text-decoration:none; background:#333; color:white; padding:12px 25px; border-radius:30px;">ወደ ዋናው ገጽ ተመለስ</a>
            </div>
        `);
    } catch (err) { res.send("Error"); }
});

app.all('/verify-payment/:id', async (req, res) => {
    try {
        await Ticket.findOneAndUpdate({ transactionId: req.params.id }, { status: 'Verified' });
        res.status(200).send("Verified");
    } catch (err) { res.status(500).send("Error"); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on port ${PORT}`));
