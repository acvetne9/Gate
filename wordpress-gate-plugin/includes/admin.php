<?php
/**
 * Admin Interface
 */

if (!defined('ABSPATH')) {
    exit;
}

class GateProtect_Admin {
    public function __construct() {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('add_meta_boxes', [$this, 'add_meta_box']);
        add_action('save_post', [$this, 'save_meta_box'], 10, 2);
        add_action('admin_enqueue_scripts', [$this, 'enqueue_admin_assets']);
        add_action('admin_notices', [$this, 'show_admin_notices']);
        add_filter('plugin_action_links_' . plugin_basename(GATE_PROTECT_PLUGIN_FILE), [$this, 'add_settings_link']);
    }
    
    public function add_settings_link($links) {
        $settings_link = '<a href="' . admin_url('options-general.php?page=gate-protect') . '">Settings</a>';
        array_unshift($links, $settings_link);
        return $links;
    }
    
    public function add_admin_menu() {
        add_options_page(
            'Gate Protection Settings',
            'Gate Protection',
            'manage_options',
            'gate-protect',
            [$this, 'render_settings_page']
        );
    }
    
    public function register_settings() {
        register_setting('gate_protect', 'gate_protect_settings', [$this, 'sanitize_settings']);
        
        // API Settings Section
        add_settings_section('api_settings', 'API Configuration', [$this, 'render_api_section'], 'gate-protect');
        add_settings_field('enabled', 'Enable Protection', [$this, 'render_enabled_field'], 'gate-protect', 'api_settings');
        add_settings_field('api_key', 'API Key', [$this, 'render_api_key_field'], 'gate-protect', 'api_settings');
        add_settings_field('api_url', 'API URL', [$this, 'render_api_url_field'], 'gate-protect', 'api_settings');
        
        // URL Settings Section
        add_settings_section('url_settings', 'Redirect URLs', [$this, 'render_url_section'], 'gate-protect');
        add_settings_field('subscribe_url', 'Subscribe URL', [$this, 'render_subscribe_url_field'], 'gate-protect', 'url_settings');
        add_settings_field('login_url', 'Login URL', [$this, 'render_login_url_field'], 'gate-protect', 'url_settings');
        add_settings_field('redirect_immediately', 'Redirect Behavior', [$this, 'render_redirect_field'], 'gate-protect', 'url_settings');
    }
    
    public function sanitize_settings($input) {
        $sanitized = [];
        $sanitized['enabled'] = !empty($input['enabled']) ? '1' : '0';
        $sanitized['api_key'] = sanitize_text_field($input['api_key'] ?? '');
        $sanitized['api_url'] = esc_url_raw($input['api_url'] ?? '');
        $sanitized['subscribe_url'] = esc_url_raw($input['subscribe_url'] ?? home_url('/subscribe'));
        $sanitized['login_url'] = esc_url_raw($input['login_url'] ?? wp_login_url());
        $sanitized['redirect_immediately'] = !empty($input['redirect_immediately']) ? '1' : '0';

        return $sanitized;
    }
    
    public function render_settings_page() {
        $options = get_option('gate_protect_settings', []);
        $is_configured = !empty($options['api_key']) && !empty($options['api_url']);
        ?>
        <div class="wrap">
            <h1 style="display:flex;align-items:center;gap:12px">
                <span class="dashicons dashicons-shield" style="color:#3b82f6;font-size:32px"></span>
                Gate Protection Settings
            </h1>
            
            <?php settings_errors('gate_protect'); ?>
            
            <?php if ($is_configured): ?>
                <div class="notice notice-success" style="padding:16px">
                    <p style="margin:0"><strong>✓ Connected!</strong> Your site is protected.</p>
                </div>
            <?php else: ?>
                <div class="notice notice-warning" style="padding:16px">
                    <p style="margin:0"><strong>⚠ Not Connected</strong> Enter credentials to activate.</p>
                </div>
            <?php endif; ?>
            
            <div style="background:#fff;padding:24px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.1);margin-top:20px">
                <form method="post" action="options.php">
                    <?php
                    settings_fields('gate_protect');
                    do_settings_sections('gate-protect');
                    submit_button('Save Settings');
                    ?>
                </form>
            </div>
            
            <?php if ($is_configured && $options['enabled'] === '1'): ?>
            <div style="background:#fff;padding:24px;border-radius:8px;box-shadow:0 1px 3px rgba(0,0,0,.1);margin-top:20px">
                <h2 style="margin-top:0">🧪 Testing</h2>
                <ol style="line-height:2">
                    <li>Protect a post (check "Protect this content" in editor)</li>
                    <li>View in incognito window - you should be redirected to: <code><?php echo esc_html($options['subscribe_url']); ?></code></li>
                    <li>Test bot: <code>curl <?php echo home_url(); ?>/your-post/</code></li>
                    <li>Check logs in Gate dashboard</li>
                </ol>
            </div>
            <?php endif; ?>
        </div>
        <?php
    }
    
    public function render_api_section() {
        echo '<p>Configure Gate Protection API. Get your <strong>API Key</strong> and <strong>API URL</strong> from <a href="https://gate-protect.com/dashboard" target="_blank">your dashboard</a>.</p>';
    }
    
    public function render_url_section() {
        echo '<p>Configure where users should be redirected when they hit a gate</p>';
    }
    
