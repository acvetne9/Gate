<?php
/**
 * Gate API Integration
 * Handles all communication with Gate backend
 * Version 1.3.0: Simplified to use API key only (no site ID required)
 */

class GateProtect_API {
    private $options;
    private $api_url;
    private $cache_duration = 300; // 5 minutes cache
    
    public function __construct($options) {
        $this->options = $options;
        $this->api_url = !empty($options['api_url']) ? $options['api_url'] : '';
    }
    
    /**
     * Check access with Gate Edge Function
     * Called server-side during the REST verify endpoint
     */
    public function check_access($user_agent, $ip, $page) {
        // If plugin not configured, allow access (fail open)
        if (empty($this->options['api_key']) || empty($this->api_url)) {
            return [
                'allowed' => true,
                'reason' => 'Plugin not configured - missing API key or URL',
                'status' => 'allowed',
                'showGatewall' => false
            ];
        }

        // Generate fingerprint hash for caching
        $fingerprint_data = $this->generate_fingerprint($user_agent, $ip);
        $fingerprint_hash = md5(json_encode($fingerprint_data) . $page);

        // Check cache first
        $cached = $this->get_cached_decision($fingerprint_hash);
        if ($cached !== null) {
            return $cached;
        }

        // Build request with server-side signals
        $body = [
            'apiKey' => $this->options['api_key'],
            'page' => $page,
            'userAgent' => $user_agent,
            'fingerprint' => $fingerprint_data,
            'referrer' => $_SERVER['HTTP_REFERER'] ?? '',
            'behavior' => [],
            'honeypotTriggered' => false,
            'pageLoadTimestamp' => (int)(microtime(true) * 1000),
        ];

        // Determine the endpoint URL (append /check-access if it's a base URL)
        $endpoint = $this->api_url;
        if (strpos($endpoint, '/check-access') === false) {
            $endpoint = rtrim($endpoint, '/') . '/check-access';
        }

        // Call Gate Edge Function
        $response = wp_remote_post($endpoint, [
            'headers' => [
                'Content-Type' => 'application/json',
                'X-Forwarded-For' => $ip,
            ],
            'body' => json_encode($body),
            'timeout' => 5,
            'sslverify' => true
        ]);

        // Handle errors (fail open - don't block on API errors)
        if (is_wp_error($response)) {
            error_log('Gate API Error: ' . $response->get_error_message());
            return [
                'allowed' => true,
                'reason' => 'API error - fail open',
                'status' => 'allowed',
                'showGatewall' => false
            ];
        }

        $status_code = wp_remote_retrieve_response_code($response);
        if ($status_code >= 500) {
            error_log('Gate API returned status: ' . $status_code);
            return [
                'allowed' => true,
                'reason' => 'API error - fail open',
                'status' => 'allowed',
                'showGatewall' => false
            ];
        }

        $response_body = wp_remote_retrieve_body($response);
        $result = json_decode($response_body, true);

        if (!$result) {
            return [
                'allowed' => true,
                'reason' => 'Invalid API response',
                'status' => 'allowed',
                'showGatewall' => false
            ];
        }

        // Cache the decision
        $this->cache_decision($fingerprint_hash, $result);

        return $result;
    }
    
    /**
     * Generate browser fingerprint for bot detection
     */
    private function generate_fingerprint($user_agent, $ip) {
        return [
            'userAgent' => $user_agent,
            'platform' => 'WordPress/' . get_bloginfo('version'),
            'ip' => $ip,
            'language' => $_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? '',
            'timezone' => get_option('timezone_string') ?: 'UTC',
            'screen' => [
                'width' => 0,
                'height' => 0,
                'colorDepth' => 24
            ],
            'timing' => [
                'pageLoadTime' => 0
            ],
            'webdriver' => false,
            'plugins' => [],
            'canvas' => null,
            'webgl' => null,
            'touchSupport' => false,
            'hardwareConcurrency' => 0,
            'deviceMemory' => 0
        ];
    }
    
    /**
     * Get cached decision
     */
    private function get_cached_decision($fingerprint_hash) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'gate_protect_cache';
        
        $result = $wpdb->get_row($wpdb->prepare(
            "SELECT decision, expires_at FROM $table_name WHERE fingerprint_hash = %s AND expires_at > NOW()",
            $fingerprint_hash
        ));
        
        if ($result) {
            return json_decode($result->decision, true);
        }
        
        return null;
    }
    
    /**
     * Cache decision
     */
    private function cache_decision($fingerprint_hash, $decision) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'gate_protect_cache';
        
        // Clean old cache entries
        $wpdb->query("DELETE FROM $table_name WHERE expires_at < NOW()");
        
        // Insert new cache entry
        $wpdb->replace(
            $table_name,
            [
                'fingerprint_hash' => $fingerprint_hash,
                'decision' => json_encode($decision),
                'expires_at' => gmdate('Y-m-d H:i:s', time() + $this->cache_duration)
            ],
            ['%s', '%s', '%s']
        );
    }
    
    /**
     * Test API connection
     */
    public function test_connection() {
        $response = $this->check_access(
            'Gate-WordPress-Test/1.3.0',
            '127.0.0.1',
            '/test'
        );

        return !empty($response) && isset($response['status']);
    }
}