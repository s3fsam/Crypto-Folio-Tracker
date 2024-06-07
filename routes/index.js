const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/', async (req, res) => {
  try {
    // Récupérer la liste des cryptomonnaies
    const response = await axios.get('https://api.coingecko.com/api/v3/coins/list');
    const cryptos = response.data;

    // Récupérer et afficher les prix des cryptomonnaies Bitcoin et Ethereum
    const pricesResponse = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd');
    const { bitcoin, ethereum } = pricesResponse.data;

    res.render('layouts/layout', {
      title: 'Home',
      content: `
        <h2>Cryptocurrency Prices</h2>
        <p>Bitcoin Price: $${bitcoin.usd}</p>
        <p>Ethereum Price: $${ethereum.usd}</p>
        
        <h3>Select a Cryptocurrency</h3>
        <select id="crypto-list">
          <% cryptos.forEach(function(crypto) { %>
            <option value="<%= crypto.id %>"><%= crypto.name %></option>
          <% }); %>
        </select>
      `
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Error fetching data');
  }
});

module.exports = router;
