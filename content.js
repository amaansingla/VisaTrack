console.log('VisaTrack loaded!')

let filterActive = false
let filterInterval = null
let h1bData = {}

fetch(chrome.runtime.getURL('h1b_data.json'))
  .then(res => res.json())
  .then(data => {
    h1bData = data
    injectBadges()
    injectToggle()
    chrome.storage.local.get('filterActive', (result) => {
      if (result.filterActive) {
        filterActive = true
        const toggle = document.querySelector('.visatrack-toggle')
        if (toggle) {
          toggle.style.background = '#EAF3DE'
          toggle.style.borderColor = '#639922'
          toggle.style.color = '#27500A'
        }
        filterInterval = setInterval(applyFilter, 100)
      }
    })
  })

function normalizeName(name) {
  return name.toLowerCase().trim()
    .replace(/\b(inc|llc|corp|ltd|co|corporation|incorporated)\b\.?/g, '')
    .trim()
}

function removePopup() {
  const existing = document.querySelector('.visatrack-popup')
  if (existing) existing.remove()
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') removePopup()
})

function showPopup(badge, companyName, count) {
  removePopup()

  const popup = document.createElement('div')
  popup.className = 'visatrack-popup'

  const isSponsoring = count > 0
  const statusColor = isSponsoring ? '#27500A' : '#791F1F'
  const statusBg = isSponsoring ? '#EAF3DE' : '#FCEBEB'
  const statusText = isSponsoring ? `Sponsors H1B — ${count} filings (FY2019)` : 'No H1B history in dataset'

  popup.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
      <span style="font-size:13px;font-weight:500;color:#000">${companyName}</span>
      <span class="visatrack-close" style="cursor:pointer;font-size:16px;color:#888;line-height:1">&times;</span>
    </div>
    <div style="font-size:12px;padding:6px 10px;border-radius:99px;background:${statusBg};color:${statusColor};display:inline-block">${statusText}</div>
    <div style="font-size:11px;color:#888;margin-top:8px">Data: DOL LCA Disclosure FY2019</div>
  `

  popup.style.cssText = `
    position: fixed;
    z-index: 99999;
    background: white;
    border: 0.5px solid #e0e0e0;
    border-radius: 10px;
    padding: 14px;
    width: 260px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  `

  const rect = badge.getBoundingClientRect()
  popup.style.top = (rect.bottom + 8) + 'px'
  popup.style.left = rect.left + 'px'

  document.body.appendChild(popup)

  popup.querySelector('.visatrack-close').addEventListener('click', removePopup)

  setTimeout(() => {
    document.addEventListener('click', removePopup, { once: true })
  }, 0)
}

function makeBadge(type, count) {
  const badge = document.createElement('span')
  badge.className = 'visatrack-badge'
  badge.dataset.count = count || 0

  const styles = `
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    margin-left: 8px;
    border-radius: 99px;
    font-size: 11px;
    font-weight: 500;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    vertical-align: middle;
    cursor: pointer;
    border: 1px solid;
    line-height: 1.4;
  `

  if (type === 'green') {
    badge.textContent = `H1B: ${count} filings`
    badge.style.cssText = styles + `background:#EAF3DE;color:#27500A;border-color:#C0DD97;`
  } else if (type === 'red') {
    badge.textContent = `No H1B history`
    badge.style.cssText = styles + `background:#FCEBEB;color:#791F1F;border-color:#F7C1C1;`
  } else {
    badge.textContent = `H1B: Unknown`
    badge.style.cssText = styles + `background:#F1EFE8;color:#444441;border-color:#D3D1C7;`
  }

  badge.addEventListener('click', (e) => {
    e.stopPropagation()
    const name = badge.dataset.company
    const count = parseInt(badge.dataset.count) || 0
    showPopup(badge, name, count)
  })

  return badge
}

function applyFilter() {
  document.querySelectorAll('.artdeco-entity-lockup__subtitle').forEach(el => {
    const badge = el.querySelector('.visatrack-badge')
    const card = el.closest('li')
    if (!badge || !card) return
    if (badge.textContent.includes('No H1B history')) {
      card.style.display = 'none'
    } else {
      card.style.display = ''
    }
  })
}

function injectBadges() {
  const companyEls = document.querySelectorAll('.artdeco-entity-lockup__subtitle')

  companyEls.forEach(el => {
    if (el.querySelector('.visatrack-badge')) return

    const companyName = normalizeName(el.innerText)
    const exactMatch = h1bData[companyName]
    const fuzzyMatch = !exactMatch && Object.keys(h1bData).find(k => k.includes(companyName) || companyName.includes(k))

    let badge
    if (exactMatch) {
      badge = makeBadge('green', exactMatch)
    } else if (fuzzyMatch) {
      badge = makeBadge('green', h1bData[fuzzyMatch])
    } else if (companyName.length > 2) {
      badge = makeBadge('red')
    } else {
      badge = makeBadge('grey')
    }

    badge.dataset.company = el.innerText.trim()
    el.appendChild(badge)
  })
}

function injectToggle() {
  if (document.querySelector('.visatrack-toggle')) return

  const filterBar = document.querySelector('.search-reusables__filter-list')
  if (!filterBar) return

  const toggle = document.createElement('button')
  toggle.className = 'visatrack-toggle'
  toggle.textContent = 'H1B Only'
  toggle.style.cssText = `
    display: inline-flex;
    align-items: center;
    padding: 0 16px;
    height: 32px;
    border-radius: 16px;
    font-size: 14px;
    font-weight: 400;
    font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    cursor: pointer;
    border: 1px solid #666;
    background: #fff;
    color: #000;
    white-space: nowrap;
  `

  toggle.addEventListener('click', () => {
    filterActive = !filterActive
    chrome.storage.local.set({ filterActive })

    if (filterActive) {
      toggle.style.background = '#EAF3DE'
      toggle.style.borderColor = '#639922'
      toggle.style.color = '#27500A'
      applyFilter()
      filterInterval = setInterval(applyFilter, 100)
    } else {
      toggle.style.background = '#fff'
      toggle.style.borderColor = '#666'
      toggle.style.color = '#000'
      clearInterval(filterInterval)
      document.querySelectorAll('.artdeco-entity-lockup__subtitle').forEach(el => {
        const card = el.closest('li')
        if (card) card.style.display = ''
      })
    }
  })

  const li = document.createElement('li')
  li.appendChild(toggle)
  filterBar.appendChild(li)
}

const observer = new MutationObserver(() => {
  injectBadges()
  injectToggle()
})
observer.observe(document.body, { childList: true, subtree: true })