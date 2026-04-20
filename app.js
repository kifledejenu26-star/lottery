const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();

// MongoDB ግንኙነት (የአንተን ሊንክ እዚህ ጋር ተካው)
mongoose.connect('mongodb+srv://israel:yourpassword@cluster0.mongodb.net/lotteryDB');

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// የዳታቤዝ ቅርጽ (Schema)
const ticketSchema = new mongoose.Schema({
    name: String,
    phone: String,
    ticketNumber: Number,
    transactionId: String, // ለክፍያ
    prizeType: String,     // ቤት ወይስ መኪና
    date: { type: Date, default: Date.now }
});

const Ticket = mongoose.model('Ticket', ticketSchema);

// 1. ዋናው ገጽ (Home)
app.get('/', (req, res) => {
    res.render('index');
});

// 2. መመዝገቢያ (Buy)
app.post('/buy', async (req, res) => {
    try {
        const { name, phone, transactionId, prizeType } = req.body;
        const ticketNumber = Math.floor(100000 + Math.random() * 900000);
        
        const newTicket = new Ticket({ name, phone, ticketNumber, transactionId, prizeType });
        await newTicket.save();
        
        res.render('success', { name, ticketNumber });
    } catch (err) {
        res.status(500).send("ስህተት ተፈጥሯል");
    }
});

// 3. የአሸናፊዎች ገጽ
app.get('/winner', async (req, res) => {
    const allTickets = await Ticket.find();
    const winner = allTickets.length > 0 ? allTickets[Math.floor(Math.random() * allTickets.length)] : null;
    res.render('winner', { winner });
});

// 4. የአድሚን ገጽ (በፓስወርድ ጥበቃ)
app.get('/admin', async (req, res) => {
    const { pass } = req.query;
    if (pass === "israel2026") { // ፓስወርድህ "israel2026" ነው
        const tickets = await Ticket.find().sort({ date: -1 });
        res.render('admin', { tickets });
    } else {
        res.send("<h2>ይቅርታ፣ ገጹን ለመክፈት ፓስወርድ ያስፈልጋል!</h2><p>አጠቃቀም: /admin?pass=ፓስወርድህ</p>");
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
