// Retrieve page logic
const contentId = window.location.pathname.split('/').pop();
let cryptoKey = null;
let cryptoIV = null;

// DOM elements
const loading = document.getElementById('loading');
const info = document.getElementById('info');
const content = document.getElementById('content');
const error = document.getElementById('error');
const errorMessage = document.getElementById('errorMessage');

const contentType = document.getElementById('contentType');
const filename = document.getElementById('filename');
const downloadCount = document.getElementById('downloadCount');
const maxDownloadsSpan = document.getElementById('maxDownloads');
const remainingDownloads = document.getElementById('remainingDownloads');
const warningMessage = document.getElementById('warningMessage');

const downloadButton = document.getElementById('downloadButton');
const downloadButtonText = document.getElementById('downloadButtonText');
const downloadButtonLoader = document.getElementById('downloadButtonLoader');

const textContent = document.getElementById('textContent');
const fileContent = document.getElementById('fileContent');
const decryptedText = document.getElementById('decryptedText');
const decryptedFilename = document.getElementById('decryptedFilename');
const downloadFileButton = document.getElementById('downloadFileButton');

async function initialize() {
    try {
        // Parse encryption key and IV from URL fragment
        const urlParams = CryptoUtils.parseShareUrl();
        
        if (!urlParams.key || !urlParams.iv) {
            throw new Error('Invalid share link - missing encryption key or IV');
        }
        
        cryptoKey = await CryptoUtils.importKey(urlParams.key);
        cryptoIV = urlParams.iv;
        
        // Get content information
        await loadContentInfo();
        
    } catch (err) {
        console.error('Initialization error:', err);
        showError(err.message);
    }
}

async function loadContentInfo() {
    try {
        const response = await fetch(`/api/info/${contentId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Content not found or has expired');
            } else if (response.status === 410) {
                throw new Error('Content has been deleted due to download limit');
            }
            throw new Error('Failed to load content information');
        }
        
        const data = await response.json();
        
        // Update UI
        contentType.textContent = data.isText ? 'Text' : 'File';
        filename.textContent = data.filename;
        downloadCount.textContent = data.downloads;
        maxDownloadsSpan.textContent = data.maxDownloads;
        remainingDownloads.textContent = data.remainingDownloads;
        
        if (data.remainingDownloads <= 1) {
            warningMessage.classList.remove('hidden');
        }
        
        // Show info section
        loading.classList.add('hidden');
        info.classList.remove('hidden');
        
    } catch (err) {
        console.error('Load info error:', err);
        showError(err.message);
    }
}

downloadButton.addEventListener('click', async () => {
    try {
        setDownloadLoading(true);
        
        // Download and decrypt content
        const response = await fetch(`/api/retrieve/${contentId}`);
        
        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Content not found or has expired');
            } else if (response.status === 410) {
                throw new Error('Content has been deleted due to download limit');
            }
            throw new Error('Failed to download content');
        }
        
        const data = await response.json();
        
        if (data.isText) {
            // Decrypt text
            const decryptedBuffer = await CryptoUtils.decryptData(
                data.encryptedData, 
                cryptoKey, 
                cryptoIV
            );
            const decoder = new TextDecoder();
            const decryptedTextContent = decoder.decode(decryptedBuffer);
            
            // Show decrypted text
            decryptedText.value = decryptedTextContent;
            textContent.classList.remove('hidden');
            
        } else {
            // Prepare file download
            decryptedFilename.textContent = data.filename;
            
            downloadFileButton.onclick = async () => {
                try {
                    await CryptoUtils.decryptFile(
                        data.encryptedData,
                        cryptoKey,
                        cryptoIV,
                        data.filename
                    );
                } catch (err) {
                    console.error('File decrypt error:', err);
                    // Sanitize error message to prevent potential XSS
                    const safeErrorMessage = (err.message || 'Unknown error').replace(/[<>&"']/g, '');
                    alert('Error decrypting file: ' + safeErrorMessage);
                }
            };
            
            fileContent.classList.remove('hidden');
        }
        
        // Show content section
        info.classList.add('hidden');
        content.classList.remove('hidden');
        
        // Show completion message
        if (data.isLastDownload) {
            alert('This was the last download. The content has been permanently deleted.');
        } else {
            const remaining = data.maxDownloads - data.downloads;
            if (remaining > 0) {
                alert(`Content downloaded successfully. ${remaining} download(s) remaining.`);
            }
        }
        
    } catch (err) {
        console.error('Download error:', err);
        showError(err.message);
    } finally {
        setDownloadLoading(false);
    }
});

function setDownloadLoading(loading) {
    downloadButton.disabled = loading;
    if (loading) {
        downloadButtonText.textContent = 'Downloading & Decrypting...';
        downloadButtonLoader.classList.remove('hidden');
    } else {
        downloadButtonText.textContent = 'Download & Decrypt';
        downloadButtonLoader.classList.add('hidden');
    }
}

function showError(message) {
    loading.classList.add('hidden');
    info.classList.add('hidden');
    content.classList.add('hidden');
    errorMessage.textContent = message;
    error.classList.remove('hidden');
}

function copyText() {
    decryptedText.select();
    decryptedText.setSelectionRange(0, 99999);
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(decryptedText.value).then(() => {
            showCopySuccess();
        }).catch(() => {
            document.execCommand('copy');
            showCopySuccess();
        });
    } else {
        document.execCommand('copy');
        showCopySuccess();
    }
}

function showCopySuccess() {
    const copyButton = document.querySelector('.copy-button');
    const originalText = copyButton.textContent;
    copyButton.textContent = 'Copied!';
    copyButton.style.background = '#28a745';
    
    setTimeout(() => {
        copyButton.textContent = originalText;
        copyButton.style.background = '';
    }, 2000);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', initialize);