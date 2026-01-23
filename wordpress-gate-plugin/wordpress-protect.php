<?php
/**
 * Plugin Name: Gate Protection
 * Plugin URI: https://gate-protect.com
 * Description: Monetize bot traffic and protect content from AI scrapers - receive payments when bots access your content
 * Version: 2.0.0
 * Author: Gate
 * Author URI: https://gate-protect.com
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: gate-protect
 * Requires at least: 5.0
 * Requires PHP: 7.2
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define constants
define('GATE_PROTECT_VERSION', '2.0.0');
define('GATE_PROTECT_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('GATE_PROTECT_PLUGIN_URL', plugin_dir_url(__FILE__));
define('GATE_PROTECT_PLUGIN_FILE', __FILE__);

/**
 * Main Plugin Class
 */
class GateProtect_Main {
    private static $instance = null;
    private $options;
    
    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    private function __construct() {
        // Load options
        $this->options = get_option('gate_protect_settings', []);
        
        // Load dependencies
        add_action('plugins_loaded', [$this, 'load_dependencies']);
        
        // Register activation/deactivation hooks
        register_activation_hook(__FILE__, [$this, 'activate']);
        register_deactivation_hook(__FILE__, [$this, 'deactivate']);
    }
    
    public function load_dependencies() {
        // Check if files exist before requiring
        $includes_dir = GATE_PROTECT_PLUGIN_DIR . 'includes/';
        
        $files = [
            'admin.php',
            'api.php',
            'protection.php'
        ];
        
        foreach ($files as $file) {
            $filepath = $includes_dir . $file;
            if (file_exists($filepath)) {
                require_once $filepath;
            } else {
                // Log error for debugging
                error_log('GateProtect: Missing file ' . $file);
            }
        }
        
        // Initialize components if classes exist
        if (is_admin() && class_exists('GateProtect_Admin')) {
            new GateProtect_Admin();
        }
        
        if (class_exists('GateProtect_API') && class_exists('GateProtect_Protection')) {
            new GateProtect_API($this->options);
            new GateProtect_Protection($this->options);
        }
    }
    
    public function activate() {
        // Set default options
        $default_options = [
            'enabled' => '0',
            'api_key' => '',
            'api_url' => '',
            'subscribe_url' => home_url('/subscribe'),
            'login_url' => wp_login_url()
        ];
        
        if (!get_option('gate_protect_settings')) {
            add_option('gate_protect_settings', $default_options);
        }
        
        // Create custom database table for local caching
        global $wpdb;
        $table_name = $wpdb->prefix . 'gate_protect_cache';
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE IF NOT EXISTS $table_name (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            fingerprint_hash varchar(64) NOT NULL,
            decision text NOT NULL,
            expires_at datetime NOT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            KEY fingerprint_hash (fingerprint_hash),
            KEY expires_at (expires_at)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
        
        // Flush rewrite rules
        flush_rewrite_rules();
    }
    
    public function deactivate() {
        // Clean up scheduled events if any
        wp_clear_scheduled_hook('gate_protect_cleanup');
        
        // Flush rewrite rules
        flush_rewrite_rules();
    }
}

// Initialize plugin
function gate_protect_init() {
    GateProtect_Main::get_instance();
}
add_action('init', 'gate_protect_init');