    public function render_enabled_field() {
        $options = get_option('gate_protect_settings', []);
        $checked = !empty($options['enabled']);
        ?>
        <label>
            <input type="checkbox" name="gate_protect_settings[enabled]" value="1" <?php checked($checked); ?>>
            <strong>Enable Gate Protection</strong>
        </label>
        <p class="description">When disabled, all content is accessible. When enabled, bots will be charged to access protected content.</p>
        <?php
    }
    
    public function render_api_key_field() {
        $options = get_option('gate_protect_settings', []);
        $value = $options['api_key'] ?? '';
        ?>
        <input type="password" name="gate_protect_settings[api_key]" value="<?php echo esc_attr($value); ?>"
               placeholder="api_abc123xyz..." class="regular-text code">
        <p class="description">Get your API key from Gate dashboard. This is all you need!</p>
        <?php
    }
    
    public function render_api_url_field() {
        $options = get_option('gate_protect_settings', []);
        $value = $options['api_url'] ?? '';
        ?>
        <input type="url" name="gate_protect_settings[api_url]" value="<?php echo esc_attr($value); ?>"
               placeholder="https://your-api.example.com/check-access" class="regular-text code" required>
        <p class="description">Your Gate API endpoint URL (provided in dashboard). <strong>Required.</strong></p>
        <?php
    }
    
    public function render_subscribe_url_field() {
        $options = get_option('gate_protect_settings', []);
        $value = $options['subscribe_url'] ?? home_url('/subscribe');
        ?>
        <input type="url" name="gate_protect_settings[subscribe_url]" value="<?php echo esc_attr($value); ?>" 
               placeholder="<?php echo home_url('/subscribe'); ?>" class="regular-text">
        <p class="description">Where to send users to subscribe (e.g., your pricing page, checkout, or external site)</p>
        <?php
    }
    
    public function render_login_url_field() {
        $options = get_option('gate_protect_settings', []);
        $value = $options['login_url'] ?? wp_login_url();
        ?>
        <input type="url" name="gate_protect_settings[login_url]" value="<?php echo esc_attr($value); ?>" 
               placeholder="<?php echo wp_login_url(); ?>" class="regular-text">
        <p class="description">Where existing subscribers should login</p>
        <?php
    }
    
    public function render_redirect_field() {
        $options = get_option('gate_protect_settings', []);
        $checked = !empty($options['redirect_immediately']);
        ?>
        <label>
            <input type="checkbox" name="gate_protect_settings[redirect_immediately]" value="1" <?php checked($checked); ?>>
            Redirect immediately to subscribe page (skip gate message)
        </label>
        <p class="description">If unchecked, shows a nice gate page first with subscribe button</p>
        <?php
    }
    
    public function add_meta_box() {
        add_meta_box('gate_protect_box', '🛡️ Gate Protection', [$this, 'render_meta_box'],
                     ['post', 'page'], 'side', 'high');
    }
    
    public function render_meta_box($post) {
        wp_nonce_field('gate_protect_meta', 'gate_protect_nonce');
        $protected = get_post_meta($post->ID, '_gate_protected', true);
        $options = get_option('gate_protect_settings', []);
        $is_configured = !empty($options['api_key']) && !empty($options['api_url']) && $options['enabled'] === '1';
        ?>
        <div style="padding:12px 0">
            <?php if (!$is_configured): ?>
                <div style="background:#fff3cd;border-left:4px solid #ffc107;padding:12px;margin-bottom:16px">
                    <strong style="color:#856404">⚠️ Not Configured</strong><br>
                    <small style="color:#856404">
                        <a href="<?php echo admin_url('options-general.php?page=gate-protect'); ?>">Configure settings</a>
                    </small>
                </div>
            <?php endif; ?>
            
            <label style="display:flex;align-items:flex-start;gap:12px;cursor:pointer;padding:8px;border-radius:4px">
                <input type="checkbox" name="gate_protected" value="1" <?php checked($protected, '1'); ?>
                       style="width:20px;height:20px;margin-top:2px">
                <div style="flex:1">
                    <strong style="font-size:14px">Protect this content</strong>
                    <p style="margin:8px 0 0 0;color:#666;font-size:13px">Charge bots to access & show gate to humans (if enabled)</p>
                </div>
            </label>
            
            <?php if ($protected === '1'): ?>
                <div style="background:#d1fae5;border-left:4px solid #10b981;padding:12px;margin-top:16px">
                    <strong style="color:#065f46">✓ Protection Active</strong>
                </div>
            <?php endif; ?>
        </div>
        <?php
    }
    
    public function save_meta_box($post_id, $post) {
        if (!isset($_POST['gate_protect_nonce']) || 
            !wp_verify_nonce($_POST['gate_protect_nonce'], 'gate_protect_meta')) {
            return;
        }
        
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
        if (!current_user_can('edit_post', $post_id)) return;
        
        $protected = isset($_POST['gate_protected']) ? '1' : '0';
        update_post_meta($post_id, '_gate_protected', $protected);
    }
    
    public function enqueue_admin_assets($hook) {
        // Add any admin CSS/JS here if needed
    }
    
    public function show_admin_notices() {
        $options = get_option('gate_protect_settings', []);

        if (empty($options['api_key']) || empty($options['api_url'])) {
            $screen = get_current_screen();
            if ($screen && in_array($screen->id, ['post', 'page', 'edit-post', 'edit-page'])) {
                ?>
                <div class="notice notice-warning is-dismissible">
                    <p><strong>Gate Protection:</strong>
                       <a href="<?php echo admin_url('options-general.php?page=gate-protect'); ?>">Add your API credentials</a>
                       to start monetizing bot traffic</p>
                </div>
                <?php
            }
        }
    }
}