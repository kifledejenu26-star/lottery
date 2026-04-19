const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

// 1. የዳታቤዝ ግንኙነት
const dbURI = "mongodb+srv://kifledejenu26_db_user:kifle%401669339@cluster0.j2yp1l9.mongodb.net/ethiopia-lot?retryWrites=true&w=majority";

mongoose.connect(dbURI)
  .then(() => console.log('MongoDB Connected Successfully!'))
  .catch(err => console.log('DB Error:', err.message));

// 2. Schema Setup
const ticketSchema = new mongoose.Schema({
    name: String,
    phone: String,
    ticketNumber: Number,
    date: { type: Date, default: Date.now }
});
const Ticket = mongoose.model('Ticket', ticketSchema);

// 3. Middleware & View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // ይህ መስመር ፎልደሩን እንዲያገኝ ያደርገዋል
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 4. Routes
// የመግቢያ ገጽ
app.get('/', (req, res) => {
    res.render('index');
});

// ሎተሪ መግዣ
app.post('/buy', async (req, res) => {
    try {
        const { name, phone } = req.body;
        const ticketNumber = Math.floor(100000 + Math.random() * 900000);
        const newTicket = new Ticket({ name, phone, ticketNumber });
        await newTicket.save();
        res.render('success', { name, ticketNumber });
    } catch (err) {
        console.log(err);
        res.status(500).send("ስህተት ተፈጥሯል");
    }
});

// የአስተዳዳሪ ገጽ (የተሸጡ ሎተሪዎችን ለማየት)
app.get('/admin', async (req, res) => {
    try {
        const tickets = await Ticket.find().sort({ date: -1 });
        res.render('admin', { tickets });
    } catch (err) {
        res.status(500).send("መረጃ ማምጣት አልተቻለም");
    }
  // የአሸናፊዎች ገጽ
app.get('/winner', async (req, res) => {
    try {
        const allTickets = await Ticket.find();
        if (allTickets.length === 0) {
            return res.render('winner', { winner: null });
        }
        // ከዝርዝሩ ውስጥ አንዱን በድንገት መምረጥ
        const randomIndex = Math.floor(Math.random() * allTickets.length);
        const winner = allTickets[randomIndex];
        
        res.render('winner', { winner: winner });
    } catch (err) {
        res.status(500).send("ስህተት ተፈጥሯል");
    }
});
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
