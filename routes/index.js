const express = require('express');
const router = express.Router();

const axios = require('axios');
//const cheerio = require('cheerio'); // ✅ Non utilisé mais conservé
const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { execSync } = require('child_process');
const UserCrypto = require('../models/User_Crypto');
const Crypto = require('../models/Crypto_List');

const css = typeof cssSelector === 'string' ? cssSelector.trim() : '';
const delimStart = typeof delimiterStart === 'string' ? delimiterStart.trim() : '';
const delimEnd = typeof delimiterEnd === 'string' ? delimiterEnd.trim() : '';

// ✅ Fonction 1 : Seulement URL avec parsing automatique
// Backup : const getBalanceWithSeleniumFallback = async (url, delimiterStart, delimiterEnd, cssSelector) => {
const getBalanceWithSeleniumFallback = async (url) => {
  if (url && !delimiterStart && !delimiterEnd && !cssSelector ) {
  console.log('============== Start Selenium Function 1 ! Url only ==============================\n');
  console.log('============== Cette fonction appelle la Function 3 & 4 ==========================\n');
  console.log('============== End Selenium Function 1 ! Url only ================================\n');
  return await getBalanceFull(url, null, null, null);
  }
};

// ✅ Fonction 2 : URL + délimiteurs HTML (axios)
const getBalanceFromDelimiters = async (url, delimiterStart, delimiterEnd) => {
  if (url && delimiterStart && delimiterEnd && !cssSelector ) {
    try {
      console.log('============== Start Axios Function 2 ! Url & Delim 1 & 2 only ==============================\n');
      const response = await axios.get(url);
      const data = response.data;
  
      console.log('\n===== 🔍 HTML reçu depuis Axios (début) =====');
      console.log(data);
      console.log('======== Fin HTML reçu depuis Axios (début) ====\n');
  
      const startIndex = data.indexOf(delimiterStart);
      if (startIndex === -1) throw new Error(`Délimiteur de début introuvable.`);
      const endIndex = data.indexOf(delimiterEnd, startIndex + delimiterStart.length);
      if (endIndex === -1) throw new Error(`Délimiteur de fin introuvable.`);
  
      const balanceText = data.substring(startIndex + delimiterStart.length, endIndex).trim();
      const balance = parseFloat(balanceText.replace(/[^0-9.-]+/g, ""));
      if (isNaN(balance)) throw new Error(`⚠️ Balance extraction failed. Raw: '${balanceText}'`);
      return balance;
    } catch (error) {
      console.error('❌ Error fetching balance with delimiters:', error.message);
      console.log('============== End of Axios Function 2 ! Url & Delim 1 & 2 only ==============================\n');
      return { error: 'Failed to fetch balance with delimiters' };
    }
  }  
};

// ✅ Fonction 3 & 4 : via Selenium avec ou sans CSS + délimiteurs
const getBalanceFull = async (url, delimiterStart, delimiterEnd ,cssSelector) => {
  //if (url && delimiterStart && delimiterEnd && cssSelector ) {  
     console.log('============== Start Selenium Function 3 & 4 ! Css Selector + Delim 1 & 2 ==============================\n');
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
  
      const html = await driver.getPageSource();
      console.log('\n===== 🧪 HTML complet extrait par Selenium (début) =====');
      console.log(html);
      console.log('=======================================================\n');
  
      let balanceText;
  
      if (cssSelector) {
        try {
          const el = await driver.findElement(By.css(cssSelector));
          const inner = await el.getAttribute('innerHTML');
  
          if (delimiterStart && delimiterEnd && inner.includes(delimiterStart) && inner.includes(delimiterEnd)) {
            const startIndex = inner.indexOf(delimiterStart);
            const endIndex = inner.indexOf(delimiterEnd, startIndex + delimiterStart.length);
            if (startIndex !== -1 && endIndex !== -1) {
              balanceText = inner.substring(startIndex + delimiterStart.length, endIndex).trim();
              console.log(`🔍 Balance trouvée avec CSS + délimiteurs : ${balanceText}`);
            }
          }
  
          if (!balanceText) {
            balanceText = await el.getText();
            console.log(`✅ Balance récupérée avec sélecteur CSS : ${balanceText}`);
          }
        } catch {
          console.warn(`⚠️ Sélecteur CSS '${cssSelector}' introuvable ou erreur.`);
        }
      }
  
      if (!balanceText) {
        const paragraphs = await driver.findElements(By.css('p'));
        console.log(`🔎 ${paragraphs.length} balises <p> trouvées :`);
        for (const p of paragraphs) {
          const text = await p.getText();
          console.log('👉', text);
          if (text && text.match(/[0-9]{1,3}([.,][0-9]{3})*([.,][0-9]+)?/)) {
            balanceText = text;
            console.log('🔄 Balance trouvée dynamiquement dans un <p>: ' + balanceText + '\n');
            console.log('============== End of Selenium Function 3 & 4 ! Css Selector + Delim 1 & 2 ==============================\n');
            break;
          }
        }
      }
  
      await driver.quit();
  
      if (!balanceText) throw new Error(`⚠️ Balance non trouvée.`);
      const clean = parseFloat(balanceText.replace(/[^\d.,]/g, '').replace(',', ''));
      if (isNaN(clean)) throw new Error(`⚠️ Échec de parsing du solde: '${balanceText}'`);
  
      console.log(`✅ Balance extraite: ${clean}`);
      return clean;
    } catch (error) {
      console.error('❌ Error fetching balance with Selenium:', error.message);
      return { error: 'Failed to fetch balance dynamically' };
      console.log('============== End of Selenium Function 3 & 4 ! Css Selector + Delim 1 & 2 ==============================\n');
    }
    console.log('============== End of Selenium Function 3 & 4 ! Css Selector + Delim 1 & 2 ==============================\n');
  //}    
};

