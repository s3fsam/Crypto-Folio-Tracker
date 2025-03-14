const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const UserCrypto = require('../models/User_Crypto');
const Crypto = require('../models/Crypto_List'); // Assurez-vous d'importer correctement votre modèle MongoDB

// Fonction pour récupérer le solde depuis une URL de l'explorateur de blocs avec deux délimiteurs
const getBalanceFromExplorer = async (url, delimiterStart, delimiterEnd) => {
  try {
    console.log(`🔍 Fetching balance from: ${url}`);

    const response = await axios.get(url);
    const data = response.data;

    if (!data || typeof data !== 'string') {
      throw new Error('Invalid response data');
    }

    // Trouver le texte entre les deux délimiteurs
    const startIndex = data.indexOf(delimiterStart) + delimiterStart.length;
    const endIndex = data.indexOf(delimiterEnd, startIndex);

    if (startIndex < delimiterStart.length || endIndex === -1) {
      throw new Error(`Failed to locate balance using delimiters: '${delimiterStart}', '${delimiterEnd}'`);
    }

    const balanceText = data.substring(startIndex, endIndex).trim();

    // Extraire les chiffres de balanceText
    const balance = parseFloat(balanceText.replace(/[^0-9.-]+/g, ""));
    if (isNaN(balance)) {
      throw new Error(`Balance extraction failed. Raw text: '${balanceText}'`);
    }

    console.log(`✅ Balance extracted: ${balance}`);
    return balance;
  } catch (error) {
    console.error('❌ Error fetching balance:', error.message);
    return { error: 'Failed to fetch balance' };
  }
};

// Route pour ajouter une nouvelle adresse crypto et récupérer le solde
router.post('/add-crypto-address', async (req, res) => {
  const { crypto, address, delimiterStart, delimiterEnd } = req.body;

  if (!crypto || !address || !delimiterStart || !delimiterEnd) {
    console.warn('⚠️ Missing required fields');
    return res.status(400).json({ error: 'Crypto, address, and delimiters are required' });
  }

  try {
    const balance = await getBalanceFromExplorer(address, delimiterStart, delimiterEnd);
    if (balance.error) return res.status(500).json({ error: balance.error });

    const userCrypto = new UserCrypto({ crypto, address, balance });
    await userCrypto.save();

    console.log(`✅ Crypto address added: ${crypto} - ${address}`);
    res.status(201).json(userCrypto);
  } catch (error) {
    console.error('❌ Error adding crypto address:', error.message);
    res.status(500).json({ error: 'Error adding crypto address' });
  }
});

// Route pour mettre à jour la balance d'une cryptomonnaie
router.post('/add-balance', async (req, res) => {
  const { crypto, address } = req.body;

  if (!crypto || !address) {
    console.warn('⚠️ Crypto and address are required');
    return res.status(400).json({ error: 'Crypto and address are required' });
  }

  try {
    const balance = await getBalanceFromExplorer(address);
    if (balance.error) return res.status(500).json({ error: balance.error });

    const updatedCrypto = await Crypto.findOneAndUpdate(
      { id: crypto },
      { balance },
      { new: true, upsert: true }
    );

    console.log(`✅ Balance updated for ${crypto}: ${balance}`);
    res.status(200).json({ message: 'Balance updated successfully', crypto: updatedCrypto });
  } catch (error) {
    console.error('❌ Error updating balance:', error.message);
    res.status(500).json({ error: 'An error occurred while updating balance.' });
  }
});

// Route pour rafraîchir la liste des cryptomonnaies
router.get('/refresh-cryptocurrencies', async (req, res) => {
  try {
    console.log('🔄 Refreshing cryptocurrency data...');
    const newData = await fetchCryptoData();
    await updateCryptoData(newData);
    const updatedCryptos = await Crypto.find({}, 'id name');

    console.log(`✅ Successfully refreshed ${updatedCryptos.length} cryptocurrencies.`);
    res.status(200).json(updatedCryptos);
  } catch (error) {
    console.error('❌ Error refreshing cryptocurrencies:', error.message);
    res.status(500).json({ error: 'An error occurred while refreshing cryptocurrencies.' });
  }
});

// Route pour afficher la page d'accueil avec les prix des cryptomonnaies et la liste des cryptos
router.get('/', async (req, res) => {
  try {
    console.log('🔍 Fetching cryptocurrency prices...');
    const pricesResponse = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd');
    const { bitcoin, ethereum } = pricesResponse.data;
    const cryptos = await Crypto.find({}, 'id name');

    console.log('✅ Successfully fetched cryptocurrency data.');
    res.render('layouts/layout', {
      title: 'Home',
      bitcoinPrice: bitcoin.usd,
      ethereumPrice: ethereum.usd,
      cryptos
    });
  } catch (error) {
    console.error('❌ Error fetching data:', error.message);
    res.status(500).json({ error: 'Error fetching data' });
  }
});

module.exports = router;
