const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

// Configurer le moteur de vue EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configurer les répertoires statiques
app.use(express.static(path.join(__dirname, 'public')));

// Middleware pour analyser les requêtes JSON
app.use(express.json()); // Ajoutez cette ligne

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

const Crypto = require('./models/Crypto_List'); // Assurez-vous d'importer correctement votre modèle MongoDB

// Fonction pour télécharger la liste des cryptomonnaies et l'enregistrer dans un fichier JSON
async function downloadCryptoList() {
  console.log('Downloading crypto list...');
  const response = await axios.get('https://api.coingecko.com/api/v3/coins/list');
  const cryptoList = response.data;
  fs.writeFileSync('cryptoList.json', JSON.stringify(cryptoList));
  console.log('Crypto list downloaded and saved to cryptoList.json');
}

// Route pour télécharger la liste des cryptomonnaies et l'enregistrer dans un fichier JSON
app.get('/download-cryptocurrencies', async (req, res) => {
  try {
    await downloadCryptoList();
    res.status(200).send('Cryptocurrency list downloaded and saved successfully!');
  } catch (error) {
    console.error('Error downloading cryptocurrencies list:', error);
    res.status(500).send('An error occurred while downloading cryptocurrencies list.');
  }
});

// Route pour lire le fichier JSON et mettre à jour la base de données de manière différentielle
app.get('/refresh-cryptocurrencies', async (req, res) => {
  console.log('List Crypto Refresh en Cour');
  try {
    const filePath = 'cryptoList.json';
    let cryptoList = [];

    // Vérifier si le fichier existe, sinon le télécharger
    if (!fs.existsSync(filePath)) {
      console.log('cryptoList.json not found, downloading...');
      await downloadCryptoList();
    }

    // Lire le contenu du fichier cryptoList.json
    const fileData = fs.readFileSync(filePath);
    cryptoList = JSON.parse(fileData);

    // Charger les données existantes de la collection "cryptolists"
    const dbCryptoList = await Crypto.find({}, { _id: 0, __v: 0 });

    // Vérifier chaque crypto dans la liste pour voir si elle existe dans la base de données
    for (const crypto of cryptoList) {
      const existsInDB = dbCryptoList.some(dbCrypto => dbCrypto.id === crypto.id);
      if (!existsInDB) {
        // Si la crypto n'existe pas dans la base de données, l'ajouter
        await Crypto.create(crypto);
        console.log(`Added ${crypto.name} (${crypto.id}) to MongoDB.`);
      }
    }

    console.log('Crypto list updated in MongoDB.');
    // Répondre avec un message de succès
    res.status(200).send('Crypto list refreshed successfully.');
  } catch (error) {
    console.error('Error refreshing cryptocurrencies:', error);
    res.status(500).send('An error occurred while refreshing cryptocurrencies.');
  }
});

// Route pour récupérer tous les noms des cryptomonnaies
app.get('/get-cryptocurrency-names', async (req, res) => {
  try {
    const cryptoNames = await Crypto.find({}, 'name');
    res.status(200).json(cryptoNames);
  } catch (error) {
    console.error('Error fetching cryptocurrency names:', error);
    res.status(500).send('An error occurred while fetching cryptocurrency names.');
  }
});

// Définir les routes
const indexRouter = require('./routes/index');
const scraperRouter = require('./routes/scraper');

app.use('/', indexRouter);
app.use('/scraper', scraperRouter);

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
