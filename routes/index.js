const express = require('express');
const router = express.Router();
const axios = require('axios');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const UserCrypto = require('../models/User_Crypto');
const Crypto = require('../models/Crypto_List'); // Assurez-vous d'importer correctement votre modèle MongoDB

// Fonction pour récupérer le solde avec Cheerio
const getBalanceFromExplorer = async (url, delimiterStart, delimiterEnd) => {
  try {
    console.log(`🔍 Fetching balance from: ${url}`);

    const response = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' } // Simule un vrai navigateur
    });

    const data = response.data;
    console.log('🔎 HTML reçu (aperçu):\n', data.substring(0, 1000)); // Affiche les 1000 premiers caractères pour analyse

    if (!data || typeof data !== 'string') {
      throw new Error('Invalid response data');
    }

    // Charger le HTML avec Cheerio
    const $ = cheerio.load(data);

    // Sélecteur CSS basé sur la classe exacte
    const balanceText = $('p.w-fit.break-all.font-space.text-2xl.sm\\:text-36').text().replace('QUBIC', '').trim();

    if (!balanceText) {
      throw new Error(`⚠️ Balance non trouvée. Vérifie si le sélecteur est correct.`);
    }

    // Extraire uniquement les chiffres
    const balance = parseFloat(balanceText.replace(/[^0-9.-]+/g, ""));
    if (isNaN(balance)) {
      console.error(`⚠️ Balance extraction failed. Raw text: '${balanceText}'`);
      return { error: 'Failed to parse balance' };
    }

    console.log(`✅ Balance extraite: ${balance}`);
    return balance;
  } catch (error) {
    console.error('❌ Error fetching balance:', error.message);
    return { error: 'Failed to fetch balance' };
  }
};

// Fonction alternative avec Puppeteer (si Axios & Cheerio ne fonctionnent pas)
const getBalanceWithPuppeteer = async (url, delimiterStart, delimiterEnd) => {
  try {
    console.log(`🔍 Fetching balance dynamically from: ${url}`);

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    const htmlContent = await page.content();
    console.log('🔎 HTML complet reçu:\n', htmlContent.substring(0, 500));

    const $ = cheerio.load(htmlContent);
    let balanceText;

    if (delimiterStart.startsWith('<') && delimiterStart.includes('class')) {
      balanceText = $(delimiterStart).text();
    } else {
      const startIndex = htmlContent.indexOf(delimiterStart) + delimiterStart.length;
      const endIndex = htmlContent.indexOf(delimiterEnd, startIndex);
      
      if (startIndex < delimiterStart.length || endIndex === -1) {
        throw new Error(`⚠️ Failed to locate balance using delimiters: '${delimiterStart}', '${delimiterEnd}'`);
      }

      balanceText = htmlContent.substring(startIndex, endIndex).trim();
    }

    const balance = parseFloat(balanceText.replace(/[^0-9.-]+/g, ""));
    if (isNaN(balance)) {
      throw new Error(`⚠️ Balance extraction failed. Raw text: '${balanceText}'`);
    }

    console.log(`✅ Balance extracted: ${balance}`);
    await browser.close();
    return balance;
  } catch (error) {
    console.error('❌ Error fetching balance with Puppeteer:', error.message);
    return { error: 'Failed to fetch balance' };
  }
};

// Route pour ajouter une adresse crypto et récupérer son solde
router.post('/add-crypto-address', async (req, res) => {
  const { crypto, address, delimiterStart, delimiterEnd } = req.body;

  if (!crypto || !address || !delimiterStart || !delimiterEnd) {
    console.warn('⚠️ Missing required fields');
    return res.status(400).json({ error: 'Crypto, address, and delimiters are required' });
  }

  try {
    let balance = await getBalanceFromExplorer(address, delimiterStart, delimiterEnd);

    if (balance.error) {
      console.warn('⚠️ Trying Puppeteer as fallback...');
      balance = await getBalanceWithPuppeteer(address, delimiterStart, delimiterEnd);
    }

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

module.exports = router;
