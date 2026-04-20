window.STATIC_DATA_PROMISE = (async function() {
    try {
        // Wait for DVQTKrud to be ready (max 3s)
        let retry = 0;
        while (typeof window.DVQTKrud === 'undefined' && retry < 30) {
            await new Promise(res => setTimeout(res, 100));
            retry++;
        }
        
        if (typeof window.DVQTKrud === 'undefined') {
            throw new Error('DVQTKrud library not found after timeout.');
        }

        // 1. Fetch live vehicle data from Database table 'xethue' (Limit 1000)
        console.log("[Antigravity-Debug] Fetching cars from table 'xethue'...");
        let dbCars = [];
        try {
            dbCars = await DVQTKrud.listTable('xethue', { limit: 1000 }) || [];
        } catch (err) {
            console.error("[Antigravity-Debug] Error fetching 'xethue':", err);
        }
        
        // 2. Fetch services from table 'dichvu_thuexe'
        let dbServicesRaw = [];
        try {
            console.log("[Antigravity-Debug] Fetching services from table 'dichvu_thuexe'...");
            dbServicesRaw = await DVQTKrud.listTable('dichvu_thuexe', { limit: 1000 }) || [];
        } catch (err) {
            console.warn("[Antigravity-Debug] Table 'dichvu_thuexe' not found. Using default.");
        }

        // Chuyển đổi tên cột từ database sang tên field giao diện dùng
        const services = dbServicesRaw.map(s => ({
            id: s.id,
            name: s.tendichvu,
            icon: s.icon || 'circle-check',
            unit: s.donvi || 'chuyến',
            price: Number(s.gia),
            description: s.mota || ''
        }));

        console.log(`[Antigravity-Debug] Loaded ${dbCars.length} cars from xethue.`);
        
        const filterOptions = {
            "brands": [...new Set(dbCars.map(c => (c.tenxe || '').split(' ')[0]).filter(Boolean))], // Tự động lấy các hãng xe có trong DB
            "seats": [4, 5, 7],
            "prices": { "min": 500000, "max": 5000000 }
        };

        if (!dbCars || !dbCars.length) {
            return { car_types: [], cars: [], services, filterOptions };
        }

        const car_types = [];
        const cars = [];
        const typeMap = {};

        dbCars.forEach(row => {
            // Chỉ lấy xe đang hoạt động (cho phép 여러 trạng thái kích hoạt)
            const st = row.trangthai ? String(row.trangthai).toLowerCase() : 'available';
            if(row.trangthai_ncc && ['0', 'banned', 'inactive'].includes(String(row.trangthai_ncc).toLowerCase())) return;
            if(!['available', 'active', '1', 'hoat_dong', 'đã duyệt', 'đang cho thuê'].includes(st)) return;
            if(!row.tenxe) return; // Bỏ qua nếu xe không có tên

            const typeKey = row.tenxe;
            const carBrand = typeKey.split(' ')[0] || 'Khác';
            
            if (!typeMap[typeKey]) {
                const typeId = car_types.length + 1;
                typeMap[typeKey] = typeId;
                car_types.push({
                    id: typeId,
                    name: typeKey,
                    brand: carBrand, 
                    model: typeKey,
                    year: Number(row.namsanxuat) || 0,
                    car_type: row.loaixe || 'Xe đời mới',
                    seats: Number(row.socho) || 5,
                    transmission: row.hopso || 'Tự động',
                    fuel_type: row.nhienlieu || 'Xăng',
                    price_per_day: Number(row.giathue) || 0,
                    main_image: row.anhdaidien,
                    description: (row.loaixe || 'Xe') + " sang trọng và tiện nghi.",
                    images: { 
                        front: row.anhdaidien, 
                        back: row.anhsau,
                        left: row.anhtrai,
                        right: row.anhphai,
                        interior: row.anhnoithat
                    } 
                });
            }

            const typeId = typeMap[typeKey];
            cars.push({
                id: Number(row.id),
                type_id: typeId,
                license_plate: row.bienso || '',
                manufacture_year: Number(row.namsanxuat) || 0,
                status: 'available',
                provider_id: row.provider_id,
                price_per_day: Number(row.giathue) || 0,
                brand: carBrand,
                seats: Number(row.socho) || 5,
                main_image: row.anhdaidien,
                color: row.mausac || '',
                odo: Number(row.odo) || 0
            });
        });

        return { car_types, cars, services, filterOptions };

    } catch (e) {
        console.error("Static Data Error:", e);
        return { car_types: [], cars: [], services: [], filterOptions: {} };
    }
})();