// ✅ Route pour ajouter une adresse crypto
router.post('/add-crypto-address', async (req, res) => {
  const { crypto, address, delimiterStart, delimiterEnd, cssSelector } = req.body;

  if (!crypto || !address) {
    return res.status(400).json({ error: 'Crypto and address are required' });
  }

  try {
    let balance;

    //const css = typeof cssSelector === 'string' ? cssSelector.trim() : '';
    //const delimStart = typeof delimiterStart === 'string' ? delimiterStart.trim() : '';
    //const delimEnd = typeof delimiterEnd === 'string' ? delimiterEnd.trim() : '';
    
    if (css && delimStart && delimEnd) {
      balance = await getBalanceFull(address, css, delimStart, delimEnd);
    } else if (delimStart && delimEnd) {
              balance = await getBalanceFromDelimiters(address, delimStart, delimEnd);
           } else if (css) {
                    balance = await getBalanceFull(address, css, null, null);
                  } else {
                          balance = await getBalanceWithSeleniumFallback(address);
                        }

    //if (cssSelector?.trim() && delimiterStart?.trim() && delimiterEnd?.trim()) {
      //balance = await getBalanceFull(address, cssSelector, delimiterStart, delimiterEnd);
    //} else if (delimiterStart?.trim() && delimiterEnd?.trim()) {
      //balance = await getBalanceFromDelimiters(address, delimiterStart, delimiterEnd);
    //} else if (cssSelector?.trim()) {
      //balance = await getBalanceFull(address, cssSelector, null, null);
    //} else {
      //balance = await getBalanceWithSeleniumFallback(address);
   //}

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

// ✅ Route pour rafraîchir un portefeuille
router.post('/refresh-wallet-balance', async (req, res) => {
  const { address } = req.body;
  try {
    const wallet = await UserCrypto.findOne({ address });
    if (!wallet) return res.status(404).json({ error: 'Portefeuille introuvable' });

    let balance;
    if (wallet.cssSelector && wallet.delimiterStart && wallet.delimiterEnd) {
      balance = await getBalanceFull(wallet.address, wallet.cssSelector, wallet.delimiterStart, wallet.delimiterEnd);
    } else if (wallet.delimiterStart && wallet.delimiterEnd) {
      balance = await getBalanceFromDelimiters(wallet.address, wallet.delimiterStart, wallet.delimiterEnd);
    } else if (wallet.cssSelector) {
      balance = await getBalanceFull(wallet.address, wallet.cssSelector, null, null);
    } else {
      balance = await getBalanceWithSeleniumFallback(wallet.address);
    }

    if (balance.error) return res.status(500).json({ error: balance.error });

    wallet.balance = balance;
    await wallet.save();
    res.status(200).json(wallet);
  } catch (err) {
    console.error('❌ Erreur mise à jour solde:', err.message);
    res.status(500).json({ error: 'Erreur mise à jour' });
  }
});

// ✅ Page d’accueil
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

// ✅ Liste portefeuilles
router.get('/wallets', async (req, res) => {
  try {
    const wallets = await UserCrypto.find();
    res.status(200).json(wallets);
  } catch (err) {
    console.error('❌ Erreur récupération portefeuilles:', err.message);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ✅ Supprimer portefeuille
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
