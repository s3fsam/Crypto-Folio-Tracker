const express = require('express');
const router = express.Router();
const axios = require('axios');
const Crypto = require('../models/Crypto'); // Importer le modèle Mongoose pour les cryptomonnaies

// Fonction pour récupérer les données de Coingecko
const fetchCryptoData = async () => {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/coins/list');
    return response.data;
  } catch (error) {
    console.error('Error fetching crypto data:', error);
    throw error;
  }
};

// Fonction pour comparer et mettre à jour les données dans la base de données
const updateCryptoData = async (newData) => {
  try {
    // Insérer ici la logique pour comparer les nouvelles données avec les données existantes dans la base de données et mettre à jour uniquement les entrées qui ont changé
    // Utilisez le modèle Mongoose Crypto pour effectuer des opérations CRUD sur la base de données MongoDB
    // Par exemple : Crypto.findOneAndUpdate(), Crypto.updateMany(), etc.
    console.log('Updating crypto data...');
    console.log('New data:', newData);
    // À compléter avec la logique de mise à jour des données dans la base de données
  } catch (error) {
    console.error('Error updating crypto data:', error);
    throw error;
  }
};

// Route pour rafraîchir les cryptomonnaies
router.get('/refresh-cryptocurrencies', async (req, res) => {
  try {
    // Récupérer les nouvelles données de Coingecko
    const newData = await fetchCryptoData();
    // Mettre à jour les données dans la base de données
    await updateCryptoData(newData);
    res.status(200).send('Cryptocurrencies refreshed successfully!');
  } catch (error) {
    console.error('Error refreshing cryptocurrencies:', error);
    res.status(500).send('An error occurred while refreshing cryptocurrencies.');
  }
});

// Route pour afficher la page d'accueil avec les prix des cryptomonnaies et la liste déroulante des cryptos
router.get('/', async (req, res) => {
  try {
    // Récupérer et afficher les prix des cryptomonnaies Bitcoin et Ethereum
    const pricesResponse = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd');
    const { bitcoin, ethereum } = pricesResponse.data;
    
    // Récupérer la liste des cryptomonnaies depuis la base de données
    const cryptos = await Crypto.find({}, 'id name');
    
    res.render('layouts/layout', {
      title: 'Home',
      content: `
        <h2>Cryptocurrency Prices</h2>
        <p>Bitcoin Price: $${bitcoin.usd}</p>
        <p>Ethereum Price: $${ethereum.usd}</p>

        <h3>Select a Cryptocurrency</h3>
        <select id="crypto-list">
          <% cryptos.forEach(function(crypto) { %>
            <option value="<%= crypto.id %>"><%= crypto.name %></option>
          <% }); %>
        </select>

        <button onclick="refreshCryptocurrencies()">Refresh Cryptocurrencies</button>
        <script>
          function refreshCryptocurrencies() {
            fetch('/refresh-cryptocurrencies')
              .then(response => {
                if (response.ok) {
                  alert('Cryptocurrencies refreshed successfully!');
                } else {
                  alert('Error refreshing cryptocurrencies!');
                }
              })
              .catch(error => console.error('Error refreshing cryptocurrencies:', error));
          }
        </script>
      `
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Error fetching data');
  }
});

module.exports = router;
