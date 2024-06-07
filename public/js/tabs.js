document.addEventListener('DOMContentLoaded', function () {
  const tabs = document.querySelectorAll('.tab-link');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', function () {
      const tabId = this.getAttribute('data-tab');

      tabs.forEach(item => item.classList.remove('current'));
      contents.forEach(content => content.classList.remove('current'));

      this.classList.add('current');
      document.getElementById(tabId).classList.add('current');
    });
  });
});
