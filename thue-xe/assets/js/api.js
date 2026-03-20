// true khi chạy trên localhost/XAMPP, false khi chạy web tĩnh
const IS_LOCAL = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);

async function getMergedStaticCars() {
    const sd = await STATIC_DATA_PROMISE;
    const carTypes = Array.isArray(sd?.car_types) ? sd.car_types : [];
    const cars = Array.isArray(sd?.cars) ? sd.cars : [];
    const carTypeMap = new Map(carTypes.map(type => [Number(type.id), type]));

    return cars.map(car => {
        const carType = carTypeMap.get(Number(car.type_id)) || {};
        const imageSet = car.images || carType.images || {};
        const fallbackMain = 'thue-xe-xe-anh-mac-dinh-fallback.jpg';

        return {
            ...carType,
            ...car,
            main_image: car.main_image || imageSet.front || carType.main_image || fallbackMain
        };
    });
}

const API = {
    baseURL: 'controllers/',

    cars: {
        getFeatured: async () => {
            try {
                const res = await fetch(`${API.baseURL}car-controller.php?action=getFeatured`);
                if (!res.ok) throw new Error();
                const result = await res.json();
                if (!result.success) throw new Error();
                return result;
            } catch {
                const sd = await STATIC_DATA_PROMISE;
                return { success: true, data: sd.cars.slice(0, 6) };
            }
        },
        getAll: async () => {
            try {
                const res = await fetch(`${API.baseURL}car-controller.php?action=getAll`);
                if (!res.ok) throw new Error();
                const result = await res.json();
                if (!result.success) throw new Error();
                return result;
            } catch {
                const sd = await STATIC_DATA_PROMISE;
                return { success: true, data: sd.cars };
            }
        },
        getById: async (id) => {
            try {
                const res = await fetch(`${API.baseURL}car-controller.php?action=getById&id=${id}`);
                if (!res.ok) throw new Error();
                const result = await res.json();
                if (!result.success) throw new Error();
                return result;
            } catch {
                const sd = await STATIC_DATA_PROMISE;
                const targetId = parseInt(id, 10);
                const car = sd.cars.find(c => c.id === targetId);
                if (!car) {
                    return { success: false, message: 'Không tìm thấy xe' };
                }

                const carType = sd.car_types.find(t => t.id === car.type_id) || {};
                const imageSet = car.images || carType.images || {};
                const fallbackMain = 'thue-xe-xe-anh-mac-dinh-fallback.jpg';
                const mergedCar = {
                    ...carType,
                    ...car,
                    main_image: car.main_image || imageSet.front || carType.main_image || fallbackMain
                };

                const detailImages = ['back', 'left', 'right', 'interior']
                    .map(view => imageSet?.[view])
                    .filter(Boolean)
                    .filter(path => path !== mergedCar.main_image)
                    .map(path => ({ image_path: path, is_main: 0 }));

                return { success: true, data: { car: mergedCar, images: detailImages } };
            }
        },
        search: async (params) => {
            try {
                let cars = (await getMergedStaticCars()).filter(c => c.status === 'available');

                const brand = (params?.brand || '').trim().toLowerCase();
                const seats = params?.seats;
                const price = (params?.price || '').trim();

                if (brand) {
                    cars = cars.filter(c => String(c.brand || '').trim().toLowerCase() === brand);
                }

                if (seats !== undefined && seats !== null && seats !== '') {
                    const seatNum = Number(seats);
                    cars = Number.isFinite(seatNum)
                        ? cars.filter(c => Number(c.seats) === seatNum)
                        : [];
                }

                if (price) {
                    if (price.includes('-')) {
                        const [min, max] = price.split('-').map(Number);
                        cars = (Number.isFinite(min) && Number.isFinite(max))
                            ? cars.filter(c => {
                                const carPrice = Number(c.price_per_day);
                                return Number.isFinite(carPrice) && carPrice >= min && carPrice <= max;
                            })
                            : [];
                    } else {
                        const min = Number(price);
                        cars = Number.isFinite(min)
                            ? cars.filter(c => {
                                const carPrice = Number(c.price_per_day);
                                return Number.isFinite(carPrice) && carPrice >= min;
                            })
                            : [];
                    }
                }

                return { success: true, data: cars };
            } catch {
                return { success: false, message: 'Không tải được dữ liệu xe từ file JSON' };
            }
        },
        getFilterOptions: async () => {
            try {
                const cars = (await getMergedStaticCars()).filter(c => c.status === 'available');
                const brands = [...new Set(
                    cars.map(c => String(c.brand || '').trim()).filter(Boolean)
                )].sort((a, b) => a.localeCompare(b, 'vi'));

                const seats = [...new Set(
                    cars.map(c => Number(c.seats)).filter(Number.isFinite)
                )].sort((a, b) => a - b);

                const prices = cars
                    .map(c => Number(c.price_per_day))
                    .filter(Number.isFinite);

                return {
                    success: true,
                    brands,
                    seats,
                    prices: {
                        min: prices.length ? Math.min(...prices) : 0,
                        max: prices.length ? Math.max(...prices) : 0
                    }
                };
            } catch {
                return { success: false, message: 'Không tải được bộ lọc từ file JSON' };
            }
        }
    },

    services: {
        getAll: async () => {
            try {
                const res = await fetch(`${API.baseURL}service-controller.php?action=getAll`);
                if (!res.ok) throw new Error();
                const result = await res.json();
                if (!result.success) throw new Error();
                return result;
            } catch {
                const sd = await STATIC_DATA_PROMISE;
                return { success: true, data: sd.services || [] };
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
                if (!res.ok) throw new Error('HTTP ' + res.status);
                return await res.json();
            } catch (err) {
                // Local: throw để caller hiện lỗi thật
                // Static: trả về demo success
                if (IS_LOCAL) throw err;
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
