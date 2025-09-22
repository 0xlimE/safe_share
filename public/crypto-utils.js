// Crypto utilities for client-side AES-256 encryption/decryption

class CryptoUtils {
    static async generateKey() {
        return await window.crypto.subtle.generateKey(
            {
                name: 'AES-GCM',
                length: 256
            },
            true,
            ['encrypt', 'decrypt']
        );
    }

    static async exportKey(key) {
        const exported = await window.crypto.subtle.exportKey('raw', key);
        return this.arrayBufferToBase64(exported);
    }

    static async importKey(keyData) {
        const keyBuffer = this.base64ToArrayBuffer(keyData);
        return await window.crypto.subtle.importKey(
            'raw',
            keyBuffer,
            {
                name: 'AES-GCM',
                length: 256
            },
            true,
            ['encrypt', 'decrypt']
        );
    }

    static generateIV() {
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        return this.arrayBufferToBase64(iv);
    }

    static async encryptData(data, key, iv) {
        const encoder = new TextEncoder();
        const dataBuffer = typeof data === 'string' ? encoder.encode(data) : data;
        const ivBuffer = this.base64ToArrayBuffer(iv);

        const encrypted = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: ivBuffer
            },
            key,
            dataBuffer
        );

        return this.arrayBufferToBase64(encrypted);
    }

    static async decryptData(encryptedData, key, iv) {
        const encryptedBuffer = this.base64ToArrayBuffer(encryptedData);
        const ivBuffer = this.base64ToArrayBuffer(iv);

        const decrypted = await window.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: ivBuffer
            },
            key,
            encryptedBuffer
        );

        return decrypted;
    }

    static async encryptFile(file, key, iv) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const arrayBuffer = e.target.result;
                    const encrypted = await this.encryptData(arrayBuffer, key, iv);
                    resolve(encrypted);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    static async decryptFile(encryptedData, key, iv, filename) {
        const decryptedBuffer = await this.decryptData(encryptedData, key, iv);
        const blob = new Blob([decryptedBuffer]);
        
        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    static arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }

    static base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static generateShareUrl(id, key, iv) {
        const baseUrl = window.location.origin;
        const keyData = encodeURIComponent(key);
        const ivData = encodeURIComponent(iv);
        return `${baseUrl}/retrieve/${id}#key=${keyData}&iv=${ivData}`;
    }

    static parseShareUrl() {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        return {
            key: decodeURIComponent(params.get('key') || ''),
            iv: decodeURIComponent(params.get('iv') || '')
        };
    }
}

// Make available globally
window.CryptoUtils = CryptoUtils;