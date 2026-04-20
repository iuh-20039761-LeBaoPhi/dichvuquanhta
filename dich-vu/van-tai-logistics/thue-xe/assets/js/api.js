async function getLiveCars() {
    try {
        // Lấy dữ liệu thực từ bảng xethue
        const allCars = await DVQTKrud.listTable('xethue', { limit: 1000 });
        console.log("[Antigravity-Debug] Raw cars from DB:", allCars);
        
        // Lọc: Mở rộng trạng thái để phù hợp với trạng thái mới của NCC
        const filtered = (allCars || []).filter(c => {
            if (!c.trangthai) return true;
            const st = String(c.trangthai).toLowerCase();
            // Nếu có trangthai_ncc thì kiểm tra không bị khóa
            if (c.trangthai_ncc && ['0', 'banned', 'inactive'].includes(String(c.trangthai_ncc).toLowerCase())) {
                return false;
            }
            return ['available', 'active', '1', 'hoat_dong', 'đã duyệt', 'đang cho thuê'].includes(st);
        });
        console.log("[Antigravity-Debug] Filtered cars (active/available):", filtered);
        
        return filtered;
    } catch (e) {
        console.error("Error fetching live cars:", e);
        return [];
    }
}

const API = {
    cars: {
        getFeatured: async () => {
            const cars = await getLiveCars();
            return { success: true, data: cars.slice(0, 6) };
        },
        getAll: async () => {
            const cars = await getLiveCars();
            return { success: true, data: cars };
        },
        getById: async (id) => {
            console.log("[Antigravity-Debug] Fetching car with ID:", id);
            try {
                // Lấy toàn bộ danh sách để đảm bảo không bị lỗi filter từ server
                const allCars = await getLiveCars();
                console.log("[Antigravity-Debug] Total cars found:", allCars.length);

                const car = allCars.find(c => String(c.id) == String(id));

                if (!car) {
                    console.warn("[Antigravity-Debug] Car ID not found in list:", id);
                    throw new Error('Không tìm thấy xe #' + id);
                }

                const mergedCar = {
                    ...car,
                    main_image: car.anhdaidien,
                    price_per_day: Number(car.giathue) || 0,
                    name: car.tenxe
                };

                return {
                    success: true,
                    data: { car: mergedCar, images: [] }
                };
            } catch (err) {
                console.error('[Antigravity-Debug] getById Error:', err);
                return { success: false, message: err.message };
            }
        },
        search: async (params) => {
            let cars = await getLiveCars();
            const brand = (params?.brand || '').trim().toLowerCase();
            const seats = params?.seats;
            const price = (params?.price || '').trim();

            if (brand) cars = cars.filter(c => String(c.tenxe || '').toLowerCase().includes(brand));
            if (seats) cars = cars.filter(c => Number(c.socho) === Number(seats));
            if (price) {
                const [min, max] = price.includes('-') ? price.split('-').map(Number) : [Number(price), 999999999];
                cars = cars.filter(c => {
                    const p = Number(c.giathue || 0); // Đồng bộ với cột giathue trong DB
                    return p >= min && (max ? p <= max : true);
                });
            }
            return { success: true, data: cars };
        },
        getFilterOptions: async () => {
            const cars = await getLiveCars();
            const brands = [...new Set(cars.map(c => String(c.tenxe || '').split(' ')[0]).filter(Boolean))].sort();
            const seats = [...new Set(cars.map(c => Number(c.socho)).filter(Number.isFinite))].sort((a, b) => a - b);
            const prices = cars.map(c => Number(c.giathue)).filter(Number.isFinite); // Đồng bộ cột giathue
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
            try {
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
        }
    }
};
