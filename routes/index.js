const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const UserCrypto = require('../models/User_Crypto');
const Crypto = require('../models/Crypto_List'); // Assurez-vous d'importer correctement votre modèle MongoDB

// Fonction pour récupérer le solde depuis une URL de l'explorateur de blocs avec deux délimiteurs
const getBalanceFromExplorer = async (url, delimiterStart, delimiterEnd) => {
  try {
    const response = await axios.get(url);
    const data = response.data;

    // Trouver le texte entre les deux délimiteurs
    const startIndex = data.indexOf(delimiterStart) + delimiterStart.length;
    const endIndex = data.indexOf(delimiterEnd, startIndex);
    const balanceText = data.substring(startIndex, endIndex).trim();

    // Extraire les chiffres de balanceText
    const balance = parseFloat(balanceText.replace(/[^0-9.-]+/g, ""));
    if (isNaN(balance)) {
      console.error(`Failed to parse balance: '${balanceText}' using delimiters: '${delimiterStart}', '${delimiterEnd}'`);
      throw new Error('Balance is not a number');
    }
    return balance;
  } catch (error) {
    console.error('Error fetching balance:', error);
    throw error;
  }
};

router.post('/add-balance', async (req, res) => {
  const { crypto, address } = req.body;
  try {
    const balance = await getBalanceFromExplorer(address);

    const updatedCrypto = await Crypto.findOneAndUpdate(
      { id: crypto },
      { balance },
      { new: true, upsert: true }
    );

    res.status(200).json({ message: 'Balance updated successfully', crypto: updatedCrypto });
  } catch (error) {
    console.error('Error updating balance:', error);
    res.status(500).send('An error occurred while updating balance.');
  }
});

// Route pour ajouter une nouvelle adresse crypto
router.post('/add-crypto-address', async (req, res) => {
  const { crypto, address, delimiterStart, delimiterEnd } = req.body;
  try {
    const balance = await getBalanceFromExplorer(address, delimiterStart, delimiterEnd);
    const userCrypto = new UserCrypto({ crypto, address, balance });
    await userCrypto.save();
    res.status(201).json(userCrypto);
  } catch (error) {
    console.error('Error adding crypto address:', error);
    res.status(500).send('Error adding crypto address');
  }
});

// Route pour rafraîchir les cryptomonnaies (existant)
router.get('/refresh-cryptocurrencies', async (req, res) => {
  try {
    const newData = await fetchCryptoData();
    await updateCryptoData(newData);
    const updatedCryptos = await Crypto.find({}, 'id name');
    res.status(200).json(updatedCryptos);
  } catch (error) {
    console.error('Error refreshing cryptocurrencies:', error);
    res.status(500).send('An error occurred while refreshing cryptocurrencies.');
  }
});

// Route pour afficher la page d'accueil avec les prix des cryptomonnaies et la liste déroulante des cryptos (existant)
router.get('/', async (req, res) => {
  try {
    const pricesResponse = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd');
    const { bitcoin, ethereum } = pricesResponse.data;
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
