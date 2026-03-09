<?php require_once 'layout_header.php';?>
<div class="container">
    <div class="page-inner">
        <?php
            $url = "http://localhost/Giat-Ui-Nhanh/public/orders";

            $response = file_get_contents($url);

            if ($response === false) {
                die("Không gọi được API");
            }

            $data = json_decode($response, true);

            $pending = 0;
            $cancel = 0;
            $completed = 0;

            $currentYear = date('Y');
            $revenue = 0;

            foreach ($data as $orders) {
                $orderYear = date('Y', strtotime($orders['created_at']));

                if ($orderYear == $currentYear && $orders['order_status'] === 'Pending') {
                    $pending++;
                } elseif ($orderYear == $currentYear && $orders['order_status'] === 'Cancel') {
                    $cancel++;
                } elseif ($orderYear == $currentYear && $orders['order_status'] === 'Completed') {
                    $completed++;
                }

                if ($orderYear == $currentYear && $orders['order_status'] === 'Completed') {
                    $revenue += $orders['total_price'];
                }
            }
        ?>
        <div class="row">
            <div class="col-sm-6 col-md-3">
            <div class="card card-stats card-round">
                <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-icon">
                    <div
                        class="icon-big text-center icon-primary bubble-shadow-small"
                    >
                        <i class="fas fa-redo"></i>
                    </div>
                    </div>
                    <div class="col col-stats ms-3 ms-sm-0">
                    <div class="numbers">
                        <p class="card-category">Đơn chờ xác nhận</p>
                        <h4 class="card-title"><?= $pending ?></h4>
                    </div>
                    </div>
                </div>
                </div>
            </div>
            </div>
            <div class="col-sm-6 col-md-3">
            <div class="card card-stats card-round">
                <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-icon">
                    <div
                        class="icon-big text-center icon-info bubble-shadow-small"
                    >
                        <i class="fas fa-window-close"></i>
                    </div>
                    </div>
                    <div class="col col-stats ms-3 ms-sm-0">
                    <div class="numbers">
                        <p class="card-category">Đơn hủy</p>
                        <h4 class="card-title"><?= $cancel ?></h4>
                    </div>
                    </div>
                </div>
                </div>
            </div>
            </div>
            <div class="col-sm-6 col-md-3">
            <div class="card card-stats card-round">
                <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-icon">
                    <div
                        class="icon-big text-center icon-secondary bubble-shadow-small"
                    >
                        <i class="far fa-check-circle"></i>
                    </div>
                    </div>
                    <div class="col col-stats ms-3 ms-sm-0">
                    <div class="numbers">
                        <p class="card-category">Đơn hoàn thành</p>
                        <h4 class="card-title"><?= $completed ?></h4>
                    </div>
                    </div>
                </div>
                </div>
            </div>
            </div>
            <div class="col-sm-6 col-md-3">
            <div class="card card-stats card-round">
                <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-icon">
                    <div
                        class="icon-big text-center icon-success bubble-shadow-small"
                    >
                        <i class="fas fa-luggage-cart"></i>
                    </div>
                    </div>
                    <div class="col col-stats ms-3 ms-sm-0">
                    <div class="numbers">
                        <p class="card-category">Doanh thu</p>
                        <h4 class="card-title"><?= number_format($revenue, 0, ',', '.') ?>đ</h4>
                    </div>
                    </div>
                </div>
                </div>
            </div>
            </div>
        </div>
        <div class="row">
            <div class="col-md-12">
                <div class="card">
                  <div class="card-header">
                    <h4 class="card-title">Danh Sách Đơn Đặt Dịch Vụ</h4>
                  </div>
                  <div class="card-body">
                    <div class="table-responsive">
                      <table
                        id="multi-filter-select"
                        class="display table table-striped table-hover"
                      >
                        <thead>
                          <tr>
                            <th>STT</th>
                            <th>Khách hàng</th>
                            <th>SĐT</th>
                            <th>Địa Chỉ</th>
                            <th>Dịch vụ</th>
                            <th>Giá</th>
                            <th>Trạng thái</th>
                            <th>Ngày đặt</th>
                            <th>Hành động</th>
                          </tr>
                        </thead>
                        <tfoot>
                          <tr>
                            <th>STT</th>
                            <th>Khách hàng</th>
                            <th>SĐT</th>
                            <th>Địa Chỉ</th>
                            <th>Dịch vụ</th>
                            <th>Giá</th>
                            <th>Trạng thái</th>
                            <th>Ngày đặt</th>
                          </tr>
                        </tfoot>
                        <tbody>
                        <?php $i = 1;?>
                        <?php foreach($data as $orders):?>
                          <tr>
                            <td><?php echo $i++; ?></td>
                            <td><?=  $orders['customer_name']?></td>
                            <td>0<?=  $orders['customer_tel']?></td>
                            <td><?=  $orders['customer_address']?></td>
                            <td><?=  $orders['service_name']?></td>
                            <td><?= number_format($orders['total_price'], 0, ',', '.') ?></td>
                            <td class="<?php 
                                if($orders['order_status'] == 'Pending'){
                                        echo 'text-secondary';
                                    }elseif($orders['order_status'] == 'Processing'){
                                        echo 'text-primary';
                                    }elseif($orders['order_status'] == 'Completed'){
                                        echo 'text-success';
                                    }else{
                                        echo 'text-danger';
                                    }?>">
                                
                                    <?php 
                                        if($orders['order_status'] == 'Pending'){
                                            echo 'Chờ xác nhận';
                                        }elseif($orders['order_status'] == 'Processing'){
                                            echo 'Đã xác nhận';
                                        }elseif($orders['order_status'] == 'Completed'){
                                            echo 'Đã hoàn thành';
                                        }else{
                                            echo 'Đã hủy';
                                        }
                                    ?>
                            </td>
                            <td><?=  date("Y-m-d", strtotime($orders['created_at']))?></td>
                            <td>
                                <?php
                                    $order_id = $orders['id'];
                                    $customer_name = $orders['customer_name'];
                                    $customer_tel = $orders['customer_tel'];
                                    $customer_address = $orders['customer_address'];
                                    $service_name = $orders['service_name'];
                                    $service_price = $orders['total_price'];
                                    $note = $orders['note'];
                                    $order_status = $orders['order_status'];
                                    $transaction_status = $orders['transaction_status'];
                                ?>
                                <div class="form-button-action">
                                <input type="hidden" value="<?=  $order_id?>">
                                <button
                                  type="button"
                                  title="Chi tiết"
                                  class="btn btn-link btn-primary btn-lg"
                                  data-bs-toggle="modal" 
                                  data-bs-target="#myModal"
                                  data-id="<?= $order_id?>"
                                  data-customer-name="<?= $customer_name?>"
                                  data-customer-tel="<?= $customer_tel ?>"
                                  data-customer-address="<?= $customer_address?>"
                                  data-service-name="<?= $service_name ?>"
                                  data-service-price="<?= $service_price?>"
                                  data-note="<?= $note ?>"
                                  data-order-status="<?= $order_status?>"
                                  data-transaction-status="<?= $transaction_status ?>"
                                  >
                                  <i class="fa fa-edit"></i>
                                </button>
                                <?php if ($orders['order_status'] == 'Pending'): ?>
                                    <button
                                    type="button"
                                    data-bs-toggle="tooltip"
                                    title="Hủy đơn"
                                    class="btn btn-link btn-danger cancel-order-btn"
                                    data-id="<?= $order_id?>"
                                    data-order-status="Cancel"
                                    data-transaction-status="<?= $transaction_status ?>"
                                    >
                                    <i class="fa fa-times"></i>
                                    </button>
                                <?php endif; ?>

                              </div>
                            </td>
                          </tr>
                        <?php endforeach;?>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
            </div>
        </div>
        <!-- The Modal -->
        <div class="modal fade" tabindex="-1" role="dialog" aria-hidden="true" id="myModal">
            <div class="modal-dialog modal-lg" role="document">
                <div class="modal-content">
                <form id="orderForm">
                    <!-- Modal Header -->
                    <div class="modal-header">
                        <h4 class="modal-title">Chi tiết đơn hàng</h4>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <!-- Modal body -->
                    <div class="modal-body">
                        <div class="row">
                            <input type="hidden" id="id" name="order_id">
                            <div class="col-md-12 col-lg-6">
                                <div class="form-group">
                                    <label for="name">Khách hàng</label>      
                                    <input type="text" class="form-control" id="name" >
                                </div>
                            </div>
                            <div class="col-md-12 col-lg-6">
                                <div class="form-group">
                                    <label for="tel">SĐT</label>
                                    <input type="tel" class="form-control" id="tel" >
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-12 col-lg-12">
                                <div class="form-group">
                                    <label for="address">Địa chỉ</label>      
                                    <input type="text" class="form-control" id="address" >
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-12 col-lg-6">
                                <div class="form-group">
                                    <label for="service">Dịch vụ</label>      
                                    <input type="text" class="form-control" id="service" >
                                </div>
                            </div>
                            <div class="col-md-12 col-lg-6">
                                <div class="form-group">
                                    <label for="price">Giá</label>      
                                    <input type="number" class="form-control" id="price" >
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-12 col-lg-12">
                                <div class="form-group">
                                    <label for="note">Ghi chú</label>
                                    <textarea class="form-control" id="note" rows="5"></textarea>
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-12 col-lg-6">
                                <div class="form-group">
                                    <label for="order_status">Trạng thái đơn hàng</label>
                                    <select class="form-select form-control" id="order_status" name="order_status">
                                        <option value="Pending">Chờ xác nhận</option>
                                        <option value="Processing">Đã xác nhận</option>
                                        <option value="Completed">Đã hoàn thành</option>
                                        <option value="Cancel">Đã hủy</option>
                                    </select>
                                </div>
                            </div>
                            <div class="col-md-12 col-lg-6">
                                <div class="form-group">
                                    <label for="transaction_status">Trạng thái thanh toán</label>
                                    <select class="form-select form-control" id="transaction_status" name="transaction_status">
                                        <option value="UnPaid">Chưa thanh toán</option>
                                        <option value="Paid">Đã thanh toán</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Modal footer -->
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-success">Cập nhật</button>
                    </div>
                </form>           
                </div>
            </div>
        </div>
    </div>
    <script>
        const updateModal = document.getElementById('myModal');
        updateModal.addEventListener('show.bs.modal', function (event) {
            const button = event.relatedTarget; // Nút đã bấm

            const order_id = button.getAttribute('data-id');
            const customer_name = button.getAttribute('data-customer-name');
            const customer_tel = button.getAttribute('data-customer-tel');
            const customer_address = button.getAttribute('data-customer-address');
            const service_name = button.getAttribute('data-service-name');
            const service_price = button.getAttribute('data-service-price');
            const note = button.getAttribute('data-note');
            const order_status = button.getAttribute('data-order-status');
            const transaction_status = button.getAttribute('data-transaction-status');                
            // Gán vào form
            document.getElementById('id').value = order_id;
            document.getElementById('name').value = customer_name;
            document.getElementById('tel').value = customer_tel;
            document.getElementById('address').value = customer_address;
            document.getElementById('service').value = service_name;
            document.getElementById('price').value = service_price;
            document.getElementById('note').value = note;
            document.getElementById('order_status').value = order_status;
            document.getElementById('transaction_status').value = transaction_status;
        });
    </script>
</div>
<?php require_once 'layout_footer.php';?>

        