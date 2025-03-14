const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');
const { Builder, By, until } = require('selenium-webdriver');
const UserCrypto = require('../models/User_Crypto');
const Crypto = require('../models/Crypto_List'); // Assurez-vous d'importer correctement votre modèle MongoDB

// ✅ Fonction avec Selenium pour récupérer le solde
const getBalanceWithSelenium = async (url) => {
  try {
    console.log(`🔍 Fetching balance dynamically using Selenium from: ${url}`);

    // Lancement du navigateur headless
    let driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions()
      .build();

    await driver.get(url);

    // Attendre que l'élément contenant le solde apparaisse (ajuster le sélecteur si nécessaire)
    await driver.wait(until.elementLocated(By.css('p.w-fit.break-all.font-space.text-2xl.sm\\:text-36')), 10000);
    
    let balanceElement = await driver.findElement(By.css('p.w-fit.break-all.font-space.text-2xl.sm\\:text-36'));
    let balanceText = await balanceElement.getText();

    await driver.quit();

    if (!balanceText) {
      throw new Error(`⚠️ Balance non trouvée.`);
    }

    // Extraire uniquement les chiffres
    const balance = parseFloat(balanceText.replace(/[^0-9.-]+/g, ""));
    if (isNaN(balance)) {
      throw new Error(`⚠️ Balance extraction failed. Raw text: '${balanceText}'`);
    }

    console.log(`✅ Balance extraite: ${balance}`);
    return balance;
  } catch (error) {
    console.error('❌ Error fetching balance with Selenium:', error.message);
    return { error: 'Failed to fetch balance' };
  }
};

// ✅ Route pour ajouter une adresse crypto et récupérer son solde
router.post('/add-crypto-address', async (req, res) => {
  const { crypto, address } = req.body;

  if (!crypto || !address) {
    console.warn('⚠️ Missing required fields');
    return res.status(400).json({ error: 'Crypto and address are required' });
  }

  try {
    let balance = await getBalanceWithSelenium(address);

    if (balance.error) {
      return res.status(500).json({ error: balance.error });
    }

    const userCrypto = new UserCrypto({ crypto, address, balance });
    await userCrypto.save();

    console.log(`✅ Crypto address added: ${crypto} - ${address}`);
    res.status(201).json(userCrypto);
  } catch (error) {
    console.error('❌ Error adding crypto address:', error.message);
    res.status(500).json({ error: 'Error adding crypto address' });
  }
});

// ✅ Route GET `/` pour afficher la page d'accueil
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
