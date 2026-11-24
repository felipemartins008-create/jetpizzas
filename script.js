(() => {
  const toastEl = document.getElementById('toast');
  let toastTimer = null;

  function showToast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('is-visible');
    }, 2400);
  }

  async function shareOrCopy({ title, url, text }) {
    const shareData = { title, url };
    if (text) shareData.text = text;

    if (navigator.share && !url.startsWith('tel:')) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }

    const toCopy = text || url;
    try {
      await navigator.clipboard.writeText(toCopy);
      showToast(url.startsWith('tel:') ? 'Telefone copiado!' : 'Link copiado!');
    } catch {
      showToast(toCopy);
    }
  }

  // Share whole page button
  const sharePageBtn = document.getElementById('share-page-btn');
  if (sharePageBtn) {
    sharePageBtn.addEventListener('click', () => {
      if (typeof window.JetTrack === 'function') {
        window.JetTrack({
          customName: 'SharePage',
          params: { button_position: 'top_bar' },
        });
      }
      shareOrCopy({
        title: document.title,
        url: window.location.href,
      });
    });
  }

  // Individual link share buttons
  document.querySelectorAll('.link-share-btn').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const url = btn.getAttribute('data-share-url') || window.location.href;
      const title = btn.getAttribute('data-share-title') || document.title;
      const text = btn.getAttribute('data-share-text') || '';
      if (typeof window.JetTrack === 'function') {
        window.JetTrack({
          customName: 'ShareLink',
          params: { shared_title: title, shared_url: url },
        });
      }
      shareOrCopy({ title, url, text });
    });
  });
})();
