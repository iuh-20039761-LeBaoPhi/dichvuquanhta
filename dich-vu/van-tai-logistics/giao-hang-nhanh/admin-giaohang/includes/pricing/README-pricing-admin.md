# Admin Giao Hang Nhanh - Bang Gia

Muc tieu: giu KRUD la nguon chinh, pricing-data.json chi la cache/export cho public calculator.

## Luong file
- `public/admin_guide.php`: tai lieu van hanh admin, co muc rieng giai thich Bang gia va Du lieu gia cho nguoi quan tri.
- `public/admin_pricing.php`: bootstrap session, nap pricing data, tinh bien view, include cac partial render.
- `public/pricing_support.php`: man hinh phu tro cho thanh pho/quan huyen va nhan vung. UI phien ban bang gia da an khoi admin.
- `includes/pricing/admin_pricing_sections.php`: render cac bang tom tat trong tung tab. Cac `data-open-modal` o day phai khop `data-modal` trong file modal.
- `includes/pricing/admin_pricing_modals.php`: render modal them/sua/xoa. Cac `name="action"` phai khop dispatcher trong `admin_pricing_logic.php` va handler JS trong `admin-pricing-krud.js`.
- `includes/pricing/admin_pricing_logic.php`: doc pricing data, validate POST fallback, va build bien cho view.
- `lib/pricing_config_service.php`: doc/ghi cau truc pricing tu KRUD va build JSON export.
- `api/pricing_export.php`: ghi `public/data/pricing-data.json`. Uu tien snapshot tu request de export nhanh, fallback doc KRUD theo versionId.
- `public/assets/js/admin-pricing-krud.js`: xu ly submit form, sync KRUD, export JSON, patch DOM, modal/tab UI.
- `public/assets/js/admin-pricing-krud-client.js`: adapter cho cac global KRUD (`crud`, `krud`, `krudList`) va helper batch/concurrency.
- `public/assets/js/admin-pricing-feedback.js`: toast/thong bao/progress dung rieng cho man hinh bang gia.
- `public/assets/js/admin-pricing-utils.js`: helper format, normalize, clone data dung chung cho JS bang gia.
- `public/assets/js/pricing-support.js`: CRUD phu tro cho `ghn_thanh_pho`, `ghn_quan_huyen`, `ghn_vung_giao_hang`; van dung active version noi bo de loc/ghi dung tap du lieu.
- `public/assets/css/admin/pricing.css`: style rieng man hinh bang gia admin.

## Diem noi quan trong
- Form action PHP/JS: `save_services`, `save_instant_service`, `add_service_time`, `save_service_time_row`, `delete_service_time`, `add_weather`, `save_weather_row`, `delete_weather`, `save_cod_insurance`, `add_vehicle`, `save_vehicle_row`, `delete_vehicle`, `add_goods_fee`, `save_goods_fee_row`, `delete_goods_fee`.
- JS action map: `ACTION_CONFIG` trong `admin-pricing-krud.js` noi action voi section can render lai va bang KRUD can sync hep.
- Modal trigger: moi `data-open-modal="..."` trong sections phai co `data-modal="..."` trong modals.
- Dong bo public: sau khi KRUD luu xong, JS goi `api/pricing_export.php`; neu export loi thi bao partial-save, khong bao mat du lieu KRUD.
- Du lieu phu tro: `pricing_support.php` chi sua cac bang theo `pricing_version_id` active. Luu KRUD xong moi export JSON; neu export loi thi hien canh bao partial-save.
- Version/pricing id: `pricing_version_id`, bang `ghn_pricing_versions`, va meta `active_pricing_version_id` van la co che noi bo. Khong xoa cac bang/field nay neu chi muon don gian UI.
- UI phien ban: card "Phien ban bang gia" da duoc bo khoi `pricing_support.php`; nguoi dung admin khong con nut kich hoat/export version cu tren giao dien.

## Khi sua tiep
- Neu them field moi: cap nhat 4 noi theo thu tu `admin_pricing_modals.php` -> `admin_pricing_logic.php` -> `admin-pricing-krud.js` -> `pricing_config_service.php`/JSON export.
- Neu them modal/nut moi: kiem tra cap `data-open-modal` va `data-modal` bang search truoc khi commit.
- Neu tach JS tiep: phan KRUD client va feedback da tach. Uu tien tiep theo la `sync/export`, `DOM patch`, `KRUD persistence`, `UI binding`.
- Neu can phuc hoi UI rollback version, bat dau tu `pricing_support.php` va cac ham `renderVersions`, `activateVersion`, `exportVersion` trong `public/assets/js/pricing-support.js`.
