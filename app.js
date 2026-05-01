const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const multer = require('multer'); // አዲስ
const path = require('path'); // አዲስ
const app = express();

// ምስል የሚቀመጥበት ቦታ (Storage)
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: function(req, file, cb) {
        cb(null, 'receipt-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const dbURI = 'mongodb+srv://israel_user:israel2026@cluster0.j2yp1l9.mongodb.net/lotteryDB?retryWrites=true&w=majority';
mongoose.connect(dbURI).then(() => console.log('MongoDB connected!'));

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

const ticketSchema = new mongoose.Schema({
    name: String,
    phone: String,
    ticketNumber: Number,
    transactionId: String,
    prizeType: String,
    receiptImage: String, // ምስሉ የሚቀመጥበት ስም
    status: { type: String, default: 'Pending' },
    date: { type: Date, default: Date.now }
});
const Ticket = mongoose.model('Ticket', ticketSchema);

app.get('/', (req, res) => res.render('index'));

app.post('/buy', async (req, res) => {
    const { name, phone, prizeType } = req.body;
    const ticketNumber = Math.floor(100000 + Math.random() * 900000);
    const newTicket = new Ticket({ name, phone, ticketNumber, prizeType });
    const savedTicket = await newTicket.save();
    res.render('payment', { ticketNumber, ticketId: savedTicket._id });
});

// የደረሰኝ ቁጥር እና ምስል መቀበያ
app.post('/confirm-payment', upload.single('receiptImage'), async (req, res) => {
    try {
        const { ticketId, transactionId } = req.body;
        const updateData = { transactionId, status: 'Processing' };
        if (req.file) updateData.receiptImage = req.file.filename; // ምስሉ ካለ ስሙን መመዝገብ

        await Ticket.findByIdAndUpdate(ticketId, updateData);
        res.render('success');
    } catch (err) { res.status(500).send("Error"); }
});

app.get('/admin', async (req, res) => {
    const { pass } = req.query;
    if (pass === "israel2026") {
        const tickets = await Ticket.find().sort({ date: -1 });
        res.render('admin', { tickets });
    } else { res.send("Password Required"); }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
