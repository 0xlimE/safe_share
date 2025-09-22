const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Storage for encrypted data with metadata
const storage = new Map();

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript');
        } else if (path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }
    }
}));

// Configure multer for file uploads (but we'll mainly use JSON for encrypted data)
const upload = multer({
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// Store encrypted data
app.post('/api/store', (req, res) => {
    try {
        const { encryptedData, filename, isText, maxDownloads = 5 } = req.body;
        
        if (!encryptedData) {
            return res.status(400).json({ error: 'No encrypted data provided' });
        }

        const id = uuidv4();
        const item = {
            id,
            encryptedData,
            filename: filename || 'shared_content',
            isText: isText || false,
            maxDownloads: parseInt(maxDownloads),
            downloads: 0,
            createdAt: new Date()
        };

        storage.set(id, item);
        
        // Also save to disk for persistence
        fs.writeFileSync(path.join(dataDir, `${id}.json`), JSON.stringify(item));

        res.json({ id });
    } catch (error) {
        console.error('Store error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Retrieve encrypted data
app.get('/api/retrieve/:id', (req, res) => {
    try {
        const { id } = req.params;
        let item = storage.get(id);

        // Try to load from disk if not in memory
        if (!item) {
            const filePath = path.join(dataDir, `${id}.json`);
            if (fs.existsSync(filePath)) {
                item = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                storage.set(id, item);
            }
        }

        if (!item) {
            return res.status(404).json({ error: 'Content not found' });
        }

        // Check if download limit reached
        if (item.downloads >= item.maxDownloads) {
            // Clean up
            storage.delete(id);
            const filePath = path.join(dataDir, `${id}.json`);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            return res.status(410).json({ error: 'Content has been deleted due to download limit' });
        }

        // Increment download counter
        item.downloads++;
        storage.set(id, item);
        fs.writeFileSync(path.join(dataDir, `${id}.json`), JSON.stringify(item));

        // Check if this was the last download
        const isLastDownload = item.downloads >= item.maxDownloads;

        res.json({
            encryptedData: item.encryptedData,
            filename: item.filename,
            isText: item.isText,
            downloads: item.downloads,
            maxDownloads: item.maxDownloads,
            isLastDownload
        });

        // Delete if max downloads reached
        if (isLastDownload) {
            storage.delete(id);
            const filePath = path.join(dataDir, `${id}.json`);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    } catch (error) {
        console.error('Retrieve error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get item info without downloading
app.get('/api/info/:id', (req, res) => {
    try {
        const { id } = req.params;
        let item = storage.get(id);

        // Try to load from disk if not in memory
        if (!item) {
            const filePath = path.join(dataDir, `${id}.json`);
            if (fs.existsSync(filePath)) {
                item = JSON.parse(fs.readFileSync(filePath, 'utf8'));
                storage.set(id, item);
            }
        }

        if (!item) {
            return res.status(404).json({ error: 'Content not found' });
        }

        if (item.downloads >= item.maxDownloads) {
            return res.status(410).json({ error: 'Content has been deleted due to download limit' });
        }

        res.json({
            filename: item.filename,
            isText: item.isText,
            downloads: item.downloads,
            maxDownloads: item.maxDownloads,
            remainingDownloads: item.maxDownloads - item.downloads,
            createdAt: item.createdAt
        });
    } catch (error) {
        console.error('Info error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the retrieve page
app.get('/retrieve/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'retrieve.html'));
});

// Load existing data from disk on startup
function loadExistingData() {
    if (fs.existsSync(dataDir)) {
        const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
        files.forEach(file => {
            try {
                const data = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
                storage.set(data.id, data);
            } catch (error) {
                console.error(`Error loading ${file}:`, error);
            }
        });
        console.log(`Loaded ${files.length} existing items`);
    }
}

loadExistingData();

app.listen(PORT, () => {
    console.log(`Safe Share server running on port ${PORT}`);
});