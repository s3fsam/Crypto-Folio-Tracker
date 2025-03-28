document.addEventListener('DOMContentLoaded', function () {
  const cryptoDropdown = document.getElementById('crypto-dropdown');
  const refreshButton = document.getElementById('refresh-cryptocurrencies-btn');
  const ctx = document.getElementById('crypto-chart')?.getContext('2d');
  let cryptoChart;

  if (!ctx) console.warn('⚠️ Élément canvas non trouvé pour le graphique');

  async function fetchAndDisplayCryptoData(cryptoId) {
    try {
      const response = await fetch(`https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart?vs_currency=usd&days=30`);
      if (!response.ok) throw new Error('Erreur lors de la récupération des données de marché.');
      
      const data = await response.json();
      const labels = data.prices.map(price => new Date(price[0]).toLocaleDateString());
      const prices = data.prices.map(price => price[1]);

      if (cryptoChart) cryptoChart.destroy();

      cryptoChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
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
              title: { display: true, text: 'Date' }
            },
            y: {
              title: { display: true, text: 'Price in USD' }
            }
          }
        }
      });
    } catch (error) {
      console.error('❌ Erreur:', error.message);
      alert('Erreur de récupération des données.');
    }
  }

  if (cryptoDropdown) {
    cryptoDropdown.addEventListener('change', function () {
      fetchAndDisplayCryptoData(this.value);
    });
  }

  if (refreshButton) {
    refreshButton.addEventListener("click", async function () {
      try {
        const response = await fetch('/refresh-cryptocurrencies');
        if (!response.ok) throw new Error('Erreur de rafraîchissement');
        alert('Cryptocurrencies refreshed successfully!');
        const data = await response.json();
        updateCryptoDropdown(data);
      } catch (error) {
        alert('Erreur lors du rafraîchissement');
        console.error(error);
      }
    });
  }

  if (cryptoDropdown?.value) {
    fetchAndDisplayCryptoData(cryptoDropdown.value);
  }

  document.getElementById('crypto-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const crypto = document.getElementById('crypto').value.trim();
    const address = document.getElementById('address').value.trim();
    const delimiterStart = document.getElementById('delimiterStart').value.trim();
    const delimiterEnd = document.getElementById('delimiterEnd').value.trim();

    if (!crypto || !address) {
      alert('Veuillez remplir tous les champs requis');
      return;
    }

    const response = await fetch('/add-crypto-address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ crypto, address, delimiterStart, delimiterEnd })
    });

    const result = await response.json();
    if (response.ok) {
      alert('✅ Adresse ajoutée !');
      await loadWallets(); // Rafraîchir le tableau après ajout
    } else {
      alert(result.error || 'Erreur lors de l’ajout');
    }
  });

  async function fetchBalances() {
    try {
      const response = await fetch('/get-balances');
      if (!response.ok) throw new Error('Erreur API /get-balances');
      const data = await response.json();
      updateBalances(data.balances);
    } catch (error) {
      alert('Erreur lors de la récupération des soldes');
      console.error(error.message);
    }
  }

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

async function loadWallets() {
  const walletsList = document.getElementById('wallets-list');
  walletsList.innerHTML = '';
  const response = await fetch('/wallets');
  const wallets = await response.json();

  wallets.forEach(wallet => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${wallet.crypto}</td>
      <td>${wallet.address}</td>
      <td>${wallet.balance}</td>
      <td>${wallet.usdValue}</td>
      <td>
        <button onclick="refreshWallet('${wallet.address}')">🔄</button>
        <button onclick="deleteWallet('${wallet._id}')">🗑️</button>
      </td>
    `;
    walletsList.appendChild(tr);
  });
}

async function deleteWallet(id) {
  if (!confirm("Voulez-vous vraiment supprimer ce portefeuille ?")) return;

  const response = await fetch('/wallets/' + id, {
    method: 'DELETE'
  });

  if (response.ok) {
    alert("✅ Portefeuille supprimé !");
    loadWallets();
  } else {
    alert("❌ Échec de la suppression !");
  }
}

  async function refreshWallet(address) {
    const res = await fetch('/refresh-wallet-balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address })
    });

    if (res.ok) {
      alert("✅ Solde mis à jour !");
      await loadWallets();
    } else {
      alert("❌ Erreur de mise à jour !");
    }
  }

  window.refreshWallet = refreshWallet; // Rend accessible à l’extérieur
  loadWallets();
  fetchBalances();
});
