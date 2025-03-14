document.addEventListener('DOMContentLoaded', function () {
  const tabs = document.querySelectorAll('.tab-link');
  const contents = document.querySelectorAll('.tab-content');

  // Vérifie si un onglet était sélectionné auparavant
  const savedTab = localStorage.getItem('selectedTab');
  if (savedTab) {
    setActiveTab(savedTab);
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', function () {
      const tabId = this.getAttribute('data-tab');
      setActiveTab(tabId);

      // Sauvegarde l'onglet sélectionné dans localStorage
      localStorage.setItem('selectedTab', tabId);
    });
  });

  function setActiveTab(tabId) {
    tabs.forEach(item => item.classList.remove('current'));
    contents.forEach(content => content.classList.remove('current'));

    const activeTab = document.querySelector(`.tab-link[data-tab="${tabId}"]`);
    const activeContent = document.getElementById(tabId);

    if (activeTab && activeContent) {
      activeTab.classList.add('current');
      activeContent.classList.add('current');
    } else {
      console.warn(`⚠️ Onglet non trouvé : ${tabId}`);
    }
  }
});
