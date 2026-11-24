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
      shareOrCopy({ title, url, text });
    });
  });

  // Optional Meta Pixel / GA4 click tracking hook
  // Basta colar o script do Meta Pixel no <head> do index.html para ativar automaticamente.
  document.querySelectorAll('[data-track-event]').forEach((el) => {
    el.addEventListener('click', () => {
      const eventName = el.getAttribute('data-track-event');
      if (typeof window.fbq === 'function' && eventName) {
        window.fbq('trackCustom', eventName, { unit: 'Jundiai' });
      }
      if (typeof window.gtag === 'function' && eventName) {
        window.gtag('event', eventName, { unit: 'Jundiai' });
      }
    });
  });
})();
