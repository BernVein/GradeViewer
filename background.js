// Pag store sa token, para if i logout magamit ghapon ang extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "storeToken") {
        console.log("Background script: Received token:", message.token);
        chrome.storage.local.set({ token: message.token }, () => {
            console.log("Background script: Token stored successfully.");
            sendResponse({ success: true });
        });
        return true; 
    }
});
