const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
// Infobip SDK እዚህ ጋር ገብቷል
const { Infobip, AuthType } = require('@infobip-api-client/sdk');

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// MongoDB Connection
mongoose.connect('mongodb+srv://israel:yourpassword@cluster0.mongodb.net/lottery', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('✅ MongoDB connected successfully!'))
  .catch(err => console.log('❌ MongoDB connection error:', err));

// Infobip Configuration
// ማሳሰቢያ፡ እነዚህን መረጃዎች በራስህ የ Infobip መረጃዎች መተካት ትችላለህ
let infobip = new Infobip({
    baseUrl: "https://89m88n.api.infobip.com", // ያንተን Base URL እዚህ አስገባ
    apiKey: "your_api_key_here",               // ያንተን API Key እዚህ አስገባ
    authType: AuthType.ApiKey,
});

// Routes
app.get('/', (req, res) => {
    res.render('index');
});

// ስልክ ቁጥር ተቀብሎ SMS የሚልክ Route
app.post('/register', async (req, res) => {
    const { phoneNumber } = req.body;

    try {
        // SMS ለመላክ የሚደረግ ሙከራ
        const response = await infobip.channels.sms.send({
            messages: [
                {
                    from: "InfoSMS",
                    destinations: [{ to: phoneNumber }],
                    text: "እንኳን ደስ አለዎት! በሎተሪው በተሳካ ሁኔታ ተመዝግበዋል።",
                },
            ],
        });

        console.log('SMS Sent Successfully:', response.data);
        res.render('success', { message: "ምዝገባው ተጠናቅቋል፣ የጽሁፍ መልዕክት በስልክዎ ይደርስዎታል።" });
    } catch (error) {
        console.error('SMS Sending Error:', error);
        // SMS ባይላክም ተጠቃሚው መመዝገቡን እንዲያውቅ ለማድረግ
        res.render('success', { message: "ምዝገባው ተጠናቅቋል (SMS መላክ ግን አልተቻለም)።" });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Server started on port ${PORT}`);
});
