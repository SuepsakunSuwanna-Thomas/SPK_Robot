/**
 * API Manager - Handles all communications with the RP2350 IDE Server
 */

const API = {
    // 🛡️ Internal Fetch with Retry (Handles net::ERR_NETWORK_IO_SUSPENDED)
    async _fetch(url, options = {}, retries = 5) {
        try {
            const res = await fetch(url, options);
            return res;
        } catch (err) {
            // Check for network suspension or transient errors
            const errStr = String(err);
            const isSuspended = errStr.includes('ERR_NETWORK_IO_SUSPENDED') || 
                                errStr.includes('Failed to fetch') ||
                                (err.name === 'TypeError') ||
                                (err.name === 'NetworkError');
            
            if (retries > 0 && isSuspended) {
                // Progressive delay: 1s, 2s, 3s, 4s, 5s
                const delay = (6 - retries) * 1000;
                console.warn(`[API] Network error/suspended at ${url}. Retrying in ${delay/1000}s... (${retries} left)`);
                await new Promise(r => setTimeout(r, delay));
                return this._fetch(url, options, retries - 1);
            }
            throw err;
        }
    },


    // Project Files
    async listFiles() {
        const res = await this._fetch('/files');
        return await res.json();
    },

    async saveProject(filename, xml, customBlocks, userCode) {
        const res = await this._fetch('/save_file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename, xml, customBlocks, userCode })
        });
        return await res.json();
    },


    async loadProject(filename) {
        const res = await this._fetch(`/load_file/${encodeURIComponent(filename)}`);
        if (!res.ok) throw new Error("File not found");
        return await res.json();
    },

    async renameProject(oldName, newName) {
        const res = await this._fetch('/rename_file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldName, newName })
        });
        return await res.json();
    },

    async deleteProject(filename) {
        const res = await this._fetch(`/delete_file/${encodeURIComponent(filename)}`, {
            method: 'DELETE'
        });
        return await res.json();
    },

    // Upload & Compilation
    async upload(cppCode, userCode, signal) {
        const res = await this._fetch('/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: cppCode, userCode: userCode }),
            signal: signal
        });
        return res;
    },

    async cancelUpload() {
        const res = await this._fetch('/cancel_upload', { method: 'POST' });
        return await res.json();
    },

    // Library Management
    async listPioLibs() {
        const res = await this._fetch('/list_pio_libs');
        return await res.json();
    },

    async listUserLibs() {
        const res = await this._fetch('/list_user_libs');
        return await res.json();
    },

    async searchLib(query) {
        const res = await this._fetch('/search_lib', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        return await res.json();
    },

    async installLib(libName, libVersion = null) {
        const res = await this._fetch('/install_lib', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ libName, libVersion })
        });
        return await res.json();
    },

    async deleteLib(libName) {
        const res = await this._fetch('/delete_pio_lib', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ libName })
        });
        return await res.json();
    },

    async uploadZipLib(formData) {
        const res = await this._fetch('/upload_zip_lib', {
            method: 'POST',
            body: formData
        });
        return await res.json();
    },

    async updateLibIndex() {
        const res = await this._fetch('/update_index', { method: 'POST' });
        return await res.json();
    },

    // Source Code Manager
    async listSrcFiles() {
        const res = await this._fetch('/list_src_files');
        return await res.json();
    },

    async readSrcFile(filename) {
        const res = await this._fetch('/read_src_file/' + encodeURIComponent(filename));
        return await res.json();
    },

    async writeSrcFile(filename, content) {
        const res = await this._fetch('/save_src_file', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: filename, content: content })
        });
        return await res.json();
    }
};

window.API = API; // Global access
