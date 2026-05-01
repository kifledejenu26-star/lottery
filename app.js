const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const app = express();

// 1. MongoDB ግንኙነት
const dbURI = 'mongodb+srv://israel_user:israel2026@cluster0.j2yp1l9.mongodb.net/lotteryDB?retryWrites=true&w=majority';

mongoose.connect(dbURI)
    .then(() => console.log('MongoDB connected successfully!'))
    .catch(err => console.log('MongoDB Connection Error:', err));

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// 2. የዳታቤዝ ቅርጽ (Schema)
const ticketSchema = new mongoose.Schema({
    name: String,
    phone: String,
    ticketNumber: Number,
    transactionId: String,
    prizeType: String,
    status: { type: String, default: 'Pending' }, // ክፍያ ገና መሆኑን ለማወቅ
    date: { type: Date, default: Date.now }
});

const Ticket = mongoose.model('Ticket', ticketSchema);

// 3. መንገዶች (Routes)

// ሀ. ዋናው ገጽ (Home)
app.get('/', (req, res) => {
    res.render('index');
});

// ለ. ምዝገባ እና ወደ ክፍያ ገጽ መላክ
app.post('/buy', async (req, res) => {
    try {
        const { name, phone, prizeType } = req.body;
        const ticketNumber = Math.floor(100000 + Math.random() * 900000);
        
        const newTicket = new Ticket({ 
            name, 
            phone, 
            ticketNumber, 
            prizeType 
        });
        
        const savedTicket = await newTicket.save();
        
        // ምዝገባው ሲያልቅ የክፍያ ገጹን (payment.ejs) ይከፍታል
        res.render('payment', { 
            ticketNumber: ticketNumber, 
            ticketId: savedTicket._id 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("ምዝገባ ላይ ስህተት ተፈጥሯል");
    }
});

// ሐ. የደረሰኝ ቁጥር (Transaction ID) መቀበያ
app.post('/confirm-payment', async (req, res) => {
    try {
        const { ticketId, transactionId } = req.body;
        
        // የደረሰኝ ቁጥሩን ዳታቤዝ ውስጥ ያዘምናል
        await Ticket.findByIdAndUpdate(ticketId, { 
            transactionId: transactionId,
            status: 'Processing' // አሁን ወደ ማረጋገጫ ገብቷል
        });
        
        // ስኬታማ መሆኑን ለተጠቃሚው ያሳያል
        res.render('success', { 
            name: "ተሳታፊ", 
            ticketNumber: "ክፍያዎ ሲረጋገጥ መልእክት ይደርስዎታል" 
        });
    } catch (err) {
        res.status(500).send("ክፍያ ማረጋገጥ ላይ ስህተት ተፈጥሯል");
    }
});

// መ. የአድሚን ገጽ (ሁሉንም ዝርዝር ለማየት)
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

// ሰ. የአሸናፊዎች ገጽ
app.get('/winner', async (req, res) => {
    try {
        const allTickets = await Ticket.find({ status: 'Confirmed' }); // የከፈሉትን ብቻ ለማየት
        const winner = allTickets.length > 0 ? allTickets[Math.floor(Math.random() * allTickets.length)] : null;
        res.render('winner', { winner });
    } catch (err) {
        res.status(500).send("ስህተት ተፈጥሯል");
    }
});

// 4. ሰርቨር ማስጀመር
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
