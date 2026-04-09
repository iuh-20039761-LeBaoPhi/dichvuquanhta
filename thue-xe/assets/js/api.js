// true chỉ khi chạy trên XAMPP (port 80), không phải Live Server (5500/5501)
const IS_LOCAL = ['localhost', '127.0.0.1'].includes(window.location.hostname)
    && (window.location.port === '' || window.location.port === '80');

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
    // Không còn dùng baseURL controllers/ vì đã chuyển hẳn sang JS
    cars: {
        getFeatured: async () => {
            const sd = await STATIC_DATA_PROMISE;
            return { success: true, data: (sd.cars || []).slice(0, 6) };
        },
        getAll: async () => {
            const sd = await STATIC_DATA_PROMISE;
            return { success: true, data: sd.cars || [] };
        },
        getById: async (id) => {
            const sd = await STATIC_DATA_PROMISE;
            const targetId = parseInt(id, 10);
            const car = (sd.cars || []).find(c => c.id === targetId);
            if (!car) return { success: false, message: 'Không tìm thấy xe' };

            const carType = (sd.car_types || []).find(t => t.id === car.type_id) || {};
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
        },
        search: async (params) => {
            const allCars = await getMergedStaticCars();
            let cars = allCars.filter(c => c.status === 'available');

            const brand = (params?.brand || '').trim().toLowerCase();
            const seats = params?.seats;
            const price = (params?.price || '').trim();

            if (brand) cars = cars.filter(c => String(c.brand || '').trim().toLowerCase() === brand);
            if (seats) {
                const seatNum = Number(seats);
                cars = cars.filter(c => Number(c.seats) === seatNum);
            }
            if (price) {
                if (price.includes('-')) {
                    const [min, max] = price.split('-').map(Number);
                    cars = cars.filter(c => {
                        const p = Number(c.price_per_day);
                        return p >= min && p <= max;
                    });
                } else {
                    const min = Number(price);
                    cars = cars.filter(c => Number(c.price_per_day) >= min);
                }
            }
            return { success: true, data: cars };
        },
        getFilterOptions: async () => {
            const allCars = await getMergedStaticCars();
            const cars = allCars.filter(c => c.status === 'available');
            const brands = [...new Set(cars.map(c => String(c.brand || '').trim()).filter(Boolean))].sort();
            const seats = [...new Set(cars.map(c => Number(c.seats)).filter(Number.isFinite))].sort((a,b)=>a-b);
            const prices = cars.map(c => Number(c.price_per_day)).filter(Number.isFinite);
            return {
                success: true,
                brands,
                seats,
                prices: {
                    min: prices.length ? Math.min(...prices) : 0,
                    max: prices.length ? Math.max(...prices) : 0
                }
            };
        }
    },

    services: {
        getAll: async () => {
            const sd = await STATIC_DATA_PROMISE;
            return { success: true, data: sd.services || [] };
        }
    },

    bookings: {
        create: async (data) => {
            // Sử dụng trực tiếp DVQTKrud để tạo đơn hàng (Không qua PHP)
            try {
                // Đảm bảo dữ liệu khách hàng được ánh xạ đúng vào các trường mới
                const payload = {
                    ...data,
                    tenkhachhang: data.customer_name || data.tenkhachhang,
                    sdtkhachhang: data.customer_phone || data.sdtkhachhang,
                    emailkhachhang: data.customer_email || data.emailkhachhang,
                    diachikhachhang: data.customer_address || data.diachikhachhang,
                    ngaydat: new Date().toISOString().slice(0, 19).replace('T', ' '),
                    created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
                };
                const res = await DVQTKrud.insertRow('datlich_thuexe', payload);
                return { success: !!res, id: res?.id };
            } catch (err) {
                return { success: false, message: err.message };
            }
        },
        getById: async (id) => {
            try {
                // Lấy đơn hàng trực tiếp từ table datlich_thuexe qua JS
                const result = await DVQTKrud.listTable('datlich_thuexe', { 
                    filter: `id=${id}`,
                    limit: 1 
                });
                return { success: !!result.length, data: result[0] };
            } catch {
                return { success: false };
            }
        }
    }
};
