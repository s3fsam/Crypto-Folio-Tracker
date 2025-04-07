// ... les require restent inchangés

const express = require('express');
const router = express.Router();

const axios = require('axios');
const cheerio = require('cheerio');
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { execSync } = require('child_process');
const UserCrypto = require('../models/User_Crypto');
const Crypto = require('../models/Crypto_List');

// ✅ Méthode par délimiteurs HTML (prioritaire si les deux champs sont remplis)
const getBalanceFromDelimiters = async (url, delimiterStart, delimiterEnd) => {
  try {
    const response = await axios.get(url);
    const data = response.data;

    const startIndex = data.indexOf(delimiterStart);
    if (startIndex === -1) throw new Error('Début introuvable');
    const endIndex = data.indexOf(delimiterEnd, startIndex + delimiterStart.length);
    if (endIndex === -1) throw new Error('Fin introuvable');

    const balanceText = data.substring(startIndex + delimiterStart.length, endIndex).trim();
    const balance = parseFloat(balanceText.replace(/[^0-9.-]+/g, ""));
    if (isNaN(balance)) throw new Error(`Balance extraction failed: '${balanceText}'`);
    return balance;
  } catch (error) {
    console.error('❌ [DELIMITERS] Error:', error.message);
    return { error: 'Failed to fetch balance with delimiters' };
  }
};

// ✅ Méthode Selenium : CSS sélecteur fourni
const getBalanceWithCssSelector = async (url, cssSelector) => {
  const driver = await launchBrowser(url);
  try {
    const el = await driver.findElement(By.css(cssSelector));
    const balanceText = await el.getText();
    await driver.quit();
    const clean = parseFloat(balanceText.replace(/[^\d.]/g, ''));
    if (isNaN(clean)) throw new Error(`Invalid balance: '${balanceText}'`);
    return clean;
  } catch (err) {
    await driver.quit();
    return { error: 'Failed to fetch with selector' };
  }
};

// ✅ Fallback Selenium : recherche automatique dans les <p>
const getBalanceFromFallbackParagraphs = async (url) => {
  const driver = await launchBrowser(url);
  try {
    const paragraphs = await driver.findElements(By.css('p'));
    for (const p of paragraphs) {
      const text = await p.getText();
      if (text && text.match(/[0-9]{1,3}([.,][0-9]{3})*([.,][0-9]+)?/)) {
        await driver.quit();
        const clean = parseFloat(text.replace(/[^\d.]/g, ''));
        if (isNaN(clean)) break;
        return clean;
      }
    }
    await driver.quit();
    return { error: 'Balance not found in <p>' };
  } catch (err) {
    await driver.quit();
    return { error: 'Error fetching paragraphs' };
  }
};

// ✅ Lance un navigateur Selenium
const launchBrowser = async (url) => {
  execSync('pkill chrome || pkill chromium || pkill -f chromedriver', { stdio: 'ignore' });
  const userDataDir = path.join(os.tmpdir(), `selenium-profile-${Date.now()}`);
  fs.mkdirSync(userDataDir, { recursive: true });

  const options = new chrome.Options().addArguments(
    '--headless', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
    '--disable-software-rasterizer', '--disable-blink-features=AutomationControlled',
    '--remote-debugging-port=9222', `--user-data-dir=${userDataDir}`, '--no-first-run', '--disable-extensions'
  );

  const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
  await driver.get(url);
  return driver;
};

// ✅ Ajout d’une crypto
router.post('/add-crypto-address', async (req, res) => {
  const { crypto, address, delimiterStart, delimiterEnd, cssSelector } = req.body;
  if (!crypto || !address) return res.status(400).json({ error: 'Crypto and address are required' });

  try {
    let balance;
    if (delimiterStart?.trim() && delimiterEnd?.trim()) {
      balance = await getBalanceFromDelimiters(address, delimiterStart, delimiterEnd);
    } else if (cssSelector?.trim()) {
      balance = await getBalanceWithCssSelector(address, cssSelector);
      if (balance.error) balance = await getBalanceFromFallbackParagraphs(address);
    } else {
      balance = await getBalanceFromFallbackParagraphs(address);
    }

    if (balance.error) return res.status(500).json({ error: balance.error });

    const userCrypto = new UserCrypto({ crypto, address, balance, delimiterStart, delimiterEnd, cssSelector });
    await userCrypto.save();
    res.status(201).json(userCrypto);
  } catch (err) {
    console.error('❌ Error adding:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ Rafraîchir un portefeuille
router.post('/refresh-wallet-balance', async (req, res) => {
  const { address } = req.body;
  const wallet = await UserCrypto.findOne({ address });
  if (!wallet) return res.status(404).json({ error: 'Wallet not found' });

  let balance;
  if (wallet.delimiterStart && wallet.delimiterEnd) {
    balance = await getBalanceFromDelimiters(wallet.address, wallet.delimiterStart, wallet.delimiterEnd);
  } else if (wallet.cssSelector) {
    balance = await getBalanceWithCssSelector(wallet.address, wallet.cssSelector);
    if (balance.error) balance = await getBalanceFromFallbackParagraphs(wallet.address);
  } else {
    balance = await getBalanceFromFallbackParagraphs(wallet.address);
  }

  if (balance.error) return res.status(500).json({ error: balance.error });

  wallet.balance = balance;
  await wallet.save();
  res.status(200).json(wallet);
});

// ✅ Autres routes inchangées
router.get('/', async (req, res) => {
  const prices = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd');
  const { bitcoin, ethereum } = prices.data;
  const cryptos = await Crypto.find({}, 'id name');
  res.render('layouts/layout', {
    title: 'Home',
    bitcoinPrice: bitcoin.usd,
    ethereumPrice: ethereum.usd,
    cryptos
  });
});

router.get('/wallets', async (req, res) => {
  const wallets = await UserCrypto.find();
  res.status(200).json(wallets);
});

router.delete('/wallets/:id', async (req, res) => {
  await UserCrypto.findByIdAndDelete(req.params.id);
  res.status(200).json({ message: 'Portefeuille supprimé.' });
});

module.exports = router;
