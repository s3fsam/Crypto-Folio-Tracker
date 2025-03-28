// ... les require restent inchangés

const express = require('express');
const router = express.Router(); // ✅ ← cette ligne manquait

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

// ✅ Fonction Selenium avec sélecteur CSS dynamique
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

    const options = new chrome.Options().addArguments(
      '--headless', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
      '--disable-software-rasterizer', '--disable-blink-features=AutomationControlled',
      '--remote-debugging-port=9222', `--user-data-dir=${userDataDir}`, '--no-first-run', '--disable-extensions'
    );

    const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
    await driver.get(url);

    let balanceText;

    // ⛳ Premier essai avec l'ancien sélecteur
    try {
      await driver.wait(until.elementLocated(By.css('p.w-fit.break-all.font-space.text-2xl.sm\\:text-36')), 5000);
      const el = await driver.findElement(By.css('p.w-fit.break-all.font-space.text-2xl.sm\\:text-36'));
      balanceText = await el.getText();
    } catch {
      // 🧩 Deuxième essai : chercher tous les <p> et détecter celui qui contient un nombre
      const paragraphs = await driver.findElements(By.css('p'));
      for (const p of paragraphs) {
        const text = await p.getText();
        if (text && text.match(/[0-9]{1,3}([.,][0-9]{3})*([.,][0-9]+)?/)) {
          balanceText = text;
          console.log('🔄 Balance trouvée dynamiquement dans un <p>: ' + balanceText);
          break;
        }
      }
    }

    await driver.quit();

    if (!balanceText) throw new Error(`⚠️ Balance non trouvée.`);
    const clean = parseFloat(balanceText.replace(/[^\d.]/g, ''));
    if (isNaN(clean)) throw new Error(`⚠️ Échec de parsing du solde: '${balanceText}'`);

    console.log(`✅ Balance extraite: ${clean}`);
    return clean;
  } catch (error) {
    console.error('❌ Error fetching balance with Selenium:', error.message);
    return { error: 'Failed to fetch balance dynamically' };
  }
};

// ✅ POST /add-crypto-address avec cssSelector
router.post('/add-crypto-address', async (req, res) => {
  const { crypto, address, delimiterStart, delimiterEnd, cssSelector } = req.body;

  if (!crypto || !address) {
    return res.status(400).json({ error: 'Crypto and address are required' });
  }

  try {
    let balance;

    if (delimiterStart?.trim() && delimiterEnd?.trim()) {
      balance = await getBalanceFromDelimiters(address, delimiterStart, delimiterEnd);
    } else {
      balance = await getBalanceWithSelenium(address, cssSelector);
    }

    if (balance.error) return res.status(500).json({ error: balance.error });

    const userCrypto = new UserCrypto({
      crypto,
      address,
      balance,
      delimiterStart: delimiterStart || undefined,
      delimiterEnd: delimiterEnd || undefined,
      cssSelector: cssSelector || undefined
    });

    await userCrypto.save();
    console.log(`✅ Crypto address added: ${crypto} - ${address}`);
    res.status(201).json(userCrypto);
  } catch (error) {
    console.error('❌ Error adding crypto address:', error.message);
    res.status(500).json({ error: 'Error adding crypto address' });
  }
});

// ✅ Rafraîchir un portefeuille avec support cssSelector
router.post('/refresh-wallet-balance', async (req, res) => {
  const { address } = req.body;
  try {
    const wallet = await UserCrypto.findOne({ address });
    if (!wallet) return res.status(404).json({ error: 'Portefeuille introuvable' });

    const balance = wallet.delimiterStart && wallet.delimiterEnd
      ? await getBalanceFromDelimiters(wallet.address, wallet.delimiterStart, wallet.delimiterEnd)
      : await getBalanceWithSelenium(wallet.address, wallet.cssSelector);

    if (balance.error) return res.status(500).json({ error: balance.error });

    wallet.balance = balance;
    await wallet.save();
    res.status(200).json(wallet);
  } catch (err) {
    console.error('❌ Erreur mise à jour solde:', err.message);
    res.status(500).json({ error: 'Erreur mise à jour' });
  }
});

// ✅ Autres routes inchangées
router.get('/', async (req, res) => {
  try {
    const pricesResponse = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd');
    const { bitcoin, ethereum } = pricesResponse.data;
    const cryptos = await Crypto.find({}, 'id name');

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

router.get('/wallets', async (req, res) => {
  try {
    const wallets = await UserCrypto.find();
    res.status(200).json(wallets);
  } catch (err) {
    console.error('❌ Erreur récupération portefeuilles:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

router.delete('/wallets/:id', async (req, res) => {
  try {
    await UserCrypto.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Portefeuille supprimé.' });
  } catch (err) {
    console.error('Erreur suppression portefeuille:', err);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;
