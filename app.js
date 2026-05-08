const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express();

// 1. ኮንፊገሬሽን (Configurations)
const dbURI = "mongodb+srv://israel_user:israel2026@cluster0.j2yp1l9.mongodb.net/lotteryDB?retryWrites=true&w=majority";
const CHAPA_SECRET_KEY = 'CHASECK_TEST-9b6jscSvjH68fsL6QR0IJyCB0HoGSacz'; 
const ADMIN_PASSWORD = "israel2026"; // የአድሚን መግቢያ ኮድ

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

// ክፍያ መጀመሪያ
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

// ስኬታማ ክፍያ
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

// 4. የአስተዳዳሪ ገጽ (Admin with Password Protection)
app.get('/admin', async (req, res) => {
    const pass = req.query.pass;
    if (pass !== ADMIN_PASSWORD) {
        return res.status(403).send("<h1>Unauthorized: እባክዎ በትክክለኛው የአድሚን ሊንክ ይግቡ!</h1>");
    }

    try {
        const allTickets = await Ticket.find().sort({ date: -1 });
        const carTickets = allTickets.filter(t => t.prizeType === "መኪና");
        const houseTickets = allTickets.filter(t => t.prizeType === "ቤት");

        const createTable = (tickets, title, color, type) => `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:30px;">
                <h3 style="color:${color}; border-left: 5px solid ${color}; padding-left:10px;">📍 የ${title} ተመዝጋቢዎች (${tickets.length})</h3>
                <form action="/draw-winner?pass=${ADMIN_PASSWORD}" method="POST">
                    <input type="hidden" name="prizeType" value="${type}">
                    <button type="submit" style="background:${color}; color:white; border:none; padding:10px 15px; border-radius:5px; cursor:pointer; font-weight:bold;">የ${title} እጣ አውጣ</button>
                </form>
            </div>
            <table border="1" style="width:100%; border-collapse:collapse; margin-bottom:10px;">
                <tr style="background:#f8f9fa;">
                    <th style="padding:10px;">ስም</th> <th style="padding:10px;">ስልክ</th> <th style="padding:10px;">ቁጥር</th> <th style="padding:10px;">ሁኔታ</th> <th style="padding:10px;">አሸናፊ?</th>
                </tr>
                ${tickets.map(t => `
                    <tr style="${t.isWinner ? 'background:#fff3cd;' : ''}">
                        <td style="padding:8px;">${t.name}</td>
                        <td style="padding:8px;">${t.phone}</td>
                        <td style="padding:8px; font-weight:bold;">#${t.ticketNumber}</td>
                        <td style="padding:8px; color:${t.status === 'Verified' ? 'green' : 'orange'};">${t.status}</td>
                        <td style="padding:8px; text-align:center;">${t.isWinner ? '🏆' : '-'}</td>
                    </tr>
                `).join('')}
            </table>
        `;

        res.send(`
            <div style="font-family:sans-serif; padding:20px; max-width:1000px; margin:auto;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h2>የአስተዳዳሪ መቆጣጠሪያ (Admin Panel)</h2>
                    <a href="/winner" style="background:#333; color:gold; padding:10px; border-radius:5px; text-decoration:none;">የአሸናፊዎች ገጽ</a>
                </div>
                <hr>
                ${createTable(carTickets, "መኪና", "#e67e22", "መኪና")}
                ${createTable(houseTickets, "ቤት", "#27ae60", "ቤት")}
            </div>
        `);
    } catch (err) { res.send("Error loading admin page"); }
});

// እጣ ማውጫ (Winner Drawing)
app.post('/draw-winner', async (req, res) => {
    if (req.query.pass !== ADMIN_PASSWORD) return res.send("Unauthorized");
    try {
        const { prizeType } = req.body;
        const eligible = await Ticket.find({ prizeType: prizeType, status: 'Verified' });
        
        if (eligible.length > 0) {
            await Ticket.updateMany({ prizeType: prizeType }, { isWinner: false });
            const winner = eligible[Math.floor(Math.random() * eligible.length)];
            winner.isWinner = true;
            await winner.save();
            res.redirect(`/admin?pass=${ADMIN_PASSWORD}`);
        } else {
            res.send("<script>alert('ምንም የተከፈለበት ተመዝጋቢ የለም!'); window.location='/admin?pass=israel2026';</script>");
        }
    } catch (err) { res.redirect(`/admin?pass=${ADMIN_PASSWORD}`); }
});

// 5. የአሸናፊዎች ገጽ (Winner Page)
app.get('/winner', async (req, res) => {
    try {
        const carWinner = await Ticket.findOne({ isWinner: true, prizeType: "መኪና" });
        const houseWinner = await Ticket.findOne({ isWinner: true, prizeType: "ቤት" });

        const winnerBox = (winner, title, color) => `
            <div style="border:3px solid ${color}; padding:30px; border-radius:20px; margin:20px; width:280px; display:inline-block; background:white; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <h2 style="color:${color}; text-transform:uppercase;">የ${title} ባለእድል</h2>
                ${winner ? `
                    <h1 style="font-size:50px; margin:10px 0;">🏆</h1>
                    <h3 style="margin:5px 0; color:#333;">${winner.name}</h3>
                    <h2 style="color:#007bff; font-size:30px;">#${winner.ticketNumber}</h2>
                    <p style="color:#777;">ስልክ: ${winner.phone.substring(0, 4)}****</p>
                ` : `<p style="color:#999; font-style:italic; margin-top:20px;">እጣው ገና አልወጣም</p>`}
            </div>
        `;

        res.send(`
            <div style="text-align:center; font-family:sans-serif; background:#f0f2f5; min-height:100vh; padding:50px 20px;">
                <h1 style="color:#333; font-size:45px; margin-bottom:10px;">🎊 የእለቱ አሸናፊዎች 🎊</h1>
                <p style="color:#666; margin-bottom:40px;">እንኳን ደስ አላችሁ!</p>
                <div style="display:flex; justify-content:center; flex-wrap:wrap;">
                    ${winnerBox(carWinner, "መኪና", "#e67e22")}
                    ${winnerBox(houseWinner, "ቤት", "#27ae60")}
                </div>
                <br><br>
                <a href="/" style="text-decoration:none; background:#333; color:white; padding:15px 35px; border-radius:50px; font-weight:bold;">ወደ ዋናው ገጽ ተመለስ</a>
            </div>
        `);
    } catch (err) { res.send("Error loading winners"); }
});

app.all('/verify-payment/:id', async (req, res) => {
    try {
        await Ticket.findOneAndUpdate({ transactionId: req.params.id }, { status: 'Verified' });
        res.status(200).send("Verified");
    } catch (err) { res.status(500).send("Error"); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server started on port ${PORT}`));
