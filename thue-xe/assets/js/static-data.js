// Static data loaded from JSON — available as a Promise for all consumers
window.STATIC_DATA_PROMISE = fetch('assets/data/static-data.json').then(r => r.json());
