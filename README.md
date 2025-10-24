# Safe Share

A simple, secure file and text sharing service with client-side encryption. Share sensitive information without worrying about server-side snooping.

## How it works

Everything gets encrypted in your browser before it touches the server - the encryption key never leaves your device. When someone opens your share link, decryption happens entirely on their end too. The server just stores encrypted blobs and doesn't know what's inside.

Share links include the decryption key in the URL fragment (the part after #), which means it's never sent to the server in HTTP requests. Pretty neat.

## Features

- **Client-side AES-256 encryption** - Your data is encrypted before upload
- **Self-destructing links** - Set a download limit (1-100 downloads)
- **No account required** - Just encrypt and share
- **File or text sharing** - Works with any file type up to 100MB
- **Open source** - Audit the code yourself

## Quick start

```bash
# Install dependencies
npm install

# Run the server
npm start
```

The app runs on `http://localhost:8080` by default.

## Docker deployment

```bash
docker compose up --build
```

Or use the included Dockerfile for custom deployments.

## Security notes

- All encryption/decryption happens in the browser using the Web Crypto API
- The server only stores encrypted data and metadata (filename, download count)
- Encryption keys are 256-bit AES-GCM with randomly generated IVs
- Files are automatically deleted after reaching the download limit

## API endpoints

### POST /api/store
Store encrypted content.

**Request body:**
```json
{
  "encryptedData": "base64-encoded-encrypted-data",
  "filename": "document.pdf",
  "isText": false,
  "maxDownloads": 5
}
```

**Response:**
```json
{
  "id": "uuid-v4"
}
```

### GET /api/info/:id
Get metadata without downloading.

**Response:**
```json
{
  "filename": "document.pdf",
  "isText": false,
  "downloads": 2,
  "maxDownloads": 5,
  "remainingDownloads": 3,
  "createdAt": "2025-10-24T12:00:00.000Z"
}
```

### GET /api/retrieve/:id
Download encrypted content (increments download counter).

**Response:**
```json
{
  "encryptedData": "base64-encoded-encrypted-data",
  "filename": "document.pdf",
  "isText": false,
  "downloads": 3,
  "maxDownloads": 5,
  "isLastDownload": false
}
```

## Tech stack

- **Backend:** Express.js, Multer, UUID
- **Frontend:** Vanilla JavaScript, Web Crypto API
- **Storage:** File system (JSON files)

## License

Apache 2.0
