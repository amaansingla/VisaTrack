const toggle = document.getElementById('filterToggle')

chrome.storage.local.get('filterActive', (result) => {
  toggle.checked = result.filterActive || false
})

toggle.addEventListener('change', () => {
  chrome.storage.local.set({ filterActive: toggle.checked })

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.reload(tabs[0].id)
  })
})