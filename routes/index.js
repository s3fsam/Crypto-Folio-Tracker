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

// ✅ Fonction Selenium
const getBalanceWithSelenium = async (url) => {
  try {
    console.log(`🔍 Fetching balance dynamically using Selenium from: ${url}`);
    try {
      execSync('pkill chrome || pkill chromium || pkill -f chromedriver', { stdio: 'ignore' });
      console.log('✅ Chrome instances killed successfully.');
    } catch (e) {
      console.warn('⚠️ No running Chrome instances found.');
    }

    const userDataDir = path.join(os.tmpdir(), `selenium-profile-${Date.now()}`);
    fs.mkdirSync(userDataDir, { recursive: true });

    let options = new chrome.Options();
    options.addArguments('--headless', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
      '--disable-software-rasterizer', '--disable-blink-features=AutomationControlled',
      '--remote-debugging-port=9222', `--user-data-dir=${userDataDir}`, '--no-first-run', '--disable-extensions');

    const driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(options)
      .build();

    await driver.get(url);
    await driver.wait(until.elementLocated(By.css('p.w-fit.break-all.font-space.text-2xl.sm\\:text-36')), 10000);
    const balanceElement = await driver.findElement(By.css('p.w-fit.break-all.font-space.text-2xl.sm\\:text-36'));
    const balanceText = await balanceElement.getText();
    await driver.quit();

    if (!balanceText) throw new Error(`⚠️ Balance non trouvée.`);
    const balance = parseFloat(balanceText.replace(/[^0-9.-]+/g, ""));
    if (isNaN(balance)) throw new Error(`⚠️ Balance extraction failed. Raw text: '${balanceText}'`);

    console.log(`✅ Balance extraite: ${balance}`);
    return balance;
  } catch (error) {
    console.error('❌ Error fetching balance with Selenium:', error.message);
    return { error: 'Failed to fetch balance' };
  }
};

// ✅ Méthode alternative avec parsing HTML
const getBalanceFromDelimiters = async (url, delimiterStart, delimiterEnd) => {
  try {
    const response = await axios.get(url);
    const data = response.data;

    const startIndex = data.indexOf(delimiterStart) + delimiterStart.length;
    const endIndex = data.indexOf(delimiterEnd, startIndex);
    const balanceText = data.substring(startIndex, endIndex).trim();

    const balance = parseFloat(balanceText.replace(/[^0-9.-]+/g, ""));
    if (isNaN(balance)) throw new Error(`⚠️ Balance extraction failed. Raw: '${balanceText}'`);
    return balance;
  } catch (error) {
    console.error('❌ Error fetching balance with delimiters:', error.message);
    return { error: 'Failed to fetch balance with delimiters' };
  }
};

// ✅ Route POST pour ajouter une adresse crypto
router.post('/add-crypto-address', async (req, res) => {
  const { crypto, address, delimiterStart, delimiterEnd } = req.body;

  if (!crypto || !address) {
    return res.status(400).json({ error: 'Crypto and address are required' });
  }

  try {
    let balance;

    if (delimiterStart && delimiterEnd) {
      balance = await getBalanceFromDelimiters(address, delimiterStart, delimiterEnd);
    } else {
      balance = await getBalanceWithSelenium(address);
    }

    if (balance.error) return res.status(500).json({ error: balance.error });

    const userCrypto = new UserCrypto({ crypto, address, balance, delimiterStart, delimiterEnd });
    await userCrypto.save();

    console.log(`✅ Crypto address added: ${crypto} - ${address}`);
    res.status(201).json(userCrypto);
  } catch (error) {
    console.error('❌ Error adding crypto address:', error.message);
    res.status(500).json({ error: 'Error adding crypto address' });
  }
});

// ✅ Route GET /
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
