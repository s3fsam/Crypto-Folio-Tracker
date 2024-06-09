const express = require('express');
const router = express.Router();
const axios = require('axios');
const Crypto = require('../models/Crypto_List'); // Assurez-vous d'importer correctement votre modèle MongoDB

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

    // Récupérer la liste mise à jour des cryptomonnaies
    const updatedCryptos = await Crypto.find({}, 'id name');

    res.status(200).json(updatedCryptos);
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
      bitcoinPrice: bitcoin.usd,
      ethereumPrice: ethereum.usd,
      cryptos: cryptos
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Error fetching data');
  }
});

module.exports = router;
