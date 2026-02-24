document.addEventListener('DOMContentLoaded', () => {
    const providerSelect = document.getElementById('provider');
    const apiKeyInput = document.getElementById('apiKey');
    const saveBtn = document.getElementById('saveBtn');
    const statusMessage = document.getElementById('statusMessage');

    // Load existing settings
    chrome.storage.local.get(['jerkoff_provider', 'jerkoff_apiKey'], (result) => {
        if (result.jerkoff_provider) {
            providerSelect.value = result.jerkoff_provider;
        }
        if (result.jerkoff_apiKey) {
            apiKeyInput.value = result.jerkoff_apiKey;
        }
    });

    // Save settings
    saveBtn.addEventListener('click', () => {
        const provider = providerSelect.value;
        const apiKey = apiKeyInput.value.trim();

        chrome.storage.local.set({
            jerkoff_provider: provider,
            jerkoff_apiKey: apiKey
        }, () => {
            // Show success message
            statusMessage.textContent = 'Settings saved successfully!';
            statusMessage.className = 'status-success';

            setTimeout(() => {
                statusMessage.className = 'status-hidden';
            }, 2500);
        });
    });
});
