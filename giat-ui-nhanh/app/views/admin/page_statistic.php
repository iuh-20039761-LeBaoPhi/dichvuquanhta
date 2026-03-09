<?php require_once 'layout_header.php';?>
<div class="container">
    <div class="page-inner">
        <div class="row">
            <div class="col-md-12">
                <div class="card">
                  <div class="card-header">
                    <div class="card-title">Thống kê doanh thu dịch vụ</div>
                  </div>
                  <div class="card-body">
                    <div class="form-group row">
                        <div class="col-md-9">
                        </div>
                        <div class="col-md-3">
                            <label for="start_date">Chọn mốc thời gian</label>
                            <input type="month" class="form-control" id="monthPicker">
                            
                        </div>
                    </div>
                    <div class="table-responsive">
                      <table class="table table-head-bg-success table-hover">
                      <thead>
                        <tr>
                          <th scope="col">#</th>
                          <th scope="col">Dịch vụ</th>
                          <th scope="col">Số đơn</th>
                          <th scope="col">Doanh thu</th>
                        </tr>
                      </thead>
                      <tbody id="revenueTable">
                      </tbody>
                    </table>
                    </div>
                  </div>
                </div>
            </div>
        </div>    
    </div>
</div>
<?php require_once 'layout_footer.php';?>

        