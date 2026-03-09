<footer class="footer">
    <div class="container-fluid d-flex justify-content-between">
    <nav class="pull-left">
        <!-- <ul class="nav">
            <li class="nav-item">
            <a class="nav-link" href="http://www.themekita.com">
                ThemeKita
            </a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="#"> Help </a>
            </li>
            <li class="nav-item">
                <a class="nav-link" href="#"> Licenses </a>
            </li>
        </ul> -->
    </nav>
            <div class="copyright">
                 © 2026 Giặt Ủi Nhanh. All rights reserved. Made with ❤️ in Vietnam
            </div>
            <div>
                <!-- Distributed by
                <a target="_blank" href="https://themewagon.com/">ThemeWagon</a>. -->
            </div>
        </div>
</footer>
      </div>

    </div>
    <!--   Core JS Files   -->
    <script src="public/asset/js/core/jquery-3.7.1.min.js"></script>
    <script src="public/asset/js/core/popper.min.js"></script>
    <script src="public/asset/js/core/bootstrap.min.js"></script>

    <!-- jQuery Scrollbar -->
    <script src="public/asset/js/plugin/jquery-scrollbar/jquery.scrollbar.min.js"></script>

    <!-- Chart JS -->
    <script src="public/asset/js/plugin/chart.js/chart.min.js"></script>

    <!-- jQuery Sparkline -->
    <script src="public/asset/js/plugin/jquery.sparkline/jquery.sparkline.min.js"></script>

    <!-- Chart Circle -->
    <script src="public/asset/js/plugin/chart-circle/circles.min.js"></script>

    <!-- Datatables -->
    <script src="public/asset/js/plugin/datatables/datatables.min.js"></script>

    <!-- Bootstrap Notify -->
    <script src="public/asset/js/plugin/bootstrap-notify/bootstrap-notify.min.js"></script>

    <!-- jQuery Vector Maps -->
    <script src="public/asset/js/plugin/jsvectormap/jsvectormap.min.js"></script>
    <script src="public/asset/js/plugin/jsvectormap/world.js"></script>

    <!-- Sweet Alert -->
    <script src="public/asset/js/plugin/sweetalert/sweetalert.min.js"></script>

    <!-- Kaiadmin JS -->
    <script src="public/asset/js/kaiadmin.min.js"></script>
    <script type="text/javascript" src="public/asset/js/database.js"></script>

    <!-- Fonts and icons -->
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

    <script>
      $(document).ready(function () {
        $("#basic-datatables").DataTable({
           pageLength: 5,
        });
        $("#multi-filter-select").DataTable({
          pageLength: 5,
          initComplete: function () {
            this.api()
              .columns()
              .every(function () {
                var column = this;
                var select = $(
                  '<select class="form-select"><option value=""></option></select>'
                )
                  .appendTo($(column.footer()).empty())
                  .on("change", function () {
                    var val = $.fn.dataTable.util.escapeRegex($(this).val());

                    column
                      .search(val ? "^" + val + "$" : "", true, false)
                      .draw();
                  });

                column
                  .data()
                  .unique()
                  .sort()
                  .each(function (d, j) {
                    select.append(
                      '<option value="' + d + '">' + d + "</option>"
                    );
                  });
              });
          },
        });
      });
    </script>
  </body>
</html>
