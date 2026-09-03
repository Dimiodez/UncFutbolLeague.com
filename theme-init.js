(() => {
  const savedTheme = localStorage.getItem('ufl-theme');
  document.documentElement.dataset.theme = ['classic', 'dark', 'vintage'].includes(savedTheme)
    ? savedTheme
    : 'classic';
})();
