console.log('VisaTrack loaded!')

function injectBadges() {
  const companyEls = document.querySelectorAll('.artdeco-entity-lockup__subtitle')

  companyEls.forEach(el => {
    if (el.querySelector('.visatrack-badge')) return

    const badge = document.createElement('span')
    badge.className = 'visatrack-badge'
    badge.textContent = 'H1B: Checking...'
    badge.style.cssText = `
      display: inline-block;
      padding: 2px 8px;
      margin-left: 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      background-color: #e0e0e0;
      color: #555;
    `
    el.appendChild(badge)
  })
}

injectBadges()

const observer = new MutationObserver(injectBadges)
observer.observe(document.body, { childList: true, subtree: true })