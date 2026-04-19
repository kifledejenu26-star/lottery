const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const app = express();

const dbURI = "mongodb+srv://kifledejenu26_db_user:kifle%401669339@cluster0.j2yp1l9.mongodb.net/ethiopia-lot?retryWrites=true&w=majority";

mongoose.connect(dbURI)
  .then(() => console.log('MongoDB Connected...'))
  .catch(err => console.log('DB Error:', err.message));

// Schema
const ticketSchema = new mongoose.Schema({
    name: String,
    phone: String,
    ticketNumber: Number
});
const Ticket = mongoose.model('Ticket', ticketSchema);

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => res.render('index'));

app.post('/buy', async (req, res) => {
    const { name, phone } = req.body;
    const ticketNumber = Math.floor(100000 + Math.random() * 900000);
    try {
        const newTicket = new Ticket({ name, phone, ticketNumber });
        await newTicket.save();
        res.render('success', { name, ticketNumber });
    } catch (err) {
        res.send("ስህተት ተፈጥሯል");
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server on ${PORT}`));
