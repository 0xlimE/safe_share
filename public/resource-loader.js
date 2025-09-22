// Resource loader utility to ensure all assets are loaded before showing content
class ResourceLoader {
    constructor() {
        this.scriptsToLoad = [];
        this.stylesheetsToLoad = [];
        this.loadedCount = 0;
        this.totalCount = 0;
        this.onAllLoadedCallback = null;
        this.loadTimeout = null;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    // Register scripts and stylesheets to wait for
    registerAssets(scripts = [], stylesheets = []) {
        this.scriptsToLoad = scripts;
        this.stylesheetsToLoad = stylesheets;
        this.totalCount = scripts.length + stylesheets.length;
    }

    // Set callback for when all resources are loaded
    onAllLoaded(callback) {
        this.onAllLoadedCallback = callback;
    }

    // Check if a stylesheet is loaded by testing computed styles
    isStylesheetLoaded() {
        try {
            // Create a test element to check if CSS is applied
            const testElement = document.createElement('div');
            testElement.className = 'container';
            testElement.style.visibility = 'hidden';
            testElement.style.position = 'absolute';
            document.body.appendChild(testElement);
            
            const styles = window.getComputedStyle(testElement);
            document.body.removeChild(testElement);
            
            // Check if any meaningful styles are applied (assumes container has CSS rules)
            return styles.maxWidth !== 'none' || 
                   styles.padding !== '0px' || 
                   styles.margin !== '0px' ||
                   styles.display !== 'inline';
        } catch (e) {
            return false;
        }
    }

    // Check if all required scripts are loaded
    areScriptsLoaded() {
        // Check for specific global objects that should be available
        const requiredGlobals = ['CryptoUtils'];
        return requiredGlobals.every(global => typeof window[global] !== 'undefined');
    }

    // Check if all resources are loaded
    checkAllResourcesLoaded() {
        const stylesheetLoaded = this.stylesheetsToLoad.length === 0 || this.isStylesheetLoaded();
        const scriptsLoaded = this.scriptsToLoad.length === 0 || this.areScriptsLoaded();

        if (stylesheetLoaded && scriptsLoaded) {
            clearTimeout(this.loadTimeout);
            this.showContent();
            return true;
        }
        return false;
    }

    // Show the main content and hide loader
    showContent() {
        const loader = document.getElementById('resource-loader');
        const content = document.getElementById('main-content');
        
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 300);
        }
        
        if (content) {
            content.style.display = 'block';
            setTimeout(() => {
                content.style.opacity = '1';
            }, 50);
        }

        // Call the callback if provided
        if (this.onAllLoadedCallback) {
            this.onAllLoadedCallback();
        }
    }

    // Show retry option
    showRetryOption() {
        const loaderText = document.querySelector('.resource-loader-text');
        const retryButton = document.querySelector('.resource-retry-button');
        
        if (loaderText) {
            loaderText.textContent = 'Loading failed. Click retry to reload.';
        }
        if (retryButton) {
            retryButton.style.display = 'block';
        }
    }

    // Retry loading
    retry() {
        if (this.retryCount < this.maxRetries) {
            this.retryCount++;
            window.location.reload();
        } else {
            const loaderText = document.querySelector('.resource-loader-text');
            if (loaderText) {
                loaderText.textContent = 'Failed to load resources. Please check your connection and refresh the page.';
            }
        }
    }

    // Start the loading process
    startLoading(timeoutMs = 15000) {
        // Set up a timeout to show retry option
        this.loadTimeout = setTimeout(() => {
            if (!this.checkAllResourcesLoaded()) {
                this.showRetryOption();
            }
        }, timeoutMs);

        // Start checking for loaded resources
        this.checkResourcesInterval = setInterval(() => {
            if (this.checkAllResourcesLoaded()) {
                clearInterval(this.checkResourcesInterval);
            }
        }, 100);

        // Also check when DOM is fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.checkAllResourcesLoaded(), 100);
            });
        } else {
            setTimeout(() => this.checkAllResourcesLoaded(), 100);
        }
    }
}

// Global retry function for inline onclick
function retryResourceLoading() {
    if (window.resourceLoader) {
        window.resourceLoader.retry();
    }
}

// Make available globally
window.ResourceLoader = ResourceLoader;
window.retryResourceLoading = retryResourceLoading;
