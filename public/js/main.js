document.addEventListener('DOMContentLoaded', function () {
  const cryptoDropdown = document.getElementById('crypto-dropdown');
  const refreshButton = document.getElementById('refresh-cryptocurrencies-btn');
  const ctx = document.getElementById('crypto-chart').getContext('2d');
  let cryptoChart;

  // Fonction pour récupérer et afficher les données du graphique
  async function fetchAndDisplayCryptoData(cryptoId) {
    const response = await fetch(`https://api.coingecko.com/api/v3/coins/${cryptoId}/market_chart?vs_currency=usd&days=30`);
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
  }

  // Gestionnaire d'événement pour la liste déroulante
  cryptoDropdown.addEventListener('change', function () {
    const cryptoId = this.value;
    fetchAndDisplayCryptoData(cryptoId);
  });

  // Gestionnaire d'événement pour le bouton "Refresh Cryptocurrencies"
  if (refreshButton) {
    refreshButton.addEventListener("click", function() {
      fetch('/refresh-cryptocurrencies')
        .then(response => {
          if (response.ok) {
            alert('Cryptocurrencies refreshed successfully!');
            return response.json();
          } else {
            alert('Error refreshing cryptocurrencies!');
          }
        })
        .then(data => {
          if (data) {
            updateCryptoDropdown(data);
          }
        })
        .catch(error => console.error('Error refreshing cryptocurrencies:', error));
    });
  }

  // Initialiser le graphique avec la première crypto de la liste
  if (cryptoDropdown.value) {
    fetchAndDisplayCryptoData(cryptoDropdown.value);
  }

  // Gestionnaire d'événement pour le formulaire d'ajout de crypto
  document.getElementById('crypto-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const crypto = document.getElementById('crypto').value;
    const address = document.getElementById('address').value;
    const delimiterStart = document.getElementById('delimiterStart').value;
    const delimiterEnd = document.getElementById('delimiterEnd').value;

    const response = await fetch('/add-crypto-address', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ crypto, address, delimiterStart, delimiterEnd })
    });

    if (response.ok) {
      alert('Adresse crypto ajoutée avec succès!');
    } else {
      alert('Erreur lors de l\'ajout de l\'adresse crypto');
    }
  });

  // Fonction pour récupérer et afficher les soldes
  async function fetchBalances() {
    try {
      const response = await fetch('/get-balances');
      const data = await response.json();
      if (response.status === 200) {
        updateBalances(data.balances);
      } else {
        alert('Erreur lors de la récupération des soldes');
      }
    } catch (error) {
      console.error('Error fetching balances:', error);
      alert('Une erreur est survenue lors de la récupération des soldes.');
    }
  }

  // Fonction pour mettre à jour l'affichage des soldes
  function updateBalances(balances) {
    const balancesList = document.getElementById('balances-list');
    const totalBalanceElement = document.getElementById('total-balance');
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

  document.addEventListener('DOMContentLoaded', fetchBalances);
});
