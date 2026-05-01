const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();

// MongoDB ግንኙነት - የተሻሻለ (Recommended Connection Options)
const dbURI = 'mongodb+srv://israel_user:israel2026@cluster0.j2yp1l9.mongodb.net/lotteryDB?retryWrites=true&w=majority';

mongoose.connect(dbURI)
    .then(() => console.log('MongoDB connected successfully!'))
    .catch(err => console.log('MongoDB Connection Error:', err));

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// የዳታቤዝ ቅርጽ (Schema)
const ticketSchema = new mongoose.Schema({
    name: String,
    phone: String,
    ticketNumber: Number,
    transactionId: String,
    prizeType: String,
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
        console.error(err); // ስህተቱን ለማየት ይረዳል
        res.status(500).send("ስህተት ተፈጥሯል");
    }
});

// 3. የአሸናፊዎች ገጽ
app.get('/winner', async (req, res) => {
    try {
        const allTickets = await Ticket.find();
        const winner = allTickets.length > 0 ? allTickets[Math.floor(Math.random() * allTickets.length)] : null;
        res.render('winner', { winner });
    } catch (err) {
        res.status(500).send("የአሸናፊዎች ገጽ ላይ ስህተት ተፈጥሯል");
    }
});

// 4. የአድሚን ገጽ (በፓስወርድ ጥበቃ)
app.get('/admin', async (req, res) => {
    const { pass } = req.query;
    if (pass === "israel2026") { 
        try {
            const tickets = await Ticket.find().sort({ date: -1 });
            res.render('admin', { tickets });
        } catch (err) {
            res.status(500).send("ዳታቤዝ ማንበብ አልተቻለም");
        }
    } else {
        res.send("<h2>ይቅርታ፣ ገጹን ለመክፈት ፓስወርድ ያስፈልጋል!</h2><p>አጠቃቀም: /admin?pass=israel2026</p>");
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
