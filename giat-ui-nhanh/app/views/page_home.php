<!doctype html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Giặt Ủi Sạch Sẽ - Dịch Vụ Giặt Ủi Chuyên Nghiệp</title>
    <link
      rel="shortcut icon"
      type="image/x-icon"
      href="public/asset/image/Laundry logo vector _ Premium Vector.png"
    />
    <link rel="stylesheet" href="public/asset/css/bootstrap.min.css" />
    <link rel="stylesheet" href="public/asset/css/styles.css" />
  </head>
  <body>
    <?php 
      $url = "http://localhost/Giat-Ui-Nhanh/public/services";

        $response = file_get_contents($url);

        if ($response === false) {
            die("Không gọi được API");
        }

        $data = json_decode($response, true);
        $services = array_filter($data, function ($item) {
            return isset($item['service_name'])
                && stripos(mb_strtolower($item['service_name'], 'UTF-8'), 'dịch vụ') !== false;
        });
        $packages = array_filter($data, function ($item) {
            return isset($item['service_name'])
                && stripos(mb_strtolower($item['service_name'], 'UTF-8'), 'gói') === 0;
        });

        function findService($list, $name) {
            foreach ($list as $item) {
                if ($item['service_name'] === $name) {
                    return $item;
                }
            }
            return null;
        }

        $basic    = findService($packages, 'Gói Cơ Bản');
        $standard = findService($packages, 'Gói Tiêu Chuẩn');
        $premium  = findService($packages, 'Gói Cao Cấp');

        /* Hàm tách summary */
        function summaryToArray($summary) {
            return array_filter(array_map('trim', explode("\n", $summary)));
        }
    ?>
    <!-- Navigation -->
    <nav class="navbar" id="navbar">
      <div class="nav-container">
        <a href="#home" class="logo">
          <img
            style="width: 80px; height: 60px"
            src="public/asset/image/Frame 1.png"
            alt=""
          />
          <span>Giặt Ủi Nhanh</span>
        </a>
        <ul class="nav-menu" id="navMenu">
          <li><a href="#navbar" class="nav-link">Trang chủ</a></li>
          <li><a href="#about" class="nav-link">Giới thiệu</a></li>
          <li><a href="#services" class="nav-link">Dịch vụ</a></li>
          <li><a href="#process" class="nav-link">Quy trình</a></li>
          <li><a href="#pricing" class="nav-link">Bảng giá</a></li>
          <li><a href="#contact" class="nav-link">Đặt dịch vụ</a></li>
          <li><a class="nav-link" data-bs-toggle="modal" data-bs-target="#searchModal"><i class='fas fa-search'></i> Tra cứu đơn đặt</a></li>
        </ul>
        <button class="menu-toggle" id="menuToggle" aria-label="Menu">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="30"
            height="30"
            fill="currentColor"
            class="bi bi-list"
            viewBox="0 0 16 16"
          >
            <path
              fill-rule="evenodd"
              d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5m0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5"
            />
          </svg>
        </button>
      </div>
    </nav>
    <!-- The Modal -->
  <div class="modal" id="searchModal">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">

        <!-- Modal Header -->
        <div class="modal-header">
          <h4 class="modal-title">Tra cứu đơn hàng</h4>
          <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
        </div>

        <!-- Modal body -->
        <div class="modal-body">
          <div class="row">
            <div class="col-md-12 mb-3 mt-3">
              <input type="text" id="searchOrder" class="form-control" placeholder="Nhập sau số (0) 988765432 để tra cứu đơn hàng">
            </div>
          </div>
          <div class="row">
             <div class="col-md-12">
              <div class="table-responsive">
                <table class="table table-hover ">
                  <thead class="table-primary">
                    <tr>
                      <th>#</th>
                      <th>Khách hàng</th>
                      <th>SĐT</th>
                      <th>Địa chỉ</th>
                      <th>Dịch vụ</th>
                      <th>Giá</th>
                      <th>Trạng thái</th>
                      <th>Ngày đặt</th>
                      <th>Hành động</th>
                    </tr>
                  </thead>
                  <tbody id="searchTable" style="text-align: center;">
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
    <!-- Hero Section -->
    <section class="hero" id="home">
      <div class="hero-overlay"></div>
      <div class="container">
        <div class="hero-content">
          <div class="hero-text">
            <h1>
              Giặt Ủi<br />
              <span class="gradient-text">Sạch Sẽ</span><br />
              Nhanh Chóng
            </h1>

            <p>
              Dịch vụ giặt ủi cao cấp - Nhận giặt tận nơi - Giao trả trong ngày.
              Chất lượng 5 sao, giá cả hợp lý!
            </p>

            <div class="quick-info">
              <div class="info-item">
                <div class="info-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="30"
                    height="30"
                    fill="currentColor"
                    class="bi bi-clock-fill"
                    viewBox="0 0 16 16"
                  >
                    <path
                      d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z"
                    />
                  </svg>
                </div>
                <div>
                  <div style="font-weight: 600">Giao nhận 24/7</div>
                  <div style="font-size: 14px; color: #dbeafe">
                    Phục vụ cả cuối tuần
                  </div>
                </div>
              </div>
              <div class="info-item">
                <div class="info-icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="30"
                    height="30"
                    fill="currentColor"
                    class="bi bi-telephone-fill"
                    viewBox="0 0 16 16"
                  >
                    <path
                      fill-rule="evenodd"
                      d="M1.885.511a1.745 1.745 0 0 1 2.61.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.68.68 0 0 0 .178.643l2.457 2.457a.68.68 0 0 0 .644.178l2.189-.547a1.75 1.75 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.6 18.6 0 0 1-7.01-4.42 18.6 18.6 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877z"
                    />
                  </svg>
                </div>
                <div>
                  <div style="font-weight: 600">1900 8888</div>
                  <div style="font-size: 14px; color: #dbeafe">
                    Hotline hỗ trợ
                  </div>
                </div>
              </div>
            </div>

            <div class="cta-buttons">
              <a href="#contact" class="btn btn-primary">
                <span>Đặt dịch vụ ngay</span>
              </a>
              <a href="#pricing" class="btn btn-secondary">
                <span>Xem bảng giá</span>
              </a>
            </div>
          </div>

          <div class="hero-image" style="display: none">
            <img
              src="public/asset/image/NewWashHouse-009-scaled.png"
              alt="Clean Towels"
            />
          </div>
        </div>
      </div>

      <svg
        class="hero-wave"
        viewBox="0 0 1440 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0,64L48,69.3C96,75,192,85,288,80C384,75,480,53,576,48C672,43,768,53,864,64C960,75,1056,85,1152,80C1248,75,1344,53,1392,42.7L1440,32L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z"
          fill="white"
        />
      </svg>
    </section>

    <!-- About Section -->
    <section id="about" style="padding: 80px 0; background: white">
      <div class="container">
        <div class="section-header">
          <div
            class="section-badge"
            style="background: #dcfce7; color: #16a34a"
          >
            <span>GIỚI THIỆU VỀ CHÚNG TÔI</span>
          </div>
          <h2>
            Tại Sao Chọn
            <span
              style="
                background: linear-gradient(to right, #16a34a, #14b8a6);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
              "
            >
              Chúng Tôi
            </span>
          </h2>
          <p>
            Với hơn 10 năm kinh nghiệm, chúng tôi tự hào là đơn vị tiên phong
            trong lĩnh vực giặt ủi chuyên nghiệp
          </p>
        </div>
        <div class="about-content">
          <div class="about-flex">
            <!-- Text Content -->
            <div class="text-content" style="padding: 20px">
              <h3>Đối Tác Tin Cậy Cho Mọi Nhu Cầu Giặt Ủi</h3>
              <p>
                <strong style="color: #16a34a">Giặt Ủi Sạch Sẽ</strong> được
                thành lập từ năm 2014 với sứ mệnh mang đến dịch vụ giặt ủi chất
                lượng cao, chuyên nghiệp và tiện lợi nhất cho mọi gia đình và
                doanh nghiệp tại Việt Nam.
              </p>
              <p>
                Chúng tôi sở hữu hệ thống máy móc hiện đại nhập khẩu từ Hàn Quốc
                và Nhật Bản, cùng đội ngũ nhân viên được đào tạo bài bản. Mỗi
                ngày, chúng tôi phục vụ hơn
                <strong style="color: #16a34a">500+ khách hàng</strong> với tỷ
                lệ hài lòng lên đến <strong style="color: #16a34a">98%</strong>.
              </p>
              <p>
                Không chỉ là dịch vụ giặt ủi thông thường, chúng tôi cam kết
                mang đến giải pháp chăm sóc quần áo toàn diện, giúp bạn tiết
                kiệm thời gian và tận hưởng cuộc sống trọn vẹn hơn.
              </p>
              <div style="display: flex; gap: 20px; flex-wrap: wrap">
                <div
                  style="
                    flex: 1;
                    min-width: 150px;
                    padding: 20px;
                    background: #f0fdf4;
                    border-left: 4px solid #16a34a;
                    border-radius: 8px;
                  "
                >
                  <div
                    style="
                      font-size: 2rem;
                      font-weight: 900;
                      color: #16a34a;
                      margin-bottom: 5px;
                    "
                  >
                    10+
                  </div>
                  <div style="color: #6b7280; font-weight: 600">
                    Năm kinh nghiệm
                  </div>
                </div>
                <div
                  style="
                    flex: 1;
                    min-width: 150px;
                    padding: 20px;
                    background: #eff6ff;
                    border-left: 4px solid #3b82f6;
                    border-radius: 8px;
                  "
                >
                  <div
                    style="
                      font-size: 2rem;
                      font-weight: 900;
                      color: #3b82f6;
                      margin-bottom: 5px;
                    "
                  >
                    15
                  </div>
                  <div style="color: #6b7280; font-weight: 600">
                    Chi nhánh toàn quốc
                  </div>
                </div>
              </div>
            </div>

            <!-- Image -->
            <div class="text-image">
              <div
                style="
                  border-radius: 30px;
                  overflow: hidden;
                  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
                  position: relative;
                  z-index: 1;
                "
              >
                <img
                  src="public/asset/image/Xuong-GiatSayNhanh.png"
                  alt="Đội ngũ chuyên nghiệp"
                />
              </div>
            </div>
          </div>
        </div>
        <div class="intro">
          <div
            class="intro-content"
            style="background: linear-gradient(to bottom, #f0fdf4, white)"
          >
            <div style="background: linear-gradient(135deg, #10b981, #14b8a6)">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                fill="currentColor"
                class="bi bi-lightning-charge-fill"
                viewBox="0 0 16 16"
              >
                <path
                  d="M11.251.068a.5.5 0 0 1 .227.58L9.677 6.5H13a.5.5 0 0 1 .364.843l-8 8.5a.5.5 0 0 1-.842-.49L6.323 9.5H3a.5.5 0 0 1-.364-.843l8-8.5a.5.5 0 0 1 .615-.09z"
                />
              </svg>
            </div>
            <h3>Nhanh Chóng</h3>
            <p>
              Giao nhận trong ngày, thậm chí trong vòng 12h với dịch vụ cao cấp
            </p>
          </div>

          <div
            class="intro-content"
            style="background: linear-gradient(to bottom, #eff6ff, white)"
          >
            <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6)">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                fill="currentColor"
                class="bi bi-stars"
                viewBox="0 0 16 16"
              >
                <path
                  d="M7.657 6.247c.11-.33.576-.33.686 0l.645 1.937a2.89 2.89 0 0 0 1.829 1.828l1.936.645c.33.11.33.576 0 .686l-1.937.645a2.89 2.89 0 0 0-1.828 1.829l-.645 1.936a.361.361 0 0 1-.686 0l-.645-1.937a2.89 2.89 0 0 0-1.828-1.828l-1.937-.645a.361.361 0 0 1 0-.686l1.937-.645a2.89 2.89 0 0 0 1.828-1.828zM3.794 1.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387A1.73 1.73 0 0 0 4.593 5.69l-.387 1.162a.217.217 0 0 1-.412 0L3.407 5.69A1.73 1.73 0 0 0 2.31 4.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387A1.73 1.73 0 0 0 3.407 2.31zM10.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.16 1.16 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.16 1.16 0 0 0-.732-.732L9.1 2.137a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732z"
                />
              </svg>
            </div>
            <h3>Chất Lượng</h3>
            <p>
              Máy móc hiện đại, hóa chất cao cấp, quy trình giặt chuẩn quốc tế
            </p>
          </div>

          <div
            class="intro-content"
            style="background: linear-gradient(to bottom, #fef3c7, white)"
          >
            <div style="background: linear-gradient(135deg, #f59e0b, #f97316)">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                fill="currentColor"
                class="bi bi-currency-dollar"
                viewBox="0 0 16 16"
              >
                <path
                  d="M4 10.781c.148 1.667 1.513 2.85 3.591 3.003V15h1.043v-1.216c2.27-.179 3.678-1.438 3.678-3.3 0-1.59-.947-2.51-2.956-3.028l-.722-.187V3.467c1.122.11 1.879.714 2.07 1.616h1.47c-.166-1.6-1.54-2.748-3.54-2.875V1H7.591v1.233c-1.939.23-3.27 1.472-3.27 3.156 0 1.454.966 2.483 2.661 2.917l.61.162v4.031c-1.149-.17-1.94-.8-2.131-1.718zm3.391-3.836c-1.043-.263-1.6-.825-1.6-1.616 0-.944.704-1.641 1.8-1.828v3.495l-.2-.05zm1.591 1.872c1.287.323 1.852.859 1.852 1.769 0 1.097-.826 1.828-2.2 1.939V8.73z"
                />
              </svg>
            </div>
            <h3>Giá Tốt</h3>
            <p>Bảng giá minh bạch, nhiều ưu đãi cho khách hàng thân thiết</p>
          </div>

          <div
            class="intro-content"
            style="background: linear-gradient(to bottom, #fce7f3, white)"
          >
            <div style="background: linear-gradient(135deg, #ec4899, #f43f5e)">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                fill="currentColor"
                class="bi bi-hand-thumbs-up-fill"
                viewBox="0 0 16 16"
              >
                <path
                  d="M6.956 1.745C7.021.81 7.908.087 8.864.325l.261.066c.463.116.874.456 1.012.965.22.816.533 2.511.062 4.51a10 10 0 0 1 .443-.051c.713-.065 1.669-.072 2.516.21.518.173.994.681 1.2 1.273.184.532.16 1.162-.234 1.733q.086.18.138.363c.077.27.113.567.113.856s-.036.586-.113.856c-.039.135-.09.273-.16.404.169.387.107.819-.003 1.148a3.2 3.2 0 0 1-.488.901c.054.152.076.312.076.465 0 .305-.089.625-.253.912C13.1 15.522 12.437 16 11.5 16H8c-.605 0-1.07-.081-1.466-.218a4.8 4.8 0 0 1-.97-.484l-.048-.03c-.504-.307-.999-.609-2.068-.722C2.682 14.464 2 13.846 2 13V9c0-.85.685-1.432 1.357-1.615.849-.232 1.574-.787 2.132-1.41.56-.627.914-1.28 1.039-1.639.199-.575.356-1.539.428-2.59z"
                />
              </svg>
            </div>
            <h3>Tiện Lợi</h3>
            <p>Nhận và giao tận nơi, miễn phí trong bán kính 5km</p>
          </div>
        </div>

        <div
          style="
            margin-top: 60px;
            background: linear-gradient(135deg, #3b82f6, #8b5cf6);
            border-radius: 30px;
            padding: 60px 40px;
            text-align: center;
            color: white;
          "
        >
          <h3 style="font-size: 2rem; font-weight: 900; margin-bottom: 20px">
            Cam kết của chúng tôi
          </h3>
          <p
            style="
              font-size: 1.125rem;
              line-height: 1.8;
              max-width: 800px;
              margin: 0 auto;
              color: #dbeafe;
            "
          >
            Chúng tôi cam kết mang đến dịch vụ giặt ủi chất lượng cao nhất với
            giá cả hợp lý. Mọi sản phẩm đều được kiểm tra kỹ lưỡng trước khi
            giao đến tay khách hàng. Nếu không hài lòng, chúng tôi sẽ giặt lại
            hoàn toàn miễn phí!
          </p>
        </div>
      </div>
    </section>

    <!-- Services Section -->
    <section id="services">
      <div class="container">
        <div class="section-header">
          <div class="section-badge">
            <span>DỊCH VỤ CỦA CHÚNG TÔI</span>
          </div>
          <h2>
            Giải Pháp Giặt Ủi<br />
            <span class="gradient-text">Toàn Diện</span>
          </h2>
          <p>
            Từ quần áo hàng ngày đến đồ cao cấp, chúng tôi có giải pháp cho mọi
            nhu cầu của bạn
          </p>
        </div>
        <div class="services-grid" id="servicesGrid">

          <?php
          $index = 0;
          foreach ($services as $service):
          ?>

          <?php
          $icons = [
            ['img' => 'public/asset/image/giat1.png', 'style' => ''],
            ['img' => 'public/asset/image/Frame 2.png', 'style' => 'background: linear-gradient(135deg, #8b5cf6, #ec4899)'],
            ['img' => 'public/asset/image/say1.png', 'style' => 'background: linear-gradient(135deg, #f97316, #dc2626)'],
            ['img' => 'public/asset/image/giat1.png', 'style' => 'background: linear-gradient(135deg, #10b981, #14b8a6)'],
            ['img' => 'public/asset/image/Frame 2.png', 'style' => 'background: linear-gradient(135deg, #6366f1, #8b5cf6)'],
            ['img' => 'public/asset/image/say1.png', 'style' => 'background: linear-gradient(135deg, #fbbf24, #f97316)'],
          ];

          $icon = $icons[$index % count($icons)];
          ?>

          <div class="service-card">
            <div class="service-icon" style="<?= $icon['style'] ?>">
              <img src="<?= $icon['img'] ?>" class="icon-white" alt="">
            </div>

            <h3><?= htmlspecialchars($service['service_name']) ?></h3>

            <p><?= htmlspecialchars($service['summary']) ?></p>

            <p>
              <b>Giá tiền:</b> <?= number_format($service['service_price'],0,',','.') ?>
            </p>

            <a class="btn btn-primary choose-service" href="#contact">
              Đặt dịch vụ
            </a>
          </div>

          <?php
          $index++;
          endforeach;
          ?>

        </div>


      </div>
    </section>

    <!-- Process Section -->
    <section id="process">
      <div class="container">
        <div class="section-header">
          <div
            class="section-badge"
            style="background: #fed7aa; color: #ea580c"
          >
            <span>QUY TRÌNH GIAO NHẬN HÀNG ĐƠN GIẢN</span>
          </div>
          <h2>
            Chỉ Cần
            <span
              style="
                background: linear-gradient(to right, #ea580c, #ec4899);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
              "
              >4 Bước</span
            >
            Đơn Giản
          </h2>
          <p>Quy trình minh bạch, nhanh chóng và tiện lợi</p>
        </div>

        <div class="process-grid">
          <div class="process-step">
            <div class="step-number">01</div>
            <div class="process-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="30"
                height="30"
                fill="currentColor"
                class="bi bi-telephone-fill"
                viewBox="0 0 16 16"
              >
                <path
                  fill-rule="evenodd"
                  d="M1.885.511a1.745 1.745 0 0 1 2.61.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.68.68 0 0 0 .178.643l2.457 2.457a.68.68 0 0 0 .644.178l2.189-.547a1.75 1.75 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.6 18.6 0 0 1-7.01-4.42 18.6 18.6 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877z"
                />
              </svg>
            </div>
            <h3>Đặt Dịch Vụ</h3>
            <p>
              Gọi hotline hoặc đặt online qua website. Đơn giản và nhanh chóng.
            </p>
          </div>

          <div class="process-step">
            <div class="step-number">02</div>
            <div class="process-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="30"
                height="30"
                fill="currentColor"
                class="bi bi-truck"
                viewBox="0 0 16 16"
              >
                <path
                  d="M0 3.5A1.5 1.5 0 0 1 1.5 2h9A1.5 1.5 0 0 1 12 3.5V5h1.02a1.5 1.5 0 0 1 1.17.563l1.481 1.85a1.5 1.5 0 0 1 .329.938V10.5a1.5 1.5 0 0 1-1.5 1.5H14a2 2 0 1 1-4 0H5a2 2 0 1 1-3.998-.085A1.5 1.5 0 0 1 0 10.5zm1.294 7.456A2 2 0 0 1 4.732 11h5.536a2 2 0 0 1 .732-.732V3.5a.5.5 0 0 0-.5-.5h-9a.5.5 0 0 0-.5.5v7a.5.5 0 0 0 .294.456M12 10a2 2 0 0 1 1.732 1h.768a.5.5 0 0 0 .5-.5V8.35a.5.5 0 0 0-.11-.312l-1.48-1.85A.5.5 0 0 0 13.02 6H12zm-9 1a1 1 0 1 0 0 2 1 1 0 0 0 0-2m9 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2"
                />
              </svg>
            </div>
            <h3>Nhận Đồ Tận Nơi</h3>
            <p>
              Nhân viên đến tận nhà nhận đồ. Kiểm tra và lập phiếu chi tiết.
            </p>
          </div>

          <div class="process-step">
            <div class="step-number">03</div>
            <div class="process-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="30"
                height="30"
                fill="currentColor"
                class="bi bi-stars"
                viewBox="0 0 16 16"
              >
                <path
                  d="M7.657 6.247c.11-.33.576-.33.686 0l.645 1.937a2.89 2.89 0 0 0 1.829 1.828l1.936.645c.33.11.33.576 0 .686l-1.937.645a2.89 2.89 0 0 0-1.828 1.829l-.645 1.936a.361.361 0 0 1-.686 0l-.645-1.937a2.89 2.89 0 0 0-1.828-1.828l-1.937-.645a.361.361 0 0 1 0-.686l1.937-.645a2.89 2.89 0 0 0 1.828-1.828zM3.794 1.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387A1.73 1.73 0 0 0 4.593 5.69l-.387 1.162a.217.217 0 0 1-.412 0L3.407 5.69A1.73 1.73 0 0 0 2.31 4.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387A1.73 1.73 0 0 0 3.407 2.31zM10.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.16 1.16 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.16 1.16 0 0 0-.732-.732L9.1 2.137a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732z"
                />
              </svg>
            </div>
            <h3>Giặt Ủi Chuyên Nghiệp</h3>
            <p>
              Quy trình giặt chuẩn 5 sao. Máy móc hiện đại, hóa chất cao cấp.
            </p>
          </div>

          <div class="process-step">
            <div class="step-number">04</div>
            <div class="process-icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="30"
                height="30"
                fill="currentColor"
                class="bi bi-box-seam-fill"
                viewBox="0 0 16 16"
              >
                <path
                  fill-rule="evenodd"
                  d="M15.528 2.973a.75.75 0 0 1 .472.696v8.662a.75.75 0 0 1-.472.696l-7.25 2.9a.75.75 0 0 1-.557 0l-7.25-2.9A.75.75 0 0 1 0 12.331V3.669a.75.75 0 0 1 .471-.696L7.443.184l.01-.003.268-.108a.75.75 0 0 1 .558 0l.269.108.01.003zM10.404 2 4.25 4.461 1.846 3.5 1 3.839v.4l6.5 2.6v7.922l.5.2.5-.2V6.84l6.5-2.6v-.4l-.846-.339L8 5.961 5.596 5l6.154-2.461z"
                />
              </svg>
            </div>
            <h3>Giao Trả Sạch Sẽ</h3>
            <p>
              Những bộ quần áo sạch sẽ, gọn hàng sẽ được giặt ủi giao nhận nơi
              cho khách hàng.
            </p>
          </div>
        </div>

        <div style="text-align: center; margin-top: 60px">
          <a href="#contact" class="btn btn-primary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="currentColor"
              class="bi bi-telephone-fill"
              viewBox="0 0 16 16"
            >
              <path
                fill-rule="evenodd"
                d="M1.885.511a1.745 1.745 0 0 1 2.61.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.68.68 0 0 0 .178.643l2.457 2.457a.68.68 0 0 0 .644.178l2.189-.547a1.75 1.75 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.6 18.6 0 0 1-7.01-4.42 18.6 18.6 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877z"
              />
            </svg>
            <span>Liên hệ ngay để được tư vấn</span>
          </a>
        </div>
      </div>
    </section>

    <!-- Pricing Section -->
    <section id="pricing">
      <div class="container">
        <div class="section-header">
          <div class="section-badge" style="background: #dcfce7; color: #16a34a">
            <span>BẢNG GIÁ DỊCH VỤ</span>
          </div>
          <h2>
            Giá Cả
            <span
              style="
                background: linear-gradient(to right, #16a34a, #14b8a6);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
              "
              >Hợp Lý</span
            >
            Nhất
          </h2>
          <p>Chọn gói phù hợp với nhu cầu của bạn.</p>
        </div>
        <div style="margin: 60px 0">
          <div class="pricing-detail-flex">
            <!-- Left: Image -->
            <div class="pricing-detail-image">
              <div
                style="
                  border-radius: 20px;
                  overflow: hidden;
                  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
                "
              >
                <img src="public/asset/image/bang-gia.png" alt="Bảng giá dịch vụ" />
              </div>
            </div>
            <!-- Right: Pricing Table -->
            <div class="pricing-detail-table">
              <h3>BẢNG GIÁ DỊCH VỤ</h3>
              <div class="pricing-item">
                <!-- Pricing Item 1 -->
                <div class="pricing-item-detail">
                  <p>
                    <b>Giặt</b> Tối đa 3-10 kg (Quần áo thông thường, vớ, chăn mỏng
                    mềm, …) giá <b>4,000 - 40,000đ</b>/1 máy, giặt giày
                    <b>40.000đ</b>/đôi.
                  </p>
                </div>
                <!-- Pricing Item 2 -->
                <div class="pricing-item-detail">
                  <p>
                    <b>Giặt Sấy</b> Tối đa 3-10 kg (Quần áo thông thường, vớ, chăn
                    mỏng mềm, …) giá dao động từ <b>35,000 - 85,000đ</b>/1 máy.
                  </p>
                </div>
                <!-- Pricing Item 3 -->
                <div class="pricing-item-detail">
                  <p>
                    <b>Dịch vụ tính thêm</b> sấy thêm <b>10.000đ</b> vắt thêm
                    <b>10.000đ</b>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="pricing-grid">
          <div class="pricing-card">
            <div class="pricing-header">
                <div class="pricing-icon" style="background: linear-gradient(135deg, #3b82f6, #06b6d4)">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="30"
                    height="30"
                    fill="currentColor"
                    class="bi bi-star-fill"
                    viewBox="0 0 16 16"
                  >
                    <path
                      d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"
                    />
                  </svg>
                </div>
                <h3><?= $basic['service_name'] ?></h3>
            </div>

            <div class="pricing-price">
              <div class="price-amount" style="
              background: linear-gradient(to right, #f97316, #dc2626);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            ">
                <?= number_format($basic['service_price']) ?>đ / kg
              </div>
              <input type="hidden" class="price-combo" data-price="<?= $basic['service_price'] ?>">
            </div>

            <p class="description">
            <?= summaryToArray($basic['summary'])[0] ?>
          </p>

          <ul class="pricing-features">
          <?php
          $features = summaryToArray($basic['summary']);
          unset($features[0]); // bỏ dòng mô tả đầu
          foreach ($features as $f):
          ?>
            <li>
              <span class="check-icon" style="color:white">✓</span>
              <span><?= $f ?></span>
            </li>
          <?php endforeach; ?>
          </ul>

            <a class="btn btn-primary choose-service"
              data-bs-toggle="modal"
              data-bs-target="#myModal">
              Chọn gói này
            </a>
          </div>
          <div class="pricing-card">
            <div class="popular-badge">PHỔ BIẾN NHẤT</div>
            <div class="pricing-header">
              <div class="pricing-icon" style="background: linear-gradient(135deg, #16a34a, #14b8a6)">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="30"
                  height="30"
                  fill="currentColor"
                  class="bi bi-star-fill"
                  viewBox="0 0 16 16"
                >
                  <path
                    d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"
                  />
                </svg>
              </div>
              <h3><?= $standard['service_name'] ?></h3>
            </div>

            <div class="pricing-price">
              <div class="price-amount" style="
              background: linear-gradient(to right, #f97316, #dc2626);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            ">
                <?= number_format($standard['service_price']) ?>đ / kg
              </div>
              <input type="hidden" class="price-combo" data-price="<?= $standard['service_price'] ?>">
            </div>

            <p class="description">
              <?= summaryToArray($standard['summary'])[0] ?>
            </p>

            <ul class="pricing-features">
            <?php
            $features = summaryToArray($standard['summary']);
            unset($features[0]);
            foreach ($features as $f):
            ?>
              <li>
                <span class="check-icon" style="color:white">✓</span>
                <span><?= $f ?></span>
              </li>
            <?php endforeach; ?>
            </ul>

            <a class="btn btn-primary choose-service"
              data-bs-toggle="modal"
              data-bs-target="#myModal">
              Chọn gói này
            </a>
          </div>
          <div class="pricing-card">
            <div class="pricing-header">
              <div class="pricing-icon" style="background: linear-gradient(135deg, #f97316, #dc2626)">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="30"
                  height="30"
                  fill="currentColor"
                  class="bi bi-star-fill"
                  viewBox="0 0 16 16"
                >
                  <path
                    d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"
                  />
                </svg>
              </div>
              <h3><?= $premium['service_name'] ?></h3>
            </div>

            <div class="pricing-price">
              <div class="price-amount" style="
              background: linear-gradient(to right, #f97316, #dc2626);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
            ">
                <?= number_format($premium['service_price']) ?>đ / kg
              </div>
              <input type="hidden" class="price-combo" data-price="<?= $premium['service_price'] ?>">
            </div>

            <p class="description">
              <?= summaryToArray($premium['summary'])[0] ?>
            </p>

            <ul class="pricing-features">
            <?php
            $features = summaryToArray($premium['summary']);
            unset($features[0]);
            foreach ($features as $f):
            ?>
              <li>
                <span class="check-icon" style="color:white">✓</span>
                <span><?= $f ?></span>
              </li>
            <?php endforeach; ?>
            </ul>

            <a class="btn btn-primary choose-service"
              data-bs-toggle="modal"
              data-bs-target="#myModal">
              Chọn gói này
            </a>
          </div>
  

        </div>
        <!-- The Modal -->
        <div class="modal" id="myModal" tabindex="-1">
          <div class="modal-dialog">
            <div class="modal-content">
              <!-- Modal Header -->
              <div class="modal-header" style="justify-content: space-between;">
                <h4 class="modal-title">Gửi Thông Tin Cho Chúng Tôi</h4>
                <a type="button"  data-bs-dismiss="modal">
                  <!-- <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="30"
                    height="30"
                    fill="currentColor"
                    class="bi bi-x"
                    viewBox="0 0 16 16"
                  >
                    <path
                      d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"
                    />
                  </svg> -->
                  &#215;
                </a>
              </div>
              <!-- Modal body -->
              <div class="modal-body">
                <div class="contact-form">
                  <form id="contactForm" class="contactFormCombo">
                    <div class="form-group">
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        placeholder="👤 Họ và tên"
                      />
                    </div>
                    <div class="form-group">
                      <input
                        type="number"
                        id="phone"
                        name="phone"
                        required
                        placeholder="📱 SĐT"
                      />
                    </div>
                    <div class="form-group">
                      <input
                        type="text"
                        id="address"
                        name="address"
                        placeholder="🏠 Địa chỉ "
                      />
                    </div>
                    <div class="form-group">
                      <select id="service" name="service">
                        <option value="">Chọn gói dịch vụ</option>
                        <?php foreach ($packages as $combo):?>
                        <option value="<?=  $combo['id']?>" data-price="<?=  $combo['service_price']?>">
                          <?=  $combo['service_name']?>
                        </option>
                        <?php endforeach; ?>
                      </select>
                    </div>
                    <div class="form-group">
                      <input
                        type="number"
                        id="price"
                        name="price"
                        readonly
                        placeholder="Giá dịch vụ"
                      />
                    </div>
                    <div class="form-group">
                      <textarea
                        id="message"
                        name="message"
                        placeholder="📝 Nội dung cần tư vấn..."
                      ></textarea>
                    </div>
                    <button
                      type="submit"
                      class="btn btn-primary"
                      style="width: 100%; justify-content: center"
                    >
                      <span>Đặt dịch vụ</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Contact Section -->
    <section id="contact">
      <div class="container">
        <div class="section-header">
          <div class="section-badge">
            <span>LIÊN HỆ CHÚNG TÔI</span>
          </div>
          <h2>
            Đặt Dịch Vụ
            <span
              style="
                background: linear-gradient(to right, #3b82f6, #8b5cf6);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
              "
              >Ngay Hôm Nay</span
            >
          </h2>
          <p>Liên hệ ngay để được tư vấn và nhận ưu đãi đặc biệt</p>
        </div>

        <div class="contact-grid">
          <div class="contact-info">
            <h3>Thông Tin Liên Hệ</h3>

            <div class="contact-item">
              <div class="contact-item-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="currentColor"
                  class="bi bi-pin-map-fill"
                  viewBox="0 0 16 16"
                >
                  <path
                    fill-rule="evenodd"
                    d="M3.1 11.2a.5.5 0 0 1 .4-.2H6a.5.5 0 0 1 0 1H3.75L1.5 15h13l-2.25-3H10a.5.5 0 0 1 0-1h2.5a.5.5 0 0 1 .4.2l3 4a.5.5 0 0 1-.4.8H.5a.5.5 0 0 1-.4-.8z"
                  />
                  <path
                    fill-rule="evenodd"
                    d="M4 4a4 4 0 1 1 4.5 3.969V13.5a.5.5 0 0 1-1 0V7.97A4 4 0 0 1 4 3.999z"
                  />
                </svg>
              </div>
              <div>
                <h4>Địa chỉ</h4>
                <p>123 Đường Nguyễn Văn Linh, Quận 7, TP.HCM</p>
              </div>
            </div>

            <div class="contact-item">
              <div class="contact-item-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="currentColor"
                  class="bi bi-telephone-fill"
                  viewBox="0 0 16 16"
                >
                  <path
                    fill-rule="evenodd"
                    d="M1.885.511a1.745 1.745 0 0 1 2.61.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.68.68 0 0 0 .178.643l2.457 2.457a.68.68 0 0 0 .644.178l2.189-.547a1.75 1.75 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.6 18.6 0 0 1-7.01-4.42 18.6 18.6 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877z"
                  />
                </svg>
              </div>
              <div>
                <h4>Hotline</h4>
                <p>1900 8888 (Miễn phí)</p>
                <p>028 3838 8888</p>
              </div>
            </div>

            <div class="contact-item">
              <div class="contact-item-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="currentColor"
                  class="bi bi-envelope-fill"
                  viewBox="0 0 16 16"
                >
                  <path
                    d="M.05 3.555A2 2 0 0 1 2 2h12a2 2 0 0 1 1.95 1.555L8 8.414zM0 4.697v7.104l5.803-3.558zM6.761 8.83l-6.57 4.027A2 2 0 0 0 2 14h12a2 2 0 0 0 1.808-1.144l-6.57-4.027L8 9.586zm3.436-.586L16 11.801V4.697z"
                  />
                </svg>
              </div>
              <div>
                <h4>Email</h4>
                <p>info@giatui.vn</p>
                <p>support@giatui.vn</p>
              </div>
            </div>

            <div class="contact-item">
              <div class="contact-item-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  fill="currentColor"
                  class="bi bi-clock-fill"
                  viewBox="0 0 16 16"
                >
                  <path
                    d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71z"
                  />
                </svg>
              </div>
              <div>
                <h4>Giờ làm việc</h4>
                <p>Thứ 2 - Chủ nhật: 6:00 - 22:00</p>
                <p>Nhận giao 24/7</p>
              </div>
            </div>
          </div>

          <div class="contact-form">
            <h3>Gửi Thông Tin Cho Chúng Tôi</h3>
            <form id="contactForm" class="contactForm">
              <div class="form-group">
                <label for="name">Họ và tên *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                />
              </div>

              <div class="form-group">
                <label for="phone">Số điện thoại *</label>
                <input
                  type="number"
                  id="phone"
                  name="phone"
                  required
                />
              </div>

              <div class="form-group">
                <label for="address">Địa chỉ</label>
                <input
                  type="text"
                  id="address"
                  name="address"
                />
              </div>

              <div class="form-group">
                <label for="service">Dịch vụ quan tâm</label>
                <select id="service" class="service-contact" name="service">
                  <option value="">Chọn dịch vụ</option>
                  <?php foreach ($services as $service):?>
                  <option value="<?=  $service['id']?>" data-price="<?=  $service['service_price']?>">
                    <?=  $service['service_name']?>
                  </option>
                  <?php endforeach?>
                </select>
              </div>
              
              <div class="form-group">
                <label for="price">Giá dịch vụ</label>
                <input type="text" id="price-contact" name="price" readonly />
              </div>

              <div class="form-group">
                <label for="message">Ghi chú</label>
                <textarea
                  id="message"
                  name="message"
                  placeholder="Nội dung cần tư vấn..."
                ></textarea>
              </div>

              <button
                type="submit"
                class="btn btn-primary"
                style="width: 100%; justify-content: center"
              >
                <span>Đặt dịch vụ</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer>
      <div class="container">
        <div class="footer-grid">
          <div class="footer-about">
            <h3>Giặt Ủi Nhanh</h3>
            <p>
              Dịch vụ giặt ủi chuyên nghiệp hàng đầu Việt Nam. Cam kết chất
              lượng 5 sao, giá cả hợp lý, giao nhận tận nơi.
            </p>
            <div class="social-links">
              <a href="#" class="social-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  class="bi bi-facebook"
                  viewBox="0 0 16 16"
                >
                  <path
                    d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951"
                  />
                </svg>
              </a>
              <a href="#" class="social-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  class="bi bi-instagram"
                  viewBox="0 0 16 16"
                >
                  <path
                    d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.9 3.9 0 0 0-1.417.923A3.9 3.9 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.9 3.9 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.9 3.9 0 0 0-.923-1.417A3.9 3.9 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599s.453.546.598.92c.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.5 2.5 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.5 2.5 0 0 1-.92-.598 2.5 2.5 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233s.008-2.388.046-3.231c.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92s.546-.453.92-.598c.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92m-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217m0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334"
                  />
                </svg>
              </a>
              <a href="#" class="social-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  class="bi bi-twitter-x"
                  viewBox="0 0 16 16"
                >
                  <path
                    d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z"
                  />
                </svg>
              </a>
              <a href="#" class="social-icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  class="bi bi-youtube"
                  viewBox="0 0 16 16"
                >
                  <path
                    d="M8.051 1.999h.089c.822.003 4.987.033 6.11.335a2.01 2.01 0 0 1 1.415 1.42c.101.38.172.883.22 1.402l.01.104.022.26.008.104c.065.914.073 1.77.074 1.957v.075c-.001.194-.01 1.108-.082 2.06l-.008.105-.009.104c-.05.572-.124 1.14-.235 1.558a2.01 2.01 0 0 1-1.415 1.42c-1.16.312-5.569.334-6.18.335h-.142c-.309 0-1.587-.006-2.927-.052l-.17-.006-.087-.004-.171-.007-.171-.007c-1.11-.049-2.167-.128-2.654-.26a2.01 2.01 0 0 1-1.415-1.419c-.111-.417-.185-.986-.235-1.558L.09 9.82l-.008-.104A31 31 0 0 1 0 7.68v-.123c.002-.215.01-.958.064-1.778l.007-.103.003-.052.008-.104.022-.26.01-.104c.048-.519.119-1.023.22-1.402a2.01 2.01 0 0 1 1.415-1.42c.487-.13 1.544-.21 2.654-.26l.17-.007.172-.006.086-.003.171-.007A100 100 0 0 1 7.858 2zM6.4 5.209v4.818l4.157-2.408z"
                  />
                </svg>
              </a>
            </div>
          </div>

          <div class="footer-section">
            <h4>Liên Kết</h4>
            <ul class="footer-links">
              <li><a href="#home">Trang chủ</a></li>
              <li><a href="#about">Giới thiệu</a></li>
              <li><a href="#services">Dịch vụ</a></li>
              <li><a href="#process">Quy trình</a></li>
              <li><a href="#pricing">Bảng giá</a></li>
              <li><a href="#contact">Liên hệ</a></li>
            </ul>
          </div>

          <div class="footer-section">
            <h4>Dịch Vụ</h4>
            <ul class="footer-links">
              <li>Dịch vụ giặt sấy nhanh</li>
              <li>Dịch vụ giặt ủi lấy liền</li>
              <li>Dịch vụ giặt hấp giao tân nơi</li>
              <li>Dịch vụ giặt hấp áo vest, váy cưới</li>
              <li>Dịch vụ giặt khăn khách sạn, nhà hàng, Spa</li>
              <li>Dịch Vụ Vệ Sinh Giày Giặt Giày Cao Cấp</li>
            </ul>
          </div>
        </div>

        <div class="footer-bottom">
          <p>
            © 2026 Giặt Ủi Nhanh. All rights reserved. Made with ❤️ in Vietnam
          </p>
        </div>
      </div>
    </footer>

    <!-- Scroll to Top Button -->
    <button class="scroll-to-top" id="scrollToTop" aria-label="Scroll to top">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="18"
        height="18"
        fill="currentColor"
        class="bi bi-arrow-up"
        viewBox="0 0 16 16"
      >
        <path
          fill-rule="evenodd"
          d="M8 15a.5.5 0 0 0 .5-.5V2.707l3.146 3.147a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 1 0 .708.708L7.5 2.707V14.5a.5.5 0 0 0 .5.5"
        />
      </svg>
    </button>
    <!-- Toast -->
    <div class="toast-container position-fixed top-0 end-0 p-3">
      <div
        id="successToast"
        class="toast align-items-center text-bg-success border-0"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <div class="d-flex">
          <div class="toast-body">
            Đặt dịch vụ thành công! Chúng tôi sẽ liên hệ sớm.
          </div>
          <button
            type="button"
            class="btn-close btn-close-white me-2 m-auto"
            data-bs-dismiss="toast"
            aria-label="Close"
          ></button>
        </div>
      </div>
    </div>
    <div class="toast-container position-fixed top-0 end-0 p-3">
      <div
        id="successCancelOrderToast"
        class="toast align-items-center text-bg-success border-0"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        <div class="d-flex">
          <div class="toast-body">
            Hủy đơn hàng thành công!
          </div>
          <button
            type="button"
            class="btn-close btn-close-white me-2 m-auto"
            data-bs-dismiss="toast"
            aria-label="Close"
          ></button>
        </div>
      </div>
    </div>

    <script
      type="text/javascript"
      src="public/asset/js/bootstrap.bundle.min.js"
    ></script>
    <script type="text/javascript" src="public/asset/js/jquery-3.7.1.min.js"></script>
    <script type="text/javascript" src="public/asset/js/database.js"></script>
    <script type="text/javascript" src="public/asset/js/script.js"></script>
    <script src="public/asset/js/plugin/webfont/webfont.min.js"></script>
    <script>
      WebFont.load({
        google: {
          families: ["Public Sans:300,400,500,600,700"],
        },
        custom: {
          families: [
            "Font Awesome 5 Solid",
            "Font Awesome 5 Regular",
            "Font Awesome 5 Brands",
            "simple-line-icons",
          ],
          urls: ["public/asset/css/fonts.min.css"],
        },
        active: function () {
          sessionStorage.fonts = true;
        },
      });
    </script>
  </body>
</html>
