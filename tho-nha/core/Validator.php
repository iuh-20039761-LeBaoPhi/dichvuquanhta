<?php
class Validator {
    public static function required(array $data, array $fields): ?string {
        foreach ($fields as $field) {
            if (empty(trim($data[$field] ?? ''))) {
                return "Trường '$field' là bắt buộc";
            }
        }
        return null;
    }

    public static function phone(string $phone): bool {
        return (bool) preg_match('/^(0|\+84)[0-9]{9}$/', $phone);
    }

    public static function email(string $email): bool {
        return filter_var($email, FILTER_VALIDATE_EMAIL) !== false;
    }

    public static function sanitize(string $value): string {
        return htmlspecialchars(strip_tags(trim($value)), ENT_QUOTES, 'UTF-8');
    }
}
