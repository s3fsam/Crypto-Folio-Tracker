document.addEventListener("DOMContentLoaded", function() {
  const refreshButton = document.getElementById("refresh-cryptocurrencies-btn");
  const cryptoDropdown = document.getElementById("crypto-dropdown");

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

  function updateCryptoDropdown(cryptos) {
    while (cryptoDropdown.firstChild) {
      cryptoDropdown.removeChild(cryptoDropdown.firstChild);
    }
    cryptos.forEach(crypto => {
      const option = document.createElement("option");
      option.value = crypto.id;
      option.textContent = crypto.name;
      cryptoDropdown.appendChild(option);
    });
  }
});
