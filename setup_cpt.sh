#!/bin/bash

# Mettre à jour le système
apt update
apt upgrade -y

# Installer Node.js et npm
apt install -y nodejs npm

# Ajouter le dépôt MongoDB et installer MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/debian bookworm/mongodb-org/7.0 main" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update
apt install -y mongodb-org

# Démarrer et activer MongoDB
systemctl start mongod
systemctl enable mongod

# Créer le projet Node.js
mkdir -p /crypto-portfolio-tracker
cd /crypto-portfolio-tracker
npm init -y

# Installer les dépendances nécessaires
npm install express mongoose ejs axios cheerio

# Créer la structure des répertoires
mkdir -p views/layouts public/css public/js models routes

# Créer le fichier app.js
cat << 'EOF' > app.js
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5000;

// Configurer le moteur de vue EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configurer les répertoires statiques
app.use(express.static(path.join(__dirname, 'public')));

// Connexion à MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/crypto-portfolio', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('Could not connect to MongoDB...', err));

// Récupérer et afficher les prix des cryptomonnaies
app.get('/prices', async (req, res) => {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd');
    const { bitcoin, ethereum } = response.data;
    res.render('layouts/layout', {
      title: 'Cryptocurrency Prices',
      content: `
        <h2>Cryptocurrency Prices</h2>
        <p>Bitcoin Price: $${bitcoin.usd}</p>
        <p>Ethereum Price: $${ethereum.usd}</p>
      `
    });
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    res.status(500).send('Error fetching crypto prices');
  }
});

// Définir la route par défaut
app.get('/', (req, res) => {
  res.redirect('/prices');
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
EOF

# Créer le fichier routes/index.js
cat << 'EOF' > routes/index.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('layouts/layout', {
    title: 'Home',
    content: '<%- include("../views/index") %>'
  });
});

module.exports = router;
EOF

# Créer le fichier routes/scraper.js
cat << 'EOF' > routes/scraper.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');

router.get('/update/bitcoin', async (req, res) => {
  // Scraper les données de Bitcoin (ajouter la logique ici)
  res.send('Bitcoin prices updated');
});

module.exports = router;
EOF

# Créer le fichier models/Crypto.js
cat << 'EOF' > models/Crypto.js
const mongoose = require('mongoose');

const cryptoSchema = new mongoose.Schema({
  name: String,
  symbol: String,
  priceUSD: Number,
  priceEUR: Number,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Crypto', cryptoSchema);
EOF

# Créer le fichier views/index.ejs
cat << 'EOF' > views/index.ejs
<h1>Welcome to Crypto Portfolio Tracker</h1>
<a href="/scraper/update/bitcoin">Update Bitcoin Prices</a>
EOF

# Créer le fichier views/layouts/layout.ejs
cat << 'EOF' > views/layouts/layout.ejs
<!DOCTYPE html>
<html>
<head>
  <title><%= title %></title>
  <link rel="stylesheet" href="/css/styles.css">
</head>
<body>
  <header>
    <h1>Crypto Portfolio Tracker</h1>
  </header>
  <main>
    <%- content %>
  </main>
</body>
</html>
EOF

# Créer le fichier CSS public/css/styles.css
cat << 'EOF' > public/css/styles.css
body {
  font-family: Arial, sans-serif;
  background-color: #f4f4f4;
  margin: 0;
  padding: 0;
}

header {
  background: #333;
  color: #fff;
  padding: 10px 0;
  text-align: center;
}

main {
  padding: 20px;
}
EOF

# Lancer l'application
node app.js
