<?php
// Render toàn bộ modal thêm/sửa/xóa cho bảng giá. data-modal phải khớp data-open-modal trong admin_pricing_sections.php.
?>
                <div data-pricing-modal-group="section-vung">
                    <!-- Modals sửa từng gói dịch vụ chính -->
                    <?php foreach ($scheduledServiceMeta as $serviceKey => $serviceLabel): ?>
                        <?php
                        $config = $serviceConfigs[$serviceKey] ?? [];
                        $base = $config['coban'] ?? [];
                        $eta = $config['thoigian'] ?? [];
                        ?>
                        <div class="pricing-modal"
                            data-modal="modal-edit-service-<?php echo htmlspecialchars($serviceKey, ENT_QUOTES, 'UTF-8'); ?>"
                            hidden>
                            <div class="pricing-modal__backdrop" data-close-modal></div>
                            <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                                <div class="pricing-modal__head">
                                    <div>
                                        <h3>Sửa gói: <?php echo htmlspecialchars($serviceLabel, ENT_QUOTES, 'UTF-8'); ?>
                                        </h3>
                                        <p>Cập nhật giá cố định cho vùng giao hàng.</p>
                                    </div>
                                    <button type="button" class="pricing-modal__close" data-close-modal><i
                                            class="fa-solid fa-xmark"></i></button>
                                </div>
                                <div class="pricing-modal__body">
                                    <form method="post"
                                        data-confirm-message="Lưu thay đổi cho gói <?php echo htmlspecialchars($serviceLabel, ENT_QUOTES, 'UTF-8'); ?>?">
                                        <input type="hidden" name="action" value="save_services">
                                        <div class="pricing-add-grid">
                                            <div class="form-group" style="grid-column: 1 / -1;">
                                                <label>Tên hiển thị</label>
                                                <input class="admin-input" type="text"
                                                    name="services[<?php echo $serviceKey; ?>][ten]"
                                                    value="<?php echo htmlspecialchars((string) ($config['ten'] ?? $serviceLabel), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label><?php echo htmlspecialchars($regionLabels['cung_quan'], ENT_QUOTES, 'UTF-8'); ?></label>
                                                <input class="admin-input" type="number" min="0"
                                                    name="services[<?php echo $serviceKey; ?>][cungquan]"
                                                    value="<?php echo (int) ($base['cungquan'] ?? 0); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label><?php echo htmlspecialchars($regionLabels['noi_thanh'], ENT_QUOTES, 'UTF-8'); ?></label>
                                                <input class="admin-input" type="number" min="0"
                                                    name="services[<?php echo $serviceKey; ?>][khacquan]"
                                                    value="<?php echo (int) ($base['khacquan'] ?? 0); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label><?php echo htmlspecialchars($regionLabels['lien_tinh'], ENT_QUOTES, 'UTF-8'); ?></label>
                                                <input class="admin-input" type="number" min="0"
                                                    name="services[<?php echo $serviceKey; ?>][lientinh]"
                                                    value="<?php echo (int) ($base['lientinh'] ?? 0); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Giá bước tiếp</label>
                                                <input class="admin-input" type="number" min="0"
                                                    name="services[<?php echo $serviceKey; ?>][buoctiep]"
                                                    value="<?php echo (int) ($config['buoctiep'] ?? 0); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Thời gian
                                                    <?php echo htmlspecialchars($regionLabels['cung_quan'], ENT_QUOTES, 'UTF-8'); ?></label>
                                                <input class="admin-input" type="text"
                                                    name="services[<?php echo $serviceKey; ?>][thoigian][cung_quan]"
                                                    value="<?php echo htmlspecialchars((string) ($eta['cung_quan'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Thời gian
                                                    <?php echo htmlspecialchars($regionLabels['noi_thanh'], ENT_QUOTES, 'UTF-8'); ?></label>
                                                <input class="admin-input" type="text"
                                                    name="services[<?php echo $serviceKey; ?>][thoigian][noi_thanh]"
                                                    value="<?php echo htmlspecialchars((string) ($eta['noi_thanh'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Thời gian
                                                    <?php echo htmlspecialchars($regionLabels['lien_tinh'], ENT_QUOTES, 'UTF-8'); ?></label>
                                                <input class="admin-input" type="text"
                                                    name="services[<?php echo $serviceKey; ?>][thoigian][lien_tinh]"
                                                    value="<?php echo htmlspecialchars((string) ($eta['lien_tinh'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                        </div>
                                        <div class="pricing-actions">
                                            <button type="submit" class="btn-primary"><i
                                                    class="fa-solid fa-floppy-disk"></i> Lưu thay đổi</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>


                <div data-pricing-modal-group="section-instant">
                    <!-- Modal Sửa Giao ngay (Refactored) -->
                    <div class="pricing-modal" data-modal="modal-edit-instant" hidden>
                        <div class="pricing-modal__backdrop" data-close-modal></div>
                        <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                            <div class="pricing-modal__head">
                                <div>
                                    <h3>Cấu hình Giao ngay</h3>
                                    <p>Thiết lập đơn giá km cho phương tiện xe máy.</p>
                                </div>
                                <button type="button" class="pricing-modal__close" data-close-modal><i
                                        class="fa-solid fa-xmark"></i></button>
                            </div>
                            <div class="pricing-modal__body">
                                <form method="post" data-confirm-message="Lưu cấu hình dịch vụ Giao ngay?">
                                    <input type="hidden" name="action" value="save_instant_service">
                                    <div class="pricing-add-grid">
                                        <div class="form-group" style="grid-column: 1 / -1;">
                                            <label>Tên hiển thị dịch vụ</label>
                                            <input class="admin-input" type="text" name="instant_service[ten]"
                                                value="<?php echo htmlspecialchars((string) ($instantConfig['ten'] ?? $serviceMeta[$instantServiceKey] ?? 'Giao ngay'), ENT_QUOTES, 'UTF-8'); ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Đơn giá (dưới ngưỡng xa)</label>
                                            <input class="admin-input" type="number"
                                                name="instant_distance[gia_xe_may_gan]"
                                                value="<?php echo (int) $instantNearPrice; ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Ngưỡng bắt đầu giá xa (km)</label>
                                            <input class="admin-input" type="number" step="0.1"
                                                name="instant_distance[nguong_xe_may_xa]"
                                                value="<?php echo (float) $instantFarThreshold; ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Đơn giá xa (trên ngưỡng)</label>
                                            <input class="admin-input" type="number"
                                                name="instant_distance[gia_xe_may_xa]"
                                                value="<?php echo (int) $instantFarPrice; ?>">
                                        </div>
                                    </div>
                                    <div class="pricing-actions">
                                        <button type="submit" class="btn-primary"><i
                                                class="fa-solid fa-floppy-disk"></i> Lưu cấu hình</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                <div data-pricing-modal-group="section-service-fee">
                    <!-- Modal Thêm Khung giờ -->
                    <div class="pricing-modal" data-modal="modal-add-service-time" hidden>
                        <div class="pricing-modal__backdrop" data-close-modal></div>
                        <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                            <div class="pricing-modal__head">
                                <div>
                                    <h3>Thêm khung giờ mới</h3>
                                    <p>Thiết lập phí cố định/hệ số cho khoảng thời gian đặc biệt.</p>
                                </div>
                                <button type="button" class="pricing-modal__close" data-close-modal><i
                                        class="fa-solid fa-xmark"></i></button>
                            </div>
                            <div class="pricing-modal__body">
                                <form method="post" data-confirm-message="Thêm khung giờ mới?">
                                    <input type="hidden" name="action" value="add_service_time">
                                    <div class="pricing-add-grid">
                                        <div class="form-group">
                                            <label>Mã khung giờ</label>
                                            <input class="admin-input" type="text" name="new_time_key"
                                                placeholder="Ví dụ: dem" required>
                                        </div>
                                        <div class="form-group">
                                            <label>Tên hiển thị</label>
                                            <input class="admin-input" type="text" name="new_time_label"
                                                placeholder="Ví dụ: Giờ đêm" required>
                                        </div>
                                        <div class="form-group">
                                            <label>Bắt đầu công việc</label>
                                            <input class="admin-input" type="time" name="new_time_start" value="00:00"
                                                required>
                                        </div>
                                        <div class="form-group">
                                            <label>Kết thúc công việc</label>
                                            <input class="admin-input" type="time" name="new_time_end" value="23:59"
                                                required>
                                        </div>
                                        <div class="form-group">
                                            <label>Phí cố định cộng thêm</label>
                                            <input class="admin-input" type="number" step="1000"
                                                name="new_time_fixed_fee" value="0">
                                        </div>
                                        <div class="form-group">
                                            <label>Hệ số nhân cước</label>
                                            <input class="admin-input" type="number" step="0.01" name="new_time_he_so"
                                                value="1">
                                        </div>
                                    </div>
                                    <div class="pricing-actions">
                                        <button type="submit" class="btn-primary"><i class="fa-solid fa-plus"></i> Tạo
                                            khung giờ</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    <!-- Modal Thêm Điều kiện giao -->
                    <div class="pricing-modal" data-modal="modal-add-weather" hidden>
                        <div class="pricing-modal__backdrop" data-close-modal></div>
                        <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                            <div class="pricing-modal__head">
                                <div>
                                    <h3>Thêm điều kiện mới</h3>
                                    <p>Ví dụ: Trời mưa, Đường ngập, Ngày lễ...</p>
                                </div>
                                <button type="button" class="pricing-modal__close" data-close-modal><i
                                        class="fa-solid fa-xmark"></i></button>
                            </div>
                            <div class="pricing-modal__body">
                                <form method="post" data-confirm-message="Thêm điều kiện giao mới?">
                                    <input type="hidden" name="action" value="add_weather">
                                    <div class="pricing-add-grid">
                                        <div class="form-group">
                                            <label>Mã điều kiện</label>
                                            <input class="admin-input" type="text" name="new_weather_key"
                                                placeholder="Ví dụ: troi_mua" required>
                                        </div>
                                        <div class="form-group">
                                            <label>Tên hiển thị</label>
                                            <input class="admin-input" type="text" name="new_weather_label"
                                                placeholder="Ví dụ: Trời mưa" required>
                                        </div>
                                        <div class="form-group">
                                            <label>Phí cố định cộng thêm</label>
                                            <input class="admin-input" type="number" step="1000"
                                                name="new_weather_fixed_fee" value="0">
                                        </div>
                                        <div class="form-group">
                                            <label>Hệ số nhân cước</label>
                                            <input class="admin-input" type="number" step="0.01"
                                                name="new_weather_he_so" value="1">
                                        </div>
                                    </div>
                                    <div class="pricing-actions">
                                        <button type="submit" class="btn-primary"><i class="fa-solid fa-plus"></i> Tạo
                                            điều kiện</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    <!-- Modals Sửa Khung giờ -->
                    <?php foreach (($serviceFeeConfig['thoigian'] ?? []) as $timeKey => $timeConfig): ?>
                        <div class="pricing-modal"
                            data-modal="modal-edit-time-<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>"
                            hidden>
                            <div class="pricing-modal__backdrop" data-close-modal></div>
                            <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                                <div class="pricing-modal__head">
                                    <div>
                                        <h3>Sửa khung giờ:
                                            <?php echo htmlspecialchars((string) ($timeConfig['ten'] ?? $timeKey), ENT_QUOTES, 'UTF-8'); ?>
                                        </h3>
                                        <p>Cập nhật thông số phí cho khung giờ này.</p>
                                    </div>
                                    <button type="button" class="pricing-modal__close" data-close-modal><i
                                            class="fa-solid fa-xmark"></i></button>
                                </div>
                                <div class="pricing-modal__body">
                                    <form method="post" data-confirm-message="Lưu thay đổi cho khung giờ này?">
                                        <input type="hidden" name="action" value="save_service_time_row">
                                        <input type="hidden" name="original_time_key"
                                            value="<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>">
                                        <div class="pricing-add-grid">
                                            <div class="form-group">
                                                <label>Mã (Slug)</label>
                                                <input class="admin-input" type="text" name="time_row[key]"
                                                    value="<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Tên hiển thị</label>
                                                <input class="admin-input" type="text" name="time_row[ten]"
                                                    value="<?php echo htmlspecialchars((string) ($timeConfig['ten'] ?? $timeKey), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Bắt đầu</label>
                                                <input class="admin-input" type="time" name="time_row[batdau]"
                                                    value="<?php echo htmlspecialchars((string) ($timeConfig['batdau'] ?? '00:00'), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Kết thúc</label>
                                                <input class="admin-input" type="time" name="time_row[ketthuc]"
                                                    value="<?php echo htmlspecialchars((string) ($timeConfig['ketthuc'] ?? '23:59'), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Phí cố định</label>
                                                <input class="admin-input" type="number" step="1000"
                                                    name="time_row[phicodinh]"
                                                    value="<?php echo (int) ($timeConfig['phicodinh'] ?? 0); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Hệ số</label>
                                                <input class="admin-input" type="number" step="0.01" name="time_row[heso]"
                                                    value="<?php echo (float) ($timeConfig['heso'] ?? 1); ?>">
                                            </div>
                                        </div>
                                        <div class="pricing-actions">
                                            <button type="button" class="btn-danger pricing-inline-delete"
                                                data-pricing-action="delete_service_time"
                                                data-delete-key="<?php echo htmlspecialchars($timeKey, ENT_QUOTES, 'UTF-8'); ?>"
                                                data-confirm-message="Xóa khung giờ này?">
                                                <i class="fa-solid fa-trash"></i> Xóa
                                            </button>
                                            <button type="submit" class="btn-primary"><i
                                                    class="fa-solid fa-floppy-disk"></i> Lưu thay đổi</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>

                    <!-- Modals Sửa Điều kiện giao -->
                    <?php foreach (($serviceFeeConfig['thoitiet'] ?? []) as $weatherKey => $weatherConfig): ?>
                        <div class="pricing-modal"
                            data-modal="modal-edit-weather-<?php echo htmlspecialchars($weatherKey, ENT_QUOTES, 'UTF-8'); ?>"
                            hidden>
                            <div class="pricing-modal__backdrop" data-close-modal></div>
                            <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                                <div class="pricing-modal__head">
                                    <div>
                                        <h3>Sửa điều kiện:
                                            <?php echo htmlspecialchars((string) ($weatherConfig['ten'] ?? $weatherKey), ENT_QUOTES, 'UTF-8'); ?>
                                        </h3>
                                        <p>Cập nhật thông số phí cho điều kiện này.</p>
                                    </div>
                                    <button type="button" class="pricing-modal__close" data-close-modal><i
                                            class="fa-solid fa-xmark"></i></button>
                                </div>
                                <div class="pricing-modal__body">
                                    <form method="post" data-confirm-message="Lưu thay đổi cho điều kiện này?">
                                        <input type="hidden" name="action" value="save_weather_row">
                                        <input type="hidden" name="original_weather_key"
                                            value="<?php echo htmlspecialchars($weatherKey, ENT_QUOTES, 'UTF-8'); ?>">
                                        <div class="pricing-add-grid">
                                            <div class="form-group">
                                                <label>Mã (Slug)</label>
                                                <input class="admin-input" type="text" name="weather_row[key]"
                                                    value="<?php echo htmlspecialchars($weatherKey, ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Tên hiển thị</label>
                                                <input class="admin-input" type="text" name="weather_row[ten]"
                                                    value="<?php echo htmlspecialchars((string) ($weatherConfig['ten'] ?? $weatherKey), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Phí cố định</label>
                                                <input class="admin-input" type="number" step="1000"
                                                    name="weather_row[phicodinh]"
                                                    value="<?php echo (int) ($weatherConfig['phicodinh'] ?? 0); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Hệ số</label>
                                                <input class="admin-input" type="number" step="0.01"
                                                    name="weather_row[heso]"
                                                    value="<?php echo (float) ($weatherConfig['heso'] ?? 1); ?>">
                                            </div>
                                        </div>
                                        <div class="pricing-actions">
                                            <button type="button" class="btn-danger pricing-inline-delete"
                                                data-pricing-action="delete_weather"
                                                data-delete-key="<?php echo htmlspecialchars($weatherKey, ENT_QUOTES, 'UTF-8'); ?>"
                                                data-confirm-message="Xóa điều kiện giao này?">
                                                <i class="fa-solid fa-trash"></i> Xóa
                                            </button>
                                            <button type="submit" class="btn-primary"><i
                                                    class="fa-solid fa-floppy-disk"></i> Lưu thay đổi</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>

                <div data-pricing-modal-group="section-cod">
                    <!-- Modal Sửa COD & Bảo hiểm (Refactored) -->
                    <div class="pricing-modal" data-modal="modal-edit-cod" hidden>
                        <div class="pricing-modal__backdrop" data-close-modal></div>
                        <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                            <div class="pricing-modal__head">
                                <div>
                                    <h3>Chỉnh COD và Bảo hiểm</h3>
                                    <p>Thiết lập ngưỡng miễn phí, tỷ lệ và mức tối thiểu.</p>
                                </div>
                                <button type="button" class="pricing-modal__close" data-close-modal><i
                                        class="fa-solid fa-xmark"></i></button>
                            </div>
                            <div class="pricing-modal__body">
                                <p class="pricing-section__hint pricing-section__hint--inline">
                                    Tỷ lệ nhập dưới dạng số thập phân. Ví dụ <strong>0.012</strong> tương đương
                                    <strong>1.2%</strong>.
                                </p>
                                <form method="post" data-confirm-message="Lưu thay đổi COD và bảo hiểm?">
                                    <input type="hidden" name="action" value="save_cod_insurance">
                                    <div class="pricing-add-grid">
                                        <div class="form-group">
                                            <label>Ngưỡng COD miễn phí</label>
                                            <input class="admin-input" type="number" name="cod_insurance[cod_nguong]"
                                                value="<?php echo (int) ($codInsuranceConfig['thuho']['nguong'] ?? 0); ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Tỷ lệ COD (thập phân)</label>
                                            <input class="admin-input" type="number" step="0.0001"
                                                name="cod_insurance[cod_kieu]"
                                                value="<?php echo (float) ($codInsuranceConfig['thuho']['kieu'] ?? 0); ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>COD tối thiểu</label>
                                            <input class="admin-input" type="number" name="cod_insurance[cod_toithieu]"
                                                value="<?php echo (int) ($codInsuranceConfig['thuho']['toithieu'] ?? 0); ?>">
                                        </div>
                                        <div class="pricing-divider" style="grid-column: 1 / -1; margin: 8px 0;"></div>
                                        <div class="form-group">
                                            <label>Ngưỡng Bảo hiểm</label>
                                            <input class="admin-input" type="number"
                                                name="cod_insurance[insurance_nguong]"
                                                value="<?php echo (int) ($codInsuranceConfig['baohiem']['nguong'] ?? 0); ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Tỷ lệ Bảo hiểm (thập phân)</label>
                                            <input class="admin-input" type="number" step="0.0001"
                                                name="cod_insurance[insurance_kieu]"
                                                value="<?php echo (float) ($codInsuranceConfig['baohiem']['kieu'] ?? 0); ?>">
                                        </div>
                                        <div class="form-group">
                                            <label>Bảo hiểm tối thiểu</label>
                                            <input class="admin-input" type="number"
                                                name="cod_insurance[insurance_toithieu]"
                                                value="<?php echo (int) ($codInsuranceConfig['baohiem']['toithieu'] ?? 0); ?>">
                                        </div>
                                    </div>
                                    <div class="pricing-actions">
                                        <button type="submit" class="btn-primary"><i
                                                class="fa-solid fa-floppy-disk"></i> Lưu cấu hình</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>

                <div data-pricing-modal-group="section-vehicle">
                    <!-- Modal Thêm phương tiện mới -->
                    <div class="pricing-modal" data-modal="modal-add-vehicle" hidden>
                        <div class="pricing-modal__backdrop" data-close-modal></div>
                        <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                            <div class="pricing-modal__head">
                                <div>
                                    <h3>Thêm phương tiện mới</h3>
                                    <p>Tạo cấu hình vận chuyển cho phương tiện mới.</p>
                                </div>
                                <button type="button" class="pricing-modal__close" data-close-modal><i
                                        class="fa-solid fa-xmark"></i></button>
                            </div>
                            <div class="pricing-modal__body">
                                <form method="post" data-confirm-message="Xác nhận thêm phương tiện mới?">
                                    <input type="hidden" name="action" value="add_vehicle">
                                    <div class="pricing-add-grid">
                                        <div class="form-group">
                                            <label>Mã (Slug)</label>
                                            <input class="admin-input" type="text" name="new_vehicle_key"
                                                placeholder="Ví dụ: xe_tai_5t" required>
                                        </div>
                                        <div class="form-group">
                                            <label>Tên hiển thị</label>
                                            <input class="admin-input" type="text" name="new_vehicle_label"
                                                placeholder="Ví dụ: Xe tải 5T" required>
                                        </div>
                                        <div class="form-group">
                                            <label>Tải trọng tối đa (kg)</label>
                                            <input class="admin-input" type="number" step="0.1"
                                                name="new_vehicle_weight" value="1000" required>
                                        </div>
                                        <div class="form-group">
                                            <label>Giá cơ bản (VNĐ)</label>
                                            <input class="admin-input" type="number" step="500"
                                                name="new_vehicle_base_price" value="15000" required>
                                        </div>
                                        <div class="form-group">
                                            <label>Hệ số xe</label>
                                            <input class="admin-input" type="number" step="0.01"
                                                name="new_vehicle_he_so_xe" value="1" required>
                                        </div>
                                        <div class="form-group">
                                            <label>Phí tối thiểu (VNĐ)</label>
                                            <input class="admin-input" type="number" step="1000"
                                                name="new_vehicle_min_fee" value="0" required>
                                        </div>
                                        <div class="form-group" style="grid-column: 1 / -1;">
                                            <label>Mô tả ngắn</label>
                                            <textarea class="admin-input pricing-textarea" rows="2"
                                                name="new_vehicle_description"></textarea>
                                        </div>
                                    </div>
                                    <div class="pricing-actions">
                                        <button type="submit" class="btn-primary"><i class="fa-solid fa-plus"></i> Tạo
                                            phương tiện</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    <!-- Modals Sửa từng phương tiện -->
                    <?php foreach ($vehicleConfigs as $vehicleIndex => $vehicle): ?>
                        <?php $vKey = $vehicle['key'] ?? ''; ?>
                        <div class="pricing-modal"
                            data-modal="modal-edit-vehicle-<?php echo htmlspecialchars((string) ($vKey ?: $vehicleIndex), ENT_QUOTES, 'UTF-8'); ?>"
                            hidden>
                            <div class="pricing-modal__backdrop" data-close-modal></div>
                            <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                                <div class="pricing-modal__head">
                                    <div>
                                        <h3>Chỉnh sửa:
                                            <?php echo htmlspecialchars((string) ($vehicle['label'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>
                                        </h3>
                                        <p>Cập nhật cấu hình chi tiết cho phương tiện này.</p>
                                    </div>
                                    <button type="button" class="pricing-modal__close" data-close-modal><i
                                            class="fa-solid fa-xmark"></i></button>
                                </div>
                                <div class="pricing-modal__body">
                                    <form method="post"
                                        data-confirm-message="Lưu thay đổi cho phương tiện <?php echo htmlspecialchars((string) ($vehicle['label'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>?">
                                        <input type="hidden" name="action" value="save_vehicle_row">
                                        <input type="hidden" name="original_vehicle_key"
                                            value="<?php echo htmlspecialchars((string) $vKey, ENT_QUOTES, 'UTF-8'); ?>">

                                        <div class="pricing-add-grid">
                                            <div class="form-group">
                                                <label>Mã định danh</label>
                                                <input class="admin-input" type="text" name="vehicle_row[key]"
                                                    value="<?php echo htmlspecialchars((string) $vKey, ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Tên hiển thị</label>
                                                <input class="admin-input" type="text" name="vehicle_row[label]"
                                                    value="<?php echo htmlspecialchars((string) ($vehicle['label'] ?? ''), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Tải trọng tối đa (kg)</label>
                                                <input class="admin-input" type="number" step="0.1"
                                                    name="vehicle_row[trong_luong_toi_da]"
                                                    value="<?php echo htmlspecialchars((string) ($vehicle['trong_luong_toi_da'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Giá cơ bản (VNĐ)</label>
                                                <input class="admin-input" type="number" step="500"
                                                    name="vehicle_row[gia_co_ban]"
                                                    value="<?php echo htmlspecialchars((string) ($vehicle['gia_co_ban'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Hệ số xe</label>
                                                <input class="admin-input" type="number" step="0.01"
                                                    name="vehicle_row[he_so_xe]"
                                                    value="<?php echo htmlspecialchars((string) ($vehicle['he_so_xe'] ?? 1), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Phí tối thiểu (VNĐ)</label>
                                                <input class="admin-input" type="number" step="1000"
                                                    name="vehicle_row[phi_toi_thieu]"
                                                    value="<?php echo htmlspecialchars((string) ($vehicle['phi_toi_thieu'] ?? 0), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group" style="grid-column: 1 / -1;">
                                                <label>Mô tả ngắn</label>
                                                <textarea class="admin-input pricing-textarea" rows="2"
                                                    name="vehicle_row[description]"><?php echo htmlspecialchars((string) ($vehicle['description'] ?? ''), ENT_QUOTES, 'UTF-8'); ?></textarea>
                                            </div>
                                        </div>

                                        <div class="pricing-actions">
                                            <button type="button" class="btn-danger pricing-inline-delete"
                                                data-pricing-action="delete_vehicle"
                                                data-delete-key="<?php echo htmlspecialchars((string) $vKey, ENT_QUOTES, 'UTF-8'); ?>"
                                                data-confirm-message="Xóa vĩnh viễn phương tiện này?">
                                                <i class="fa-solid fa-trash"></i> Xóa phương tiện
                                            </button>
                                            <button type="submit" class="btn-primary"><i
                                                    class="fa-solid fa-floppy-disk"></i> Lưu thay đổi</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>


                <div data-pricing-modal-group="section-goods">
                    <!-- Modal Thêm loại phụ phí mới -->
                    <div class="pricing-modal" data-modal="modal-add-goods" hidden>
                        <div class="pricing-modal__backdrop" data-close-modal></div>
                        <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                            <div class="pricing-modal__head">
                                <div>
                                    <h3>Thêm loại hàng mới</h3>
                                    <p>Tạo loại hàng kèm theo phí và hệ số riêng.</p>
                                </div>
                                <button type="button" class="pricing-modal__close" data-close-modal><i
                                        class="fa-solid fa-xmark"></i></button>
                            </div>
                            <div class="pricing-modal__body">
                                <form method="post" data-confirm-message="Xác nhận thêm loại hàng mới?">
                                    <input type="hidden" name="action" value="add_goods_fee">
                                    <div class="pricing-add-grid">
                                        <div class="form-group">
                                            <label>Mã loại hàng</label>
                                            <input class="admin-input" type="text" name="new_key"
                                                placeholder="Ví dụ: de_vo" required>
                                        </div>
                                        <div class="form-group">
                                            <label>Tên hiển thị</label>
                                            <input class="admin-input" type="text" name="new_label"
                                                placeholder="Ví dụ: Dễ vỡ" required>
                                        </div>
                                        <div class="form-group">
                                            <label>Phụ phí cộng thêm (VNĐ)</label>
                                            <input class="admin-input" type="number" step="1000" name="new_fee"
                                                value="0">
                                        </div>
                                        <div class="form-group">
                                            <label>Hệ số nhân cước</label>
                                            <input class="admin-input" type="number" step="0.01" name="new_he_so"
                                                value="1">
                                        </div>
                                        <div class="form-group" style="grid-column: 1 / -1;">
                                            <label>Mô tả loại hàng</label>
                                            <textarea class="admin-input pricing-textarea" rows="2"
                                                name="new_description"></textarea>
                                        </div>
                                    </div>
                                    <div class="pricing-actions">
                                        <button type="submit" class="btn-primary"><i class="fa-solid fa-plus"></i> Tạo
                                            loại hàng</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>

                    <!-- Modals Sửa từng loại hàng -->
                    <?php foreach ($goodsFees as $goodsKey => $goodsFee): ?>
                        <div class="pricing-modal"
                            data-modal="modal-edit-goods-<?php echo htmlspecialchars((string) $goodsKey, ENT_QUOTES, 'UTF-8'); ?>"
                            hidden>
                            <div class="pricing-modal__backdrop" data-close-modal></div>
                            <div class="pricing-modal__dialog" role="dialog" aria-modal="true">
                                <div class="pricing-modal__head">
                                    <div>
                                        <h3>Cấu hình:
                                            <?php echo htmlspecialchars((string) ($goodsLabels[$goodsKey] ?? $goodsKey), ENT_QUOTES, 'UTF-8'); ?>
                                        </h3>
                                        <p>Chỉnh sửa các tham số phí cho loại hàng này.</p>
                                    </div>
                                    <button type="button" class="pricing-modal__close" data-close-modal><i
                                            class="fa-solid fa-xmark"></i></button>
                                </div>
                                <div class="pricing-modal__body">
                                    <form method="post"
                                        data-confirm-message="Lưu thay đổi cho loại hàng <?php echo htmlspecialchars((string) ($goodsLabels[$goodsKey] ?? $goodsKey), ENT_QUOTES, 'UTF-8'); ?>?">
                                        <input type="hidden" name="action" value="save_goods_fee_row">
                                        <input type="hidden" name="original_goods_key"
                                            value="<?php echo htmlspecialchars((string) $goodsKey, ENT_QUOTES, 'UTF-8'); ?>">

                                        <div class="pricing-add-grid">
                                            <div class="form-group">
                                                <label>Mã (Slug)</label>
                                                <input class="admin-input" type="text" name="goods_row[key]"
                                                    value="<?php echo htmlspecialchars((string) $goodsKey, ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Tên hiển thị</label>
                                                <input class="admin-input" type="text" name="goods_row[label]"
                                                    value="<?php echo htmlspecialchars((string) ($goodsLabels[$goodsKey] ?? $goodsKey), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Phụ phí cộng thêm (VNĐ)</label>
                                                <input class="admin-input" type="number" step="1000" name="goods_row[fee]"
                                                    value="<?php echo htmlspecialchars((string) $goodsFee, ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group">
                                                <label>Hệ số nhân cước</label>
                                                <input class="admin-input" type="number" step="0.01" name="goods_row[he_so]"
                                                    value="<?php echo htmlspecialchars((string) ($goodsMultipliers[$goodsKey] ?? 1), ENT_QUOTES, 'UTF-8'); ?>">
                                            </div>
                                            <div class="form-group" style="grid-column: 1 / -1;">
                                                <label>Mô tả loại hàng</label>
                                                <textarea class="admin-input pricing-textarea" rows="2"
                                                    name="goods_row[description]"><?php echo htmlspecialchars((string) ($goodsDescriptions[$goodsKey] ?? ''), ENT_QUOTES, 'UTF-8'); ?></textarea>
                                            </div>
                                        </div>

                                        <div class="pricing-actions">
                                            <button type="button" class="btn-danger pricing-inline-delete"
                                                data-pricing-action="delete_goods_fee"
                                                data-delete-key="<?php echo htmlspecialchars((string) $goodsKey, ENT_QUOTES, 'UTF-8'); ?>"
                                                data-confirm-message="Xóa vĩnh viễn loại hàng này?">
                                                <i class="fa-solid fa-trash"></i> Xóa loại hàng
                                            </button>
                                            <button type="submit" class="btn-primary"><i
                                                    class="fa-solid fa-floppy-disk"></i> Lưu thay đổi</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
