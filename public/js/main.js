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
  refreshButton.addEventListener('click', async function () {
    try {
      const response = await fetch('/refresh-cryptocurrencies');
      const updatedCryptos = await response.json();

      // Mise à jour de la liste déroulante avec les nouvelles données
      cryptoDropdown.innerHTML = '';
      updatedCryptos.forEach(crypto => {
        const option = document.createElement('option');
        option.value = crypto.id;
        option.textContent = crypto.name;
        cryptoDropdown.appendChild(option);
      });

      // Afficher une alerte de fin de rafraîchissement
      alert('Cryptocurrency list refreshed successfully!');

      // Rafraîchir le graphique pour la première crypto de la liste après mise à jour
      if (updatedCryptos.length > 0) {
        fetchAndDisplayCryptoData(updatedCryptos[0].id);
      }
    } catch (error) {
      console.error('Error refreshing cryptocurrencies:', error);
    }
  });

  // Initialiser le graphique avec la première crypto de la liste
  if (cryptoDropdown.value) {
    fetchAndDisplayCryptoData(cryptoDropdown.value);
  }
});
