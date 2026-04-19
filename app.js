const express = require('express');
const mongoose = require('mongoose');
const app = express();

// 1. የዳታቤዝ ግንኙነት (MongoDB Atlas)
// ፓስወርድህ ላይ ያለው @ ምልክት በ %40 ተተክቷል
const dbURI = "mongodb+srv://kifledejenu26_db_user:kifle%401669339@cluster0.j2yp1l9.mongodb.net/ethiopia-lot?retryWrites=true&w=majority";

mongoose.connect(dbURI)
  .then(() => console.log('በጣም ደስ ይላል! ከ MongoDB Atlas ጋር ተገናኝተናል...'))
  .catch((err) => console.log('የዳታቤዝ ግንኙነት ስህተት:', err.message));

// 2. Middleware
app.use(express.urlencoded({ extended: true }));

// 3. Routes
app.get('/', (req, res) => {
    res.send('<h1>ሰላም! ዌብሳይቱ አሁን በንጽህና እየሰራ ነው።</h1><p>ዳታቤዙ መገናኘቱን በ Logs ላይ ያረጋግጡ።</p>');
});

// 4. ሰርቨር ማስነሻ
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`ሰርቨሩ በፖርት ${PORT} ላይ ስራ ጀምሯል...`);
});
