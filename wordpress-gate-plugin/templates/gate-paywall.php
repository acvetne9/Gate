<?php
/**
 * Plugin Name: GateProtect
 * Plugin URI: https://gateprotect.com
 * Description: Protect your content from AI scrapers with server-side bot detection and flexible gates
 * Version: 1.0.0
 * Author: GateProtect
 * Author URI: https://gateprotect.com
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
define('GATE_PROTECT_VERSION', '1.0.0');
define('GATE_PROTECT_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('GATE_PROTECT_PLUGIN_URL', plugin_dir_url(__FILE__));

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
        $this->options = get_option('gate_protect_settings', []);
        
        // Load dependencies
        $this->load_dependencies();
        
        // Initialize components
        $this->init_components();
        
        // Register activation/deactivation hooks
        register_activation_hook(__FILE__, [$this, 'activate']);
        register_deactivation_hook(__FILE__, [$this, 'deactivate']);
    }
    
    private function load_dependencies() {
        require_once GATE_PROTECT_PLUGIN_DIR . 'includes/admin.php';
        require_once GATE_PROTECT_PLUGIN_DIR . 'includes/api.php';
        require_once GATE_PROTECT_PLUGIN_DIR . 'includes/protection.php';
    }
    
    private function init_components() {
        // Initialize admin interface
        if (is_admin()) {
            new GateProtect_Admin();
        }
        
        // Initialize API and protection
        new GateProtect_API($this->options);
        new GateProtect_Protection($this->options);
    }
    
    public function activate() {
        // Set default options
        $default_options = [
            'enabled' => '0',
            'site_id' => '',
            'api_key' => '',
            'api_url' => 'https://YOUR-PROJECT.supabase.co/functions/v1/check-access'
        ];
        
        add_option('gate_protect_settings', $default_options);
        
        // Create custom database table for local caching (optional)
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
    }
    
    public function deactivate() {
        // Clean up scheduled events if any
        wp_clear_scheduled_hook('gate_protect_cleanup');
    }
}

// Initialize plugin
GateProtect_Main::get_instance();