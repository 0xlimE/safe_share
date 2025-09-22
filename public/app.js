// Main application logic
let currentTab = 'text';
let selectedFile = null;

// DOM elements
const textInput = document.getElementById('textInput');
const fileInput = document.getElementById('fileInput');
const fileUploadArea = document.getElementById('fileUploadArea');
const fileInfo = document.getElementById('fileInfo');
const shareButton = document.getElementById('shareButton');
const shareButtonText = document.getElementById('shareButtonText');
const shareButtonLoader = document.getElementById('shareButtonLoader');
const result = document.getElementById('result');
const shareLink = document.getElementById('shareLink');
const downloadsInfo = document.getElementById('downloadsInfo');
const maxDownloads = document.getElementById('maxDownloads');

// Tab switching
function switchTab(tab) {
    currentTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[onclick="switchTab('${tab}')"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tab}-tab`).classList.add('active');
    
    // Clear result
    result.classList.add('hidden');
}

// File upload handling
fileUploadArea.addEventListener('click', () => {
    fileInput.click();
});

fileUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    fileUploadArea.classList.add('dragover');
});

fileUploadArea.addEventListener('dragleave', () => {
    fileUploadArea.classList.remove('dragover');
});

fileUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    fileUploadArea.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
});

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

function handleFileSelect(file) {
    selectedFile = file;
    
    // Use textContent to prevent XSS from malicious filenames
    fileInfo.innerHTML = `
        <strong>Selected file:</strong> <span class="filename"></span><br>
        <strong>Size:</strong> ${CryptoUtils.formatFileSize(file.size)}<br>
        <strong>Type:</strong> <span class="filetype"></span>
    `;
    // Safely set the filename and type using textContent
    fileInfo.querySelector('.filename').textContent = file.name;
    fileInfo.querySelector('.filetype').textContent = file.type || 'Unknown';
    fileInfo.style.display = 'block';
}

// Share button handler
shareButton.addEventListener('click', async () => {
    if (currentTab === 'text') {
        const text = textInput.value.trim();
        if (!text) {
            alert('Please enter some text to share');
            return;
        }
        await shareContent(text, null, true);
    } else {
        if (!selectedFile) {
            alert('Please select a file to share');
            return;
        }
        await shareContent(null, selectedFile, false);
    }
});

async function shareContent(text, file, isText) {
    try {
        setLoading(true);
        
        // Generate encryption key and IV
        const key = await CryptoUtils.generateKey();
        const keyString = await CryptoUtils.exportKey(key);
        const iv = CryptoUtils.generateIV();
        
        let encryptedData;
        let filename;
        
        if (isText) {
            encryptedData = await CryptoUtils.encryptData(text, key, iv);
            filename = 'shared_text.txt';
        } else {
            encryptedData = await CryptoUtils.encryptFile(file, key, iv);
            filename = file.name;
        }
        
        // Upload encrypted data to server
        const response = await fetch('/api/store', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                encryptedData,
                filename,
                isText,
                maxDownloads: parseInt(maxDownloads.value)
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to store encrypted data');
        }
        
        const { id } = await response.json();
        
        // Generate share URL with key and IV in fragment
        const shareUrl = CryptoUtils.generateShareUrl(id, keyString, iv);
        
        // Show result
        shareLink.value = shareUrl;
        downloadsInfo.textContent = maxDownloads.value;
        result.classList.remove('hidden');
        
        // Clear inputs
        if (isText) {
            textInput.value = '';
        } else {
            selectedFile = null;
            fileInput.value = '';
            fileInfo.style.display = 'none';
        }
        
    } catch (error) {
        console.error('Share error:', error);
        // Sanitize error message to prevent potential XSS
        const safeErrorMessage = (error.message || 'Unknown error').replace(/[<>&"']/g, '');
        alert('Error sharing content: ' + safeErrorMessage);
    } finally {
        setLoading(false);
    }
}

function setLoading(loading) {
    shareButton.disabled = loading;
    if (loading) {
        shareButtonText.textContent = 'Encrypting & Uploading...';
        shareButtonLoader.classList.remove('hidden');
    } else {
        shareButtonText.textContent = 'Share Securely';
        shareButtonLoader.classList.add('hidden');
    }
}

function copyLink() {
    shareLink.select();
    shareLink.setSelectionRange(0, 99999); // For mobile devices
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(shareLink.value).then(() => {
            showCopySuccess();
        }).catch(() => {
            // Fallback
            document.execCommand('copy');
            showCopySuccess();
        });
    } else {
        // Fallback for older browsers
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    switchTab('text');
});