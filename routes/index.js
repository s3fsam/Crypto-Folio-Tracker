const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.render('layouts/layout', {
    title: 'Home',
    content: '<%- include("../views/index") %>'
  });
});

module.exports = router;
