document.addEventListener('DOMContentLoaded', function () {
  const cryptoDropdown = document.getElementById('crypto-dropdown');
  const refreshButton = document.getElementById('refresh-cryptocurrencies-btn');
  const ctx = document.getElementById('crypto-chart')?.getContext('2d');
  let cryptoChart;

  // Vérifie que l'élément du graphique existe avant de l'utiliser
  if (!ctx) {
    console.warn('⚠️ Élément canvas non trouvé pour le graphique');
  }

  // Fonction pour récupérer et afficher les données du graphique
  async function fetchAndDisplayCryptoData(cryptoId) {
    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart?vs_currency=usd&days=30`);
      if (!response.ok) throw new Error('Erreur lors de la récupération des données de marché.');
      
      const data = await response.json();

      const labels = data.prices.map(price => new Date(price[0]).toLocaleDateString());
      const prices = data.prices.map(price => price[1]);

      if (cryptoChart) {
        cryptoChart.destroy();
      }

      cryptoChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: `${cryptoId} Price (USD)`,
            data: prices,
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 1,
            fill: false
          }]
        },
        options: {
          scales: {
            x: {
              display: true,
              title: {
                display: true,
                text: 'Date'
              }
            },
            y: {
              display: true,
              title: {
                display: true,
                text: 'Price in USD'
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des données:', error.message);
      alert('Erreur lors de la récupération des données du marché.');
    }
  }

  // Gestionnaire d'événement pour la liste déroulante
  if (cryptoDropdown) {
    cryptoDropdown.addEventListener('change', function () {
      const cryptoId = this.value;
      fetchAndDisplayCryptoData(cryptoId);
    });
  }

  // Gestionnaire d'événement pour le bouton "Refresh Cryptocurrencies"
  if (refreshButton) {
    refreshButton.addEventListener("click", async function() {
      try {
        const response = await fetch('/refresh-cryptocurrencies');
        if (!response.ok) throw new Error('Erreur lors du rafraîchissement des cryptomonnaies.');
        
        alert('Cryptocurrencies refreshed successfully!');
        const data = await response.json();
        updateCryptoDropdown(data);
      } catch (error) {
        console.error('❌ Erreur de mise à jour des cryptos:', error.message);
        alert('Erreur lors du rafraîchissement des cryptomonnaies.');
      }
    });
  }

  // Initialiser le graphique avec la première crypto de la liste
  if (cryptoDropdown?.value) {
    fetchAndDisplayCryptoData(cryptoDropdown.value);
  }

  // Gestionnaire d'événement pour le formulaire d'ajout de crypto
 document.getElementById('crypto-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const crypto = document.getElementById('crypto').value;
  const address = document.getElementById('address').value;
  const delimiterStart = document.getElementById('delimiterStart').value;
  const delimiterEnd = document.getElementById('delimiterEnd').value;

  if (!crypto || !address) {
    alert('Veuillez remplir au moins les champs crypto et adresse !');
    return;
  }

  const response = await fetch('/add-crypto-address', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ crypto, address, delimiterStart, delimiterEnd })
  });

  const result = await response.json();
  if (response.ok) {
    alert('Adresse crypto ajoutée avec succès !');
  } else {
    alert(result.error || 'Erreur lors de l\'ajout de l\'adresse crypto');
  }
});

  // Fonction pour récupérer et afficher les soldes
  async function fetchBalances() {
    try {
      const response = await fetch('/get-balances');
      if (!response.ok) throw new Error('Erreur lors de la récupération des soldes.');
      
      const data = await response.json();
      updateBalances(data.balances);
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des soldes:', error.message);
      alert('Une erreur est survenue lors de la récupération des soldes.');
    }
  }

  // Fonction pour mettre à jour l'affichage des soldes
  function updateBalances(balances) {
    const balancesList = document.getElementById('balances-list');
    const totalBalanceElement = document.getElementById('total-balance');

    if (!balancesList || !totalBalanceElement) return;

    balancesList.innerHTML = '';
    let totalBalance = 0;

    balances.forEach(balance => {
      const li = document.createElement('li');
      li.textContent = `${balance.crypto}: ${balance.amount} (${balance.usdValue} USD)`;
      balancesList.appendChild(li);
      totalBalance += balance.usdValue;
    });

    totalBalanceElement.textContent = totalBalance.toFixed(2);
  }

  // Charger les soldes au chargement de la page
  fetchBalances();
});



async function loadWallets() {
  const walletsList = document.getElementById('wallets-list');
  walletsList.innerHTML = '';
  const response = await fetch('/wallets');
  const wallets = await response.json();

  wallets.forEach(wallet => {
    const li = document.createElement('li');
    li.innerHTML = `
      <strong>${wallet.crypto}</strong> (${wallet.address}) :
      ${wallet.balance} <button onclick="refreshWallet('${wallet.address}')">🔄</button>
    `;
    walletsList.appendChild(li);
  });
}

async function refreshWallet(address) {
  const res = await fetch('/refresh-wallet-balance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address })
  });
  if (res.ok) {
    alert("✅ Solde mis à jour !");
    loadWallets();
  } else {
    alert("❌ Erreur lors du rafraîchissement !");
  }
}

document.addEventListener('DOMContentLoaded', loadWallets);
