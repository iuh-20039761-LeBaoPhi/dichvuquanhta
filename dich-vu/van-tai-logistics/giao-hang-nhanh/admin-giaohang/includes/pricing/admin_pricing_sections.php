<?php
// Render các bảng tóm tắt trong từng tab bảng giá. File này được include từ public/admin_pricing.php và dùng biến đã chuẩn bị ở file chính.
?>
                <div class="pricing-grid">
                    <section class="pricing-card" id="section-vung">
                        <div class="pricing-card__head">
                            <div>
                                <h3>Bảng giá dịch vụ chính</h3>
                                <div class="pricing-section-meta">
                                    <p class="pricing-section-meta__item"><span>Chỉnh gì</span>Giá cố định của 3 gói
                                        theo vùng giao hàng.</p>
                                    <p class="pricing-section-meta__item"><span>Ảnh hưởng tới đâu</span>Cước nền của
                                        Tiêu chuẩn, Nhanh và Hỏa tốc.</p>
                                </div>
                                <div class="pricing-section-status">
                                    <span><i class="fa-solid fa-table-list"></i> <?php echo $serviceCount; ?> gói</span>
                                    <span><i class="fa-solid fa-database"></i> <?php echo $pricingStatusLabel; ?></span>
                                </div>
                            </div>
                            <div class="pricing-card__actions">
                            </div>
                        </div>
                        <div class="pricing-card__body" id="section-vung-details">
                            <div class="pricing-table-wrap">
                                <table class="pricing-table pricing-summary-table pricing-table--services">
                                    <thead>
                                        <tr>
                                            <th>Dịch vụ</th>
                                            <th>Tên hiển thị</th>
                                            <th><?php echo htmlspecialchars($regionLabels['cung_quan'], ENT_QUOTES, 'UTF-8'); ?>
                                            </th>
                                            <th><?php echo htmlspecialchars($regionLabels['noi_thanh'], ENT_QUOTES, 'UTF-8'); ?>
                                            </th>
                                            <th><?php echo htmlspecialchars($regionLabels['lien_tinh'], ENT_QUOTES, 'UTF-8'); ?>
                                            </th>
                                            <th>Giá bước tiếp</th>
                                            <th>Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach ($scheduledServiceMeta as $serviceKey => $serviceLabel): ?>
                                            <?php $config = $serviceConfigs[$serviceKey] ?? []; ?>
                                            <?php $base = $config['coban'] ?? []; ?>
                                            <tr data-pricing-row="service"
                                                data-row-key="<?php echo htmlspecialchars($serviceKey, ENT_QUOTES, 'UTF-8'); ?>">
                                                <td><strong><?php echo htmlspecialchars($serviceKey, ENT_QUOTES, 'UTF-8'); ?></strong>
                                                </td>
                                                <td><?php echo htmlspecialchars((string) ($config['ten'] ?? $serviceLabel), ENT_QUOTES, 'UTF-8'); ?>
                                                </td>
                                                <td><span
                                                        class="pricing-value"><?php echo htmlspecialchars(format_money_preview($base['cungquan'] ?? 0), ENT_QUOTES, 'UTF-8'); ?></span>
                                                </td>
                                                <td><span
                                                        class="pricing-value"><?php echo htmlspecialchars(format_money_preview($base['khacquan'] ?? 0), ENT_QUOTES, 'UTF-8'); ?></span>
                                                </td>
                                                <td><span
                                                        class="pricing-value"><?php echo htmlspecialchars(format_money_preview($base['lientinh'] ?? 0), ENT_QUOTES, 'UTF-8'); ?></span>
                                                </td>
                                                <td><span
                                                        class="pricing-value"><?php echo htmlspecialchars(format_money_preview($config['buoctiep'] ?? 0), ENT_QUOTES, 'UTF-8'); ?></span>
                                                </td>
                                                <td><button type="button" class="pricing-action-btn"
                                                        data-open-modal="modal-edit-service-<?php echo htmlspecialchars($serviceKey, ENT_QUOTES, 'UTF-8'); ?>"><i
                                                            class="fa-solid fa-pen"></i> Sửa</button></td>
                                            </tr>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    <section class="pricing-card" id="section-instant">
                        <div class="pricing-card__head">
                            <div>
                                <h3>Cấu hình Giao ngay</h3>
                                <div class="pricing-section-meta">
                                    <p class="pricing-section-meta__item"><span>Chỉnh gì</span>Đơn giá gần, ngưỡng xa và
                                        đơn giá xa của xe máy.</p>
                                    <p class="pricing-section-meta__item"><span>Ảnh hưởng tới đâu</span>Phần cước vận
                                        chuyển chính của dịch vụ Giao ngay.</p>
                                </div>
                                <div class="pricing-section-status">
                                    <span><i class="fa-solid fa-table-list"></i> 1 cấu hình</span>
                                    <span><i class="fa-solid fa-database"></i> <?php echo $pricingStatusLabel; ?></span>
                                </div>
                            </div>
                            <div class="pricing-card__actions">
                            </div>
                        </div>
                        <div class="pricing-card__body" id="section-instant-details">
                            <p class="pricing-section__hint pricing-section__hint--inline">
                                Cước = <strong>max(phí tối thiểu, km × đơn giá × hệ số xăng)</strong>.
                            </p>
                            <div class="pricing-table-wrap">
                                <table class="pricing-table pricing-summary-table">
                                    <thead>
                                        <tr>
                                            <th>Tên hiển thị</th>
                                            <th>Đơn giá gần</th>
                                            <th>Ngưỡng xa</th>
                                            <th>Đơn giá xa</th>
                                            <th>Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr data-pricing-row="instant">
                                            <td><?php echo htmlspecialchars((string) ($instantConfig['ten'] ?? $serviceMeta[$instantServiceKey]), ENT_QUOTES, 'UTF-8'); ?>
                                            </td>
                                            <td><span
                                                    class="pricing-value"><?php echo htmlspecialchars(format_money_preview($instantNearPrice), ENT_QUOTES, 'UTF-8'); ?></span>
                                            </td>
                                            <td><?php echo htmlspecialchars((string) $instantFarThreshold, ENT_QUOTES, 'UTF-8'); ?>
                                                km</td>
                                            <td><span
                                                    class="pricing-value"><?php echo htmlspecialchars(format_money_preview($instantFarPrice), ENT_QUOTES, 'UTF-8'); ?></span>
                                            </td>
                                            <td><button type="button" class="pricing-action-btn"
                                                    data-open-modal="modal-edit-instant"><i class="fa-solid fa-pen"></i>
                                                    Sửa</button></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    <section class="pricing-card" id="section-service-fee">
                        <div class="pricing-card__head">
                            <div>
                                <h3>Phụ phí dịch vụ</h3>
                                <div class="pricing-section-meta">
                                    <p class="pricing-section-meta__item"><span>Chỉnh gì</span>Phí cố định và hệ số theo
                                        khung giờ, điều kiện giao.</p>
                                    <p class="pricing-section-meta__item"><span>Ảnh hưởng tới đâu</span>Phần phụ phí
                                        cộng thêm vào cước vận chuyển.</p>
                                </div>
                                <div class="pricing-section-status">
                                    <span><i class="fa-solid fa-table-list"></i>
                                        <?php echo $serviceTimeCount + $weatherCount; ?> phụ phí</span>
                                    <span><i class="fa-solid fa-database"></i> <?php echo $pricingStatusLabel; ?></span>
                                </div>
                            </div>
                            <div class="pricing-card__actions">
                            </div>
                        </div>
                        <div class="pricing-card__body" id="section-service-fee-details">
                            <div class="pricing-summary-group">
                                <div class="pricing-summary-group__head">
                                    <h4>Khung giờ</h4>
                                    <span><?php echo count((array) ($serviceFeeConfig['thoigian'] ?? [])); ?> mục</span>
                                    <button type="button" class="pricing-action-btn"
                                        data-open-modal="modal-add-service-time"><i class="fa-solid fa-plus"></i> Thêm</button>
                                </div>
                                <div class="pricing-table-wrap">
                                    <table class="pricing-table pricing-summary-table pricing-table--service-fees">
                                        <thead>
                                            <tr>
                                                <th>Tên</th>
                                                <th>Bắt đầu</th>
                                                <th>Kết thúc</th>
                                                <th>Phí cố định</th>
                                                <th>Hệ số</th>
                                                <th>Hành động</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php foreach (($serviceFeeConfig['thoigian'] ?? []) as $timeKey => $timeConfig): ?>
                                                <tr data-pricing-row="service-time"
                                                    data-row-key="<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>">
                                                    <td><?php echo htmlspecialchars((string) ($timeConfig['ten'] ?? $timeKey), ENT_QUOTES, 'UTF-8'); ?>
                                                    </td>
                                                    <td><?php echo htmlspecialchars((string) ($timeConfig['batdau'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>
                                                    </td>
                                                    <td><?php echo htmlspecialchars((string) ($timeConfig['ketthuc'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>
                                                    </td>
                                                    <td><span
                                                            class="pricing-value"><?php echo htmlspecialchars(format_money_preview($timeConfig['phicodinh'] ?? 0), ENT_QUOTES, 'UTF-8'); ?></span>
                                                    </td>
                                                    <td><?php echo htmlspecialchars((string) ($timeConfig['heso'] ?? 1), ENT_QUOTES, 'UTF-8'); ?>
                                                    </td>
                                                    <td><button type="button" class="pricing-action-btn"
                                                            data-open-modal="modal-edit-time-<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>"><i
                                                                class="fa-solid fa-pen"></i> Sửa</button></td>
                                                </tr>
                                            <?php endforeach; ?>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div class="pricing-summary-group">
                                <div class="pricing-summary-group__head">
                                    <h4>Điều kiện giao</h4>
                                    <span><?php echo count((array) ($serviceFeeConfig['thoitiet'] ?? [])); ?> mục</span>
                                    <button type="button" class="pricing-action-btn"
                                        data-open-modal="modal-add-weather"><i class="fa-solid fa-plus"></i> Thêm</button>
                                </div>
                                <div class="pricing-table-wrap">
                                    <table class="pricing-table pricing-summary-table pricing-table--service-fees">
                                        <thead>
                                            <tr>
                                                <th>Tên</th>
                                                <th>Phí cố định</th>
                                                <th>Hệ số</th>
                                                <th>Hành động</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php foreach (($serviceFeeConfig['thoitiet'] ?? []) as $weatherKey => $weatherConfig): ?>
                                                <tr data-pricing-row="weather"
                                                    data-row-key="<?php echo htmlspecialchars($weatherKey, ENT_QUOTES, 'UTF-8'); ?>">
                                                    <td><?php echo htmlspecialchars((string) ($weatherConfig['ten'] ?? $weatherKey), ENT_QUOTES, 'UTF-8'); ?>
                                                    </td>
                                                    <td><span
                                                            class="pricing-value"><?php echo htmlspecialchars(format_money_preview($weatherConfig['phicodinh'] ?? 0), ENT_QUOTES, 'UTF-8'); ?></span>
                                                    </td>
                                                    <td><?php echo htmlspecialchars((string) ($weatherConfig['heso'] ?? 1), ENT_QUOTES, 'UTF-8'); ?>
                                                    </td>
                                                    <td><button type="button" class="pricing-action-btn"
                                                            data-open-modal="modal-edit-weather-<?php echo htmlspecialchars($weatherKey, ENT_QUOTES, 'UTF-8'); ?>"><i
                                                                class="fa-solid fa-pen"></i> Sửa</button></td>
                                                </tr>
                                            <?php endforeach; ?>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section class="pricing-card" id="section-cod">
                        <div class="pricing-card__head">
                            <div>
                                <h3>COD / bảo hiểm</h3>
                                <div class="pricing-section-meta">
                                    <p class="pricing-section-meta__item"><span>Chỉnh gì</span>Ngưỡng miễn phí, tỷ lệ và
                                        mức tối thiểu cho COD, bảo hiểm.</p>
                                    <p class="pricing-section-meta__item"><span>Ảnh hưởng tới đâu</span>Các khoản thu hộ
                                        và bảo hiểm trong breakdown đơn hàng.</p>
                                </div>
                                <div class="pricing-section-status">
                                    <span><i class="fa-solid fa-table-list"></i> 2 cấu hình</span>
                                    <span><i class="fa-solid fa-database"></i> <?php echo $pricingStatusLabel; ?></span>
                                </div>
                            </div>
                            <div class="pricing-card__actions">
                                <button type="button" class="btn-secondary pricing-open-btn"
                                    data-open-modal="modal-edit-cod"><i class="fa-solid fa-pen-to-square"></i> Chỉnh chi
                                    tiết</button>
                            </div>
                        </div>
                        <div class="pricing-card__body" id="section-cod-details">
                            <p class="pricing-section__hint pricing-section__hint--inline">
                                Tỷ lệ thập phân (0.012 = 1.2%).
                            </p>
                            <div class="pricing-table-wrap">
                                <table class="pricing-table pricing-summary-table">
                                    <thead>
                                        <tr>
                                            <th>Loại</th>
                                            <th>Ngưỡng miễn phí</th>
                                            <th>Tỷ lệ</th>
                                            <th>Tối thiểu</th>
                                            <th>Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr data-pricing-row="cod" data-row-key="thuho">
                                            <td>COD</td>
                                            <td><span
                                                    class="pricing-value"><?php echo htmlspecialchars(format_money_preview(($codInsuranceConfig['thuho']['nguong'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?></span>
                                            </td>
                                            <td><?php echo htmlspecialchars(number_format(((float) ($codInsuranceConfig['thuho']['kieu'] ?? 0)) * 100, 2), ENT_QUOTES, 'UTF-8'); ?>%
                                            </td>
                                            <td><span
                                                    class="pricing-value"><?php echo htmlspecialchars(format_money_preview(($codInsuranceConfig['thuho']['toithieu'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?></span>
                                            </td>
                                            <td><button type="button" class="pricing-action-btn"
                                                    data-open-modal="modal-edit-cod"><i class="fa-solid fa-pen"></i>
                                                    Sửa</button></td>
                                        </tr>
                                        <tr data-pricing-row="cod" data-row-key="baohiem">
                                            <td>Bảo hiểm</td>
                                            <td><span
                                                    class="pricing-value"><?php echo htmlspecialchars(format_money_preview(($codInsuranceConfig['baohiem']['nguong'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?></span>
                                            </td>
                                            <td><?php echo htmlspecialchars(number_format(((float) ($codInsuranceConfig['baohiem']['kieu'] ?? 0)) * 100, 2), ENT_QUOTES, 'UTF-8'); ?>%
                                            </td>
                                            <td><span
                                                    class="pricing-value"><?php echo htmlspecialchars(format_money_preview(($codInsuranceConfig['baohiem']['toithieu'] ?? 0)), ENT_QUOTES, 'UTF-8'); ?></span>
                                            </td>
                                            <td><button type="button" class="pricing-action-btn"
                                                    data-open-modal="modal-edit-cod"><i class="fa-solid fa-pen"></i>
                                                    Sửa</button></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    <section class="pricing-card pricing-card--wide" id="section-vehicle">
                        <div class="pricing-card__head">
                            <div>
                                <h3>Phương tiện</h3>
                                <div class="pricing-section-meta">
                                    <p class="pricing-section-meta__item"><span>Chỉnh gì</span>Giá cơ bản, hệ số xe, phí
                                        tối thiểu và tải trọng.</p>
                                    <p class="pricing-section-meta__item"><span>Ảnh hưởng tới đâu</span>Giá theo phương
                                        tiện, nhất là xe máy và xe 4 bánh.</p>
                                </div>
                                <div class="pricing-section-status">
                                    <span><i class="fa-solid fa-table-list"></i> <?php echo $vehicleCount; ?> phương
                                        tiện</span>
                                    <span><i class="fa-solid fa-database"></i> <?php echo $pricingStatusLabel; ?></span>
                                </div>
                            </div>
                            <div class="pricing-card__actions">
                                <button type="button" class="btn-secondary pricing-open-btn"
                                    data-open-modal="modal-add-vehicle"><i class="fa-solid fa-plus"></i> Thêm phương
                                    tiện mới</button>
                            </div>
                        </div>
                        <div class="pricing-card__body" id="section-vehicle-details">
                            <div class="pricing-table-wrap">
                                <table class="pricing-table pricing-summary-table pricing-table--vehicles">
                                    <thead>
                                        <tr>
                                            <th>Phương tiện</th>
                                            <th class="text-right">Tải trọng tối đa</th>
                                            <th class="text-right">Đơn giá/km</th>
                                            <th class="text-right">Phí tối thiểu</th>
                                            <th class="text-center">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach ($vehicleConfigs as $vehicleIndex => $vehicle): ?>
                                            <?php
                                            $vKey = $vehicle['key'] ?? '';
                                            $donGiaKm = round((float) ($vehicle['gia_co_ban'] ?? 0) * (float) ($vehicle['he_so_xe'] ?? 1));
                                            ?>
                                            <tr data-pricing-row="vehicle"
                                                data-row-key="<?php echo htmlspecialchars((string) $vKey, ENT_QUOTES, 'UTF-8'); ?>">
                                                <td>
                                                    <div class="vehicle-info">
                                                        <div class="vehicle-icon">
                                                            <i class="fa-solid <?php echo get_vehicle_icon($vKey); ?>"></i>
                                                        </div>
                                                        <div class="vehicle-detail">
                                                            <span class="vehicle-name"
                                                                data-cell="label"><?php echo htmlspecialchars((string) ($vehicle['label'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></span>
                                                            <span class="pricing-tag"
                                                                data-cell="key"><?php echo htmlspecialchars((string) $vKey, ENT_QUOTES, 'UTF-8'); ?></span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td class="text-right"><strong
                                                        data-cell="weight"><?php echo htmlspecialchars((string) ($vehicle['trong_luong_toi_da'] ?? 0), ENT_QUOTES, 'UTF-8'); ?></strong>
                                                    <small class="text-muted">kg</small></td>
                                                <td class="text-right"><span class="pricing-value" data-cell="per-km"
                                                        style="font-weight:700; color:#0a2a66;"><?php echo htmlspecialchars(format_money_preview($donGiaKm), ENT_QUOTES, 'UTF-8'); ?></span>
                                                </td>
                                                <td class="text-right"><span class="pricing-value"
                                                        data-cell="min-fee"><?php echo htmlspecialchars(format_money_preview($vehicle['phi_toi_thieu'] ?? 0), ENT_QUOTES, 'UTF-8'); ?></span>
                                                </td>
                                                <td class="text-center"><button type="button" class="pricing-action-btn"
                                                        data-open-modal="modal-edit-vehicle-<?php echo htmlspecialchars((string) ($vKey ?: $vehicleIndex), ENT_QUOTES, 'UTF-8'); ?>"><i
                                                            class="fa-solid fa-pen"></i> Sửa</button></td>
                                            </tr>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    <section class="pricing-card" id="section-goods">
                        <div class="pricing-card__head">
                            <div>
                                <h3>Phụ phí loại hàng</h3>
                                <div class="pricing-section-meta">
                                    <p class="pricing-section-meta__item"><span>Chỉnh gì</span>Phụ phí, hệ số và mô tả
                                        của từng loại hàng.</p>
                                    <p class="pricing-section-meta__item"><span>Ảnh hưởng tới đâu</span>Khoản cộng thêm
                                        theo loại hàng trong breakdown cước.</p>
                                </div>
                                <div class="pricing-section-status">
                                    <span><i class="fa-solid fa-table-list"></i> <?php echo $goodsCount; ?> loại
                                        hàng</span>
                                    <span><i class="fa-solid fa-database"></i> <?php echo $pricingStatusLabel; ?></span>
                                </div>
                            </div>
                            <div class="pricing-card__actions">
                                <button type="button" class="btn-secondary pricing-open-btn"
                                    data-open-modal="modal-add-goods"><i class="fa-solid fa-plus"></i> Thêm loại hàng
                                    mới</button>
                            </div>
                        </div>
                        <div class="pricing-card__body" id="section-goods-details">
                            <p class="pricing-section__hint pricing-section__hint--inline">
                                Hệ số lớn hơn <strong>1</strong> sẽ cộng thêm theo phần trăm trên cước vận chuyển chính.
                            </p>
                            <div class="pricing-table-wrap">
                                <table class="pricing-table pricing-summary-table pricing-table--goods">
                                    <thead>
                                        <tr>
                                            <th>Mã</th>
                                            <th>Tên hiển thị</th>
                                            <th>Phụ phí</th>
                                            <th>Hệ số</th>
                                            <th>Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <?php foreach ($goodsFees as $goodsKey => $goodsFee): ?>
                                            <tr data-pricing-row="goods"
                                                data-row-key="<?php echo htmlspecialchars((string) $goodsKey, ENT_QUOTES, 'UTF-8'); ?>">
                                                <td><strong><?php echo htmlspecialchars((string) $goodsKey, ENT_QUOTES, 'UTF-8'); ?></strong>
                                                </td>
                                                <td><?php echo htmlspecialchars((string) ($goodsLabels[$goodsKey] ?? $goodsKey), ENT_QUOTES, 'UTF-8'); ?>
                                                </td>
                                                <td><span
                                                        class="pricing-value"><?php echo htmlspecialchars(format_money_preview($goodsFee), ENT_QUOTES, 'UTF-8'); ?></span>
                                                </td>
                                                <td><?php echo htmlspecialchars((string) ($goodsMultipliers[$goodsKey] ?? 1), ENT_QUOTES, 'UTF-8'); ?>
                                                </td>

                                                <td><button type="button" class="pricing-action-btn"
                                                        data-open-modal="modal-edit-goods-<?php echo htmlspecialchars((string) $goodsKey, ENT_QUOTES, 'UTF-8'); ?>"><i
                                                            class="fa-solid fa-pen"></i> Sửa</button></td>
                                            </tr>
                                        <?php endforeach; ?>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>
                </div>
