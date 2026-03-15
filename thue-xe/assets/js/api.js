const API = {
    baseURL: 'controllers/',

    cars: {
        getFeatured: async () => {
            try {
                const res = await fetch(`${API.baseURL}car-controller.php?action=getFeatured`);
                if (!res.ok) throw new Error();
                return await res.json();
            } catch {
                const sd = await STATIC_DATA_PROMISE;
                return { success: true, data: sd.cars.slice(0, 6) };
            }
        },
        getAll: async () => {
            try {
                const res = await fetch(`${API.baseURL}car-controller.php?action=getAll`);
                if (!res.ok) throw new Error();
                return await res.json();
            } catch {
                const sd = await STATIC_DATA_PROMISE;
                return { success: true, data: sd.cars };
            }
        },
        getById: async (id) => {
            try {
                const res = await fetch(`${API.baseURL}car-controller.php?action=getById&id=${id}`);
                if (!res.ok) throw new Error();
                return await res.json();
            } catch {
                const sd = await STATIC_DATA_PROMISE;
                const car = sd.cars.find(c => c.id === parseInt(id));
                return car
                    ? { success: true, data: { car, images: [] } }
                    : { success: false, message: 'Không tìm thấy xe' };
            }
        },
        search: async (params) => {
            try {
                const query = new URLSearchParams(params).toString();
                const res = await fetch(`${API.baseURL}car-controller.php?action=search&${query}`);
                if (!res.ok) throw new Error();
                return await res.json();
            } catch {
                const sd = await STATIC_DATA_PROMISE;
                let cars = [...sd.cars];
                if (params.brand) cars = cars.filter(c => c.brand === params.brand);
                if (params.seats) cars = cars.filter(c => c.seats === parseInt(params.seats));
                if (params.price) {
                    if (params.price.includes('-')) {
                        const [min, max] = params.price.split('-').map(Number);
                        cars = cars.filter(c => c.price_per_day >= min && c.price_per_day <= max);
                    } else {
                        cars = cars.filter(c => c.price_per_day >= parseInt(params.price));
                    }
                }
                return { success: true, data: cars };
            }
        },
        getFilterOptions: async () => {
            try {
                const res = await fetch(`${API.baseURL}car-controller.php?action=getFilterOptions`);
                if (!res.ok) throw new Error();
                return await res.json();
            } catch {
                const sd = await STATIC_DATA_PROMISE;
                return { success: true, ...sd.filterOptions };
            }
        }
    },

    services: {
        getAll: async () => {
            try {
                const res = await fetch(`${API.baseURL}service-controller.php?action=getAll`);
                if (!res.ok) throw new Error();
                return await res.json();
            } catch {
                const sd = await STATIC_DATA_PROMISE;
                return { success: true, data: sd.services };
            }
        }
    },

    bookings: {
        create: async (data) => {
            try {
                const res = await fetch(`${API.baseURL}booking-controller.php?action=create`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                if (!res.ok) throw new Error();
                return await res.json();
            } catch {
                return { success: false, demo: true };
            }
        },
        getById: async (id) => {
            try {
                const res = await fetch(`${API.baseURL}booking-controller.php?action=getById&id=${id}`);
                if (!res.ok) throw new Error();
                return await res.json();
            } catch {
                return { success: false };
            }
        }
    }
};
