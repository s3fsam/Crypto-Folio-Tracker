const express = require('express');
const router = express.Router();
const axios = require('axios');
const cheerio = require('cheerio');

router.get('/update/bitcoin', async (req, res) => {
  // Scraper les données de Bitcoin (ajouter la logique ici)
  res.send('Bitcoin prices updated');
});

module.exports = router;
