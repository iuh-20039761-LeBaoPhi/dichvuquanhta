<?php
function calcPrice($km, $hour) {
    $price_km = 15000;   // 15k / km
    $price_hour = 120000; // 120k / giờ

    $total = ($km * $price_km) + ($hour * $price_hour);
    return round($total);
}
