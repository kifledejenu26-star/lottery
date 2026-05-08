const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const axios = require('axios');
const { Infobip, AuthType } = require('@infobip-api-client/sdk'); 

const app = express();

// 1. ኮንፊገሬሽን
const dbURI = "mongodb+srv://israel_user:israel2026@cluster0.j2yp1l9.mongodb.net/lotteryDB?retryWrites=true&w=majority";
const CHAPA_SECRET_KEY = 'CHASECK_TEST-9b6jscSvjH68fsL6QR0IJyCB0HoGSacz'; 

const infobip = new Infobip({
    baseUrl: "https://m9xgn9.api.infobip.com",
    apiKey: "d9aab6e1c252ed1226bfd82c94ab929f-60ef815d-7148-41e3-9fba-299c09c3d527",
    authType: AuthType.ApiKey,
});

// 2. ዳታቤዝ ግንኙነት
mongoose.connect(dbURI)
    .then(() => console.log('✅ MongoDB connected successfully!'))
    .catch(err => console.error('❌ MongoDB error:', err.message));

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// 3. Routes
app.get('/', (req, res) => res.render('index'));

// እዚህ ጋር የሎተሪ ሽያጭ እና SMS መላኪያ ኮድህ ይቀጥላል...

// 4. ሰርቨሩን ማስነሳት (Port Binding ለ Render)
const PORT = process.env.PORT || 10000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on port ${PORT}`);
});
