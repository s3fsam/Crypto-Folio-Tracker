// ... les require restent inchangés

// ✅ Fonction Selenium avec sélecteur CSS dynamique
const getBalanceWithSelenium = async (url, cssSelector) => {
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

    const selector = cssSelector?.trim() || 'p.w-fit.break-all.font-space.text-2xl.sm\\:text-36';
    await driver.wait(until.elementLocated(By.css(selector)), 10000);
    const balanceElement = await driver.findElement(By.css(selector));
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
