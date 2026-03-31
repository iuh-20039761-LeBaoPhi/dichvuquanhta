<?php
/**
 * Helper function to retrieve settings from the cai_dat_he_thong table.
 *
 * @param mysqli $conn The database connection object.
 * @param string $key The setting key to retrieve.
 * @param mixed $default The default value if the key is not found.
 * @return mixed The setting value or default.
 */
if (!function_exists('getSetting')) {
    function getSetting($conn, $key, $default = '') {
        $stmt = $conn->prepare("SELECT gia_tri_cai_dat AS setting_value FROM cai_dat_he_thong WHERE khoa_cai_dat = ? LIMIT 1");
        if ($stmt) {
            $stmt->bind_param("s", $key);
            $stmt->execute();
            $result = $stmt->get_result();
            if ($row = $result->fetch_assoc()) {
                $stmt->close();
                return $row['setting_value'];
            }
            $stmt->close();
        }
        return $default;
    }
}
?>
