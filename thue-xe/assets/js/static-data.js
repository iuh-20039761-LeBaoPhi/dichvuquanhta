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
            "brands": [...new Set(dbCars.map(c => c.tenxe.split(' ')[0]))], // Tự động lấy các hãng xe có trong DB
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
            // Chỉ lấy xe đã được duyệt
            if(row.trangthai !== 'approved') return;

            const typeKey = row.tenxe;
            
            if (!typeMap[typeKey]) {
                const typeId = car_types.length + 1;
                typeMap[typeKey] = typeId;
                car_types.push({
                    id: typeId,
                    name: row.tenxe,
                    brand: row.tenxe.split(' ')[0], // Tách hãng từ tên xe
                    model: row.tenxe,
                    year: Number(row.namsanxuat),
                    car_type: row.loaixe,
                    seats: Number(row.socho),
                    transmission: row.hopso,
                    fuel_type: row.nhienlieu,
                    price_per_day: Number(row.giathue),
                    main_image: row.anhdaidien,
                    description: row.loaixe + " sang trọng và tiện nghi.",
                    images: { 
                        front: row.anhdaidien, // Dùng ảnh đại diện làm mặt trước
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
                license_plate: row.bienso,
                manufacture_year: Number(row.namsanxuat),
                status: 'available',
                provider_id: row.provider_id,
                price_per_day: Number(row.giathue), // Thêm để tương thích search
                brand: row.tenxe.split(' ')[0],
                seats: Number(row.socho),
                main_image: row.anhdaidien
            });
        });

        return { car_types, cars, services, filterOptions };

    } catch (e) {
        console.error("Static Data Error:", e);
        return { car_types: [], cars: [], services: [], filterOptions: {} };
    }
})();
