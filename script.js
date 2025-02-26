/*
 * This program is licensed under the GNU GPL 3.0.
 * You may redistribute and modify it under the terms of the license.
 * See <https://www.gnu.org/licenses/gpl-3.0.html> for details.
 */


let isInvalid = false;
const inputField = document.getElementById('extensionInput');

// Handle form submission to download the extension
document.getElementById('extensionForm').addEventListener('submit', function (event) {
    event.preventDefault();
    downloadExtension();
});

// Update download options and focus on the input when browser selection changes
document.querySelectorAll('.browser-input').forEach(input => {
    input.addEventListener('change', function () {
        updateDownloadOptions();
        inputField.focus();
    });
});

// Keyboard shortcut '/' to focus on the input
document.addEventListener('keydown', function (event) {
    if (event.key === '/' && event.target.tagName !== 'INPUT') {
        event.preventDefault();
        inputField.focus();
    }
});

// Update download options based on the selected browser
function updateDownloadOptions() {
    const browser = document.querySelector('input[name="browser"]:checked').value;
    const downloadType = document.getElementById('downloadType');

    const options = {
        chrome: ['crx'],
        firefox: ['xpi', 'zip'],
        opera: ['crx'],
        edge: ['crx']
    };

    downloadType.innerHTML = "";
    options[browser].forEach(format => {
        const option = document.createElement("option");
        option.value = format;
        option.textContent = `Download as ${format.toUpperCase()}`;
        downloadType.appendChild(option);
    });
}
updateDownloadOptions();

// Detect browser from input URL and update the browser selection
inputField.addEventListener("input", function () {
    detectBrowserFromUrl(this.value.trim());
});

function detectBrowserFromUrl(input) {
    const urlPatterns = {
        chrome: [
            /chrome\.google\.com\/webstore\/detail\//,
            /chromewebstore\.google\.com\/detail\//
        ],
        edge: [/microsoftedge\.microsoft\.com\/addons\/detail\//],
        opera: [/addons\.opera\.com\/.*extensions\/details\//],
        firefox: [
            /addons\.mozilla\.org\/.*addon\//,
            /addons\.allizom\.org\/.*addon\//,
            /addons-dev\.allizom\.org\/.*addon\//,
            /addons\.thunderbird\.net\/.*addon\//
        ]
    };

    for (const [browser, patterns] of Object.entries(urlPatterns)) {
        if (patterns.some(pattern => pattern.test(input))) {
            document.getElementById(browser).checked = true;
            updateDownloadOptions();
            break;
        }
    }
}

// Reset the border color in case of invalid input
inputField.addEventListener('input', function () {
    if (isInvalid) {
        inputField.style.borderColor = '';
        isInvalid = false;
    }
});

// Handle extension download logic
function downloadExtension() {
    const input = inputField.value.trim();
    const browserElement = document.querySelector('input[name="browser"]:checked');
    const browser = browserElement.value;
    const downloadType = document.getElementById('downloadType').value;
    let extensionId = extractExtensionId(input, browser);
    const downloadUrl = getDownloadUrl(browser, extensionId);

    if (!input) return;

    if (!extensionId) {
        inputField.style.borderColor = '#cc0f16';

        alert("Please enter a valid Extension ID or URL.");
        isInvalid = true;
        return;
    }

    if (downloadType === "zip" && browser === "firefox") {
        convertXpiToZip(downloadUrl, extensionId);
        return;
    }

    window.location.href = downloadUrl;
}

// Extract extension ID from the URL based on the browser type
function extractExtensionId(input, browser) {
    const patterns = {
        chrome: /([a-z]{32})/,
        edge: /([a-z]{32})/,
        firefox: /addons(?:-dev)?\.(?:mozilla\.org|allizom\.org|thunderbird\.net)\/[^\/]+\/(?:firefox|thunderbird)\/addon\/([^\/?]+)/,
        opera: /(?:addons.opera.com\/.*?\/extensions\/details\/)([a-zA-Z0-9_-]+)(?=\/|$)/
    };

    // If input is already an extension ID, return it directly
    if ((browser === "firefox" || browser === "opera") && /^[a-zA-Z0-9_-]+$/.test(input)) {
        return input;
    }

    const match = patterns[browser]?.exec(input);
    return match ? match[1] : null;
}

// Get the base download URL for each browser
function getDownloadUrl(browser, extensionId) {
    const baseUrls = {
        chrome: `https://clients2.google.com/service/update2/crx?response=redirect&os=win&arch=x86-64&os_arch=x86-64&nacl_arch=x86-64&prod=chromiumcrx&prodchannel=unknown&prodversion=132.0.0.0&acceptformat=crx2,crx3&x=id%3D${extensionId}%26uc`,
        edge: `https://edge.microsoft.com/extensionwebstorebase/v1/crx?response=redirect&x=id%3D${extensionId}%26installsource%3Dondemand%26uc`,
        opera: `https://addons.opera.com/extensions/download/${extensionId}`,
    };

    const inputUrl = inputField.value.trim();
    if (browser === "firefox") {
        if (inputUrl.includes("addons.allizom.org")) {
            return `https://addons.allizom.org/firefox/downloads/latest/${extensionId}/platform:5/${extensionId}.xpi`;
        }
        if (inputUrl.includes("addons-dev.allizom.org")) {
            return `https://addons-dev.allizom.org/firefox/downloads/latest/${extensionId}/platform:5/${extensionId}.xpi`;
        }
        if (inputUrl.includes("addons.thunderbird.net")) {
            return `https://addons.thunderbird.net/firefox/downloads/latest/${extensionId}/platform:5/${extensionId}.xpi`;
        }
        else {
            return `https://addons.mozilla.org/firefox/downloads/latest/${extensionId}/platform:5/${extensionId}.xpi`;
        }
    }

    return baseUrls[browser];
}

// XPI to ZIP
function convertXpiToZip(url, extensionId) {
    if (url.includes("addons.thunderbird.net")) {
        alert("Please download the XPI file first, then upload it here to convert it into a ZIP.");
        return;
    }

    fetch(url)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => {
            var blob = new Blob([arrayBuffer], { type: "application/zip" });
            var zipUrl = URL.createObjectURL(blob);
            var link = document.createElement("a");
            link.href = zipUrl;
            link.download = extensionId + ".zip";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        })
        .catch((error) => {
            console.error("Error converting XPI to ZIP:", error);
            alert(`Please ensure that the Extension ID or URL and browser are correct.`);
        });
}

// Handle file uploads for CRX/XPI conversion
const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const dropText = document.getElementById("dropText");
const convertButton = document.getElementById("convertButton");

// Initially disable the convert button
convertButton.disabled = true;

// Click to open file selection
dropZone.addEventListener("click", () => fileInput.click());

// Handle file selection
fileInput.addEventListener("change", handleFileSelect);
dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.style.background = "rgba(255, 255, 255, 0.2)";
});
dropZone.addEventListener("dragleave", () => {
    dropZone.style.background = "transparent";
});
dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    fileInput.files = event.dataTransfer.files;
    handleFileSelect();
});

