// Gets the token from VSU portal, i inject sa site para directly ma access ang token
const script = document.createElement("script");
script.textContent = `
    (function() {
        try {
            const token = localStorage.getItem("token");
            console.log("Injected script: Retrieved token:", token);
            if (token) {
                window.postMessage({ action: "sendToken", token: token }, "*");
            } else {
                console.error("Injected script: Token not found in localStorage.");
            }
        } catch (error) {
            console.error("Injected script: Error accessing localStorage:", error);
        }
    })();
`;
(document.head || document.documentElement).appendChild(script);
script.remove();

window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data.action === "sendToken") {
        console.log("Content script: Received token from injected script:", event.data.token);
        chrome.runtime.sendMessage({ action: "storeToken", token: event.data.token }, (response) => {
            console.log("Content script: Token sent to background script:", response);
        });
    }
});
