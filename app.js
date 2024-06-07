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

// Ajouter une nouvelle route pour rafraîchir les cryptomonnaies
app.get('/refresh-cryptocurrencies', async (req, res) => {
  try {
    // Ici, vous pouvez insérer le code pour récupérer les nouvelles données de Coingecko et les intégrer dans la base de données de manière différentielle
    // Par exemple, vous pouvez comparer les nouvelles données avec les données existantes dans la base de données et mettre à jour uniquement les entrées qui ont changé
    // Une fois le rafraîchissement terminé, vous pouvez renvoyer une réponse appropriée
    res.status(200).send('Cryptocurrencies refreshed successfully!');
  } catch (error) {
    console.error('Error refreshing cryptocurrencies:', error);
    res.status(500).send('An error occurred while refreshing cryptocurrencies.');
  }
});

// Définir la route par défaut
//app.get('/', (req, res) => {
//  res.redirect('/prices');
//});

// Définir les routes
const indexRouter = require('./routes/index');
const scraperRouter = require('./routes/scraper');

app.use('/', indexRouter);
app.use('/scraper', scraperRouter);

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
