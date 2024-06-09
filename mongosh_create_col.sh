#!/bin/bash

echo "use crypto-portfolio" > temp.js
echo "db.createCollection('cryptocurrencies')" >> temp.js

mongosh < temp.js

rm temp.js
