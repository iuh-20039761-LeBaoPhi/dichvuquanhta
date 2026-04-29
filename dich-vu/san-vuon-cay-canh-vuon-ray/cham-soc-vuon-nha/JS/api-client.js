(function (global) {
  const API_BASE = 'https://api.dvqt.vn';
  const FALLBACKS = {
    services: 'dich-vu.json',
    posts: 'bai-viet.json'
  };

  const DEFAULT_SETTINGS = {
    holiday_fee: 100000,
    night_fee: 50000,
    shipping_rate: 15000,
    vat_rate: 0.1
  };

  function normalizeRows(json) {
    if (Array.isArray(json)) {
      return json;
    }
    if (!json || typeof json !== 'object') {
      return [];
    }
    if (Array.isArray(json.data)) return json.data;
    if (Array.isArray(json.rows)) return json.rows;
    if (Array.isArray(json.items)) return json.items;
    if (Array.isArray(json.list)) return json.list;
    return [];
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`Fetch failed ${response.status} ${response.statusText}`);
    }
    return await response.json();
  }

  async function fetchApi(path, options) {
    const url = new URL(path, API_BASE).href;
    return await fetchJson(url, options);
  }

  async function fetchWithFallback(remoteUrl, fallbackUrl) {
    try {
      return await fetchJson(remoteUrl);
    } catch (error) {
      console.warn('Fallback to local data for', remoteUrl, error.message);
      return await fetchJson(fallbackUrl);
    }
  }

  const API = {
    async getSettings() {
      try {
        const data = await fetchApi('/api/settings');
        if (data && typeof data === 'object') {
          return Object.assign({}, DEFAULT_SETTINGS, data);
        }
      } catch (err) {
        console.warn('Unable to load remote settings:', err.message);
      }
      return Object.assign({}, DEFAULT_SETTINGS);
    },

    async getServices() {
      try {
        const json = await fetchApi('/api/services');
        const rows = normalizeRows(json);
        if (rows.length) {
          return rows;
        }
      } catch (err) {
        console.warn('Unable to load remote services:', err.message);
      }
      try {
        return await fetchJson(FALLBACKS.services);
      } catch (error) {
        console.error('Unable to load fallback service data:', error.message);
      }
      return [];
    },

    async getServiceById(id) {
      const services = await this.getServices();
      return services.find(s => String(s.id) === String(id)) || null;
    },

    async getPosts() {
      try {
        const json = await fetchApi('/api/posts');
        const rows = normalizeRows(json);
        if (rows.length) {
          return rows;
        }
      } catch (err) {
        console.warn('Unable to load remote posts:', err.message);
      }
      try {
        return await fetchJson(FALLBACKS.posts);
      } catch (error) {
        console.error('Unable to load fallback post data:', error.message);
      }
      return [];
    },

    async getPostById(id) {
      const posts = await this.getPosts();
      return posts.find(p => String(p.id) === String(id)) || null;
    }
  };

  global.API = global.API || API;
})(window);
