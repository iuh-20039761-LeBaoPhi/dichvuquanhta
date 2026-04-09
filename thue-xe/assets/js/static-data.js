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
        
        // 2. Fetch car types from table 'loai_xe'
        let dbCarTypes = [];
        try {
            console.log("[Antigravity-Debug] Fetching types from table 'loai_xe'...");
            dbCarTypes = await DVQTKrud.listTable('loai_xe', { limit: 1000 }) || [];
        } catch (err) {
            console.warn("[Antigravity-Debug] Optional table 'loai_xe' not found or error. Using empty.");
        }

        // 3. Fetch services from table 'dichvu_thuexe'
        let dbServicesRaw = [];
        try {
            console.log("[Antigravity-Debug] Fetching services from table 'dichvu_thuexe'...");
            dbServicesRaw = await DVQTKrud.listTable('dichvu_thuexe', { limit: 1000 }) || [];
        } catch (err) {
            console.warn("[Antigravity-Debug] Optional table 'dichvu_thuexe' not found. Using empty.");
        }

        const dbServices = dbServicesRaw.length ? dbServicesRaw : [
            { "id": 1, "name": "Giao xe tận nơi", "icon": "map-marker-alt", "unit": "chuyến", "price": 100000, "description": "Giao xe đến tận địa chỉ của bạn trong nội thành." },
            { "id": 2, "name": "Bảo hiểm mở rộng", "icon": "shield-alt", "unit": "ngày", "price": 150000, "description": "Gói bảo hiểm toàn diện bảo vệ xe và người lái." },
            { "id": 3, "name": "Xe có tài xế", "icon": "user-tie", "unit": "ngày", "price": 300000, "description": "Tài xế chuyên nghiệp phục vụ nhiệt tình." }
        ];

        console.log(`[Antigravity-Debug] Loaded ${dbCars.length} cars, ${dbCarTypes.length} types, ${dbServices.length} services.`);
        
        // 2. Auxiliary Metadata (Hardcoded for now to replace JSON entirely)
        const services = [
            { "id": 1, "name": "Giao xe tận nơi", "icon": "map-marker-alt", "unit": "chuyến", "price": 100000, "description": "Giao xe đến tận địa chỉ của bạn trong nội thành." },
            { "id": 2, "name": "Bảo hiểm mở rộng", "icon": "shield-alt", "unit": "ngày", "price": 150000, "description": "Gói bảo hiểm toàn diện bảo vệ xe và người lái." },
            { "id": 3, "name": "Xe có tài xế", "icon": "user-tie", "unit": "ngày", "price": 300000, "description": "Tài xế chuyên nghiệp phục vụ nhiệt tình." },
            { "id": 4, "name": "GPS định vị", "icon": "map-marker-alt", "unit": "chuyến", "price": 50000, "description": "Thiết bị dẫn đường chính xác." },
            { "id": 5, "name": "Ghế trẻ em", "icon": "baby", "unit": "chuyến", "price": 100000, "description": "Ghế an toàn cho bé đạt chuẩn quốc tế." },
            { "id": 6, "name": "WiFi di động", "icon": "wifi", "unit": "chuyến", "price": 80000, "description": "Bộ phát WiFi tốc độ cao suốt chuyến đi." }
        ];

        const filterOptions = {
            "brands": ["Toyota", "Honda", "Hyundai", "Ford", "Mitsubishi", "VinFast", "Mazda", "Suzuki"],
            "seats": [5, 7],
            "prices": { "min": 500000, "max": 3000000 }
        };

        if (!dbCars || !dbCars.length) {
            return { car_types: [], cars: [], services, filterOptions };
        }

        // 3. Transform flat database rows into nested car_types and cars structure
        const car_types = [];
        const cars = [];
        const typeMap = {};

        dbCars.forEach(row => {
            const typeKey = `${row.tenxe}_${row.giathue}`;
            
            if (!typeMap[typeKey]) {
                const typeId = car_types.length + 1;
                typeMap[typeKey] = typeId;
                car_types.push({
                    id: typeId,
                    name: row.tenxe,
                    brand: row.hangxe,
                    model: row.dongxe,
                    year: Number(row.namsanxuat),
                    car_type: row.loaixe,
                    seats: Number(row.socho),
                    transmission: row.hopso,
                    fuel_type: row.nhienlieu,
                    price_per_day: Number(row.giathue),
                    main_image: row.anhdaidien,
                    video_url: row.videourl,
                    description: row.mota,
                    features: row.features,
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
            const carImages = {
                front: row.anhdaidien,
                back: row.anhsau,
                left: row.anhtrai,
                right: row.anhphai,
                interior: row.anhnoithat
            };

            cars.push({
                id: Number(row.id),
                type_id: typeId,
                license_plate: row.bienso,
                manufacture_year: Number(row.namsanxuat),
                mileage: Number(row.odo),
                color: row.mausac,
                status: row.trangthai || 'available',
                frame_number: row.sokhung,
                engine_number: row.somay,
                provider_id: row.provider_id,
                images: carImages
            });
        });

        return { car_types, cars, services, filterOptions };

    } catch (e) {
        console.error("Static Data Error:", e);
        return { car_types: [], cars: [], services: [], filterOptions: {} };
    }
})();
