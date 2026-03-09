<?php require_once 'layout_header.php';?>
<div class="container">
    <div class="page-inner">
        <?php
            $url = "http://localhost/Giat-Ui-Nhanh/public/services";

            $response = file_get_contents($url);

            if ($response === false) {
                die("Không gọi được API");
            }

            $data = json_decode($response, true);
        ?>
        <div class="row">
            <div class="col-md-12">
                <div class="card">
                  <div class="card-header">
                    <div class="d-flex align-items-center">
                        <h4 class="card-title">Danh Sách Dịch Vụ</h4>
                        <button
                            class="btn btn-primary btn-round ms-auto"
                            data-bs-toggle="modal"
                            data-bs-target="#addRowModal"
                        >
                            <i class="fa fa-plus"></i>
                            Thêm
                        </button>
                    </div>
                  </div>
                  <div class="card-body">
                    <div class="table-responsive">
                      <table
                        id="basic-datatables"
                        class="display table table-striped table-hover"
                      >
                        <thead>
                          <tr>
                            <th>STT</th>
                            <th>Tên dịch vụ</th>
                            <th>Mô tả</th>
                            <th>Giá</th>
                            <th>Ngày tạo</th>
                            <th>Hành động</th>
                          </tr>
                        </thead>
                        <tfoot>
                          <tr>
                            <th>STT</th>
                            <th>Tên dịch vụ</th>
                            <th>Mô tả</th>
                            <th>Giá</th>
                            <th>Ngày tạo</th>
                            <th>Hành động</th>
                          </tr>
                        </tfoot>
                        <tbody>
                        <?php $i = 1;?>
                        <?php foreach($data as $services):?>
                          <tr>
                            <td><?php echo $i++; ?></td>
                            <td><?=  $services['service_name']?></td>
                            <td><?=  $services['summary']?></td>
                            <td><?= number_format($services['service_price'], 0, ',', '.') ?></td>
                            <td><?=  date("Y-m-d", strtotime($services['created_at']))?></td>
                            <td>
                                <?php
                                    $service_id = $services['id'];
                                    $service_name = $services['service_name'];
                                    $summary = $services['summary'];
                                    $service_price = $services['service_price'];
                                ?>
                                <div class="form-button-action">
                                <input type="hidden" value="<?=  $service_id?>">
                                <button
                                  type="button"
                                  title="Chi tiết"
                                  class="btn btn-link btn-primary btn-lg"
                                  data-bs-toggle="modal" 
                                  data-bs-target="#myModal"
                                  data-id="<?= $service_id?>"
                                  data-service-name="<?= $service_name?>"
                                  data-service-price="<?= $service_price?>"
                                  data-summary="<?= $summary?>"
                                  >
                                  <i class="fa fa-edit"></i>
                                </button>
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
        <div class="modal fade" id="myModal">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                <form id="serviceForm">
                    <!-- Modal Header -->
                    <div class="modal-header">
                        <h4 class="modal-title">Chi tiết dịch vụ</h4>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <!-- Modal body -->
                    <div class="modal-body">
                        <div class="row">
                            <input type="hidden" id="id" name="service_id">
                            <div class="col-md-12 col-lg-6">
                                <div class="form-group">
                                    <label for="name">Tên dịch vụ</label>      
                                    <input type="text" class="form-control" id="name" name="service_name" >
                                </div>
                            </div>
                            <div class="col-md-12 col-lg-6">
                                <div class="form-group">
                                    <label for="price">Giá</label>      
                                    <input type="number" class="form-control" id="price" name="service_price">
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-12 col-lg-12">
                                <div class="form-group">
                                    <label for="summary">Ghi chú</label>
                                    <textarea class="form-control" id="summary" rows="5" name="summary"></textarea>
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

        <!-- Add Modal -->   
        <div class="modal fade" id="addRowModal">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                <form id="addServiceForm">
                    <!-- Modal Header -->
                    <div class="modal-header">
                        <h4 class="modal-title">Thêm dịch vụ</h4>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <!-- Modal body -->
                    <div class="modal-body">
                        <div class="row">
                            <input type="hidden" id="id" name="service_id">
                            <div class="col-md-12 col-lg-6">
                                <div class="form-group">
                                    <label for="name">Tên dịch vụ</label>      
                                    <input type="text" class="form-control" id="name" name="service_name" >
                                </div>
                            </div>
                            <div class="col-md-12 col-lg-6">
                                <div class="form-group">
                                    <label for="price">Giá</label>      
                                    <input type="number" class="form-control" id="price" name="service_price">
                                </div>
                            </div>
                        </div>
                        <div class="row">
                            <div class="col-md-12 col-lg-12">
                                <div class="form-group">
                                    <label for="summary">Ghi chú</label>
                                    <textarea class="form-control" id="summary" rows="5" name="summary"></textarea>
                                </div>
                            </div>
                        </div>
                    </div>
                    <!-- Modal footer -->
                    <div class="modal-footer">
                        <button type="submit" class="btn btn-success">Lưu</button>
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

            const service_id = button.getAttribute('data-id');
            const service_name = button.getAttribute('data-service-name');
            const service_price = button.getAttribute('data-service-price');
            const summary = button.getAttribute('data-summary');         
            // Gán vào form
            document.getElementById('id').value = service_id;
            document.getElementById('name').value = service_name;
            document.getElementById('price').value = service_price;
            document.getElementById('summary').value = summary;
        });
    </script>
</div>
<?php require_once 'layout_footer.php';?>

        