function handleFileSelect() {
    if (fileInput.files.length > 0) {
        const file = fileInput.files[0];
        dropText.textContent = `Selected: ${file.name}`;
        convertButton.disabled = false;
    } else {
        dropText.textContent = "Drop your .crx or .xpi file here or click to browse";
        convertButton.disabled = true;
    }
}

// Handle Convert Button Click
convertButton.addEventListener("click", function () {
    if (fileInput.files.length === 0) return;

    const file = fileInput.files[0];
    convertFileToZip(file);
});

// Convert CRX/XPI to ZIP
function convertFileToZip(file) {
    const reader = new FileReader();
    reader.onload = function (event) {
        const arrayBuffer = event.target.result;
        let zipBlob;

        if (file.name.endsWith(".crx")) {
            zipBlob = ArrayBufferToBlob(arrayBuffer);
        } else {
            zipBlob = new Blob([arrayBuffer], { type: "application/zip" });
        }

        downloadZip(zipBlob, file.name.replace(/\.[^.]+$/, ".zip"));
    };
    reader.readAsArrayBuffer(file);
}

// Convert CRX to ZIP (Strips CRX Header)
function ArrayBufferToBlob(arraybuffer) {
    var buf = new Uint8Array(arraybuffer);
    var publicKeyLength, signatureLength, zipStartOffset;

    if (buf[4] === 2) { // CRX v2 format
        publicKeyLength = (buf[8] + (buf[9] << 8) + (buf[10] << 16) + (buf[11] << 24)) >>> 0;
        signatureLength = (buf[12] + (buf[13] << 8) + (buf[14] << 16) + (buf[15] << 24)) >>> 0;
        zipStartOffset = 16 + publicKeyLength + signatureLength;
    } else { // CRX v3 format
        publicKeyLength = (buf[8] + (buf[9] << 8) + (buf[10] << 16) + (buf[11] << 24)) >>> 0;
        zipStartOffset = 12 + publicKeyLength;
    }

    return new Blob([new Uint8Array(arraybuffer, zipStartOffset)], { type: "application/zip" });
}

// Download the converted ZIP file
function downloadZip(blob, fileName) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
}
