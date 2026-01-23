<?php
/**
 * Protection Logic - Server-Side Content Gating
 *
 * Content is NEVER sent in the initial HTML response.
 * Instead, a placeholder is shown and the real content is loaded
 * via an authenticated REST endpoint after bot verification.
 *
 * Flow:
 *   1. WordPress renders the page
 *   2. Output buffer intercepts HTML, strips post content
 *   3. A lightweight JS loader is injected in its place
 *   4. JS runs PoW challenge + fingerprint collection
 *   5. Posts solution to REST endpoint
 *   6. If verified → receives signed token
 *   7. Fetches content via REST with token
 *   8. Injects content into the DOM
 *
 * For bots: No JS execution → no content ever arrives.
 * For humans: ~300ms delay on first load, then cached cookie.
 */

if (!defined('ABSPATH')) {
    exit;
}

class GateProtect_Protection {
    private $options;
    private $api;
    private $challenge_secret;

    public function __construct($options) {
        $this->options = $options;
        $this->api = new GateProtect_API($options);
        $this->challenge_secret = defined('GATE_CHALLENGE_SECRET')
            ? GATE_CHALLENGE_SECRET
            : wp_salt('auth');

        // Hook into template rendering to strip content
        add_action('template_redirect', [$this, 'check_protection'], 1);

        // Register REST API endpoints
        add_action('rest_api_init', [$this, 'register_rest_routes']);

        // Shortcode for manual protection
        add_shortcode('gate', [$this, 'gate_shortcode']);

        // Body class
        add_filter('body_class', [$this, 'add_body_class']);
    }

    /**
     * Register REST API routes for content delivery and verification
     */
    public function register_rest_routes() {
        register_rest_route('gate-protect/v1', '/verify', [
            'methods' => 'POST',
            'callback' => [$this, 'handle_verify'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route('gate-protect/v1', '/content/(?P<id>\d+)', [
            'methods' => 'GET',
            'callback' => [$this, 'handle_content'],
            'permission_callback' => [$this, 'verify_content_token'],
            'args' => [
                'id' => [
                    'validate_callback' => function($param) {
                        return is_numeric($param);
                    }
                ]
            ]
        ]);
    }

    /**
     * Handle verification request (PoW solution + fingerprint)
     * Returns a signed token if verification passes
     */
    public function handle_verify($request) {
        $params = $request->get_json_params();

        $challenge = sanitize_text_field($params['challenge'] ?? '');
        $nonce = intval($params['nonce'] ?? 0);
        $hash = sanitize_text_field($params['hash'] ?? '');
        $difficulty = intval($params['difficulty'] ?? 4);
        $fingerprint = $params['fingerprint'] ?? [];
        $post_id = intval($params['postId'] ?? 0);

        if (!$challenge || !$hash || !$post_id) {
            return new WP_REST_Response(['error' => 'Invalid request'], 400);
        }

        // Verify Proof-of-Work
        $data = $challenge . ':' . $nonce;
        $computed = hash('sha256', $data);
        $prefix = str_repeat('0', $difficulty);

        if (substr($computed, 0, $difficulty) !== $prefix || $computed !== $hash) {
            return new WP_REST_Response(['error' => 'Invalid proof of work'], 403);
        }

        // Check fingerprint for headless indicators
        if ($this->is_headless_fingerprint($fingerprint)) {
            return new WP_REST_Response(['error' => 'Automated browser detected'], 403);
        }

        // Also run server-side bot detection via Gate API
        $user_agent = $_SERVER['HTTP_USER_AGENT'] ?? '';
        $ip = $this->get_client_ip();
        $api_result = $this->api->check_access($user_agent, $ip, $_SERVER['REQUEST_URI'] ?? '/');

        // If Gate API says it's a bot requiring payment, block
        if (isset($api_result['status']) && $api_result['status'] === 'payment_required') {
            return new WP_REST_Response([
                'error' => 'Bot detected',
                'paymentRequired' => true,
                'paymentUrl' => $api_result['paymentUrl'] ?? null,
            ], 402);
        }

        // Generate signed content token (valid 1 hour, bound to IP)
        $token = $this->create_content_token($post_id, $ip);

        return new WP_REST_Response([
            'token' => $token,
            'expiresIn' => 3600,
        ], 200);
    }

    /**
     * Serve protected content (only with valid token)
     */
    public function handle_content($request) {
        $post_id = intval($request->get_param('id'));

        $post = get_post($post_id);
        if (!$post || $post->post_status !== 'publish') {
            return new WP_REST_Response(['error' => 'Not found'], 404);
        }

        // Apply content filters (shortcodes, blocks, etc.)
        $content = apply_filters('the_content', $post->post_content);

        return new WP_REST_Response([
            'content' => $content,
        ], 200);
    }

    /**
     * Verify content token from Authorization header
     */
    public function verify_content_token($request) {
        $auth = $request->get_header('Authorization');
        if (!$auth || strpos($auth, 'Bearer ') !== 0) {
            return false;
        }

        $token = substr($auth, 7);
        return $this->validate_content_token($token, $request->get_param('id'));
    }

    /**
     * Check if current request should be protected
     */
    public function check_protection() {
        // Skip if plugin disabled
        if (empty($this->options['enabled'])) {
            return;
        }

        // Skip admin, AJAX, REST API, cron
        if (is_admin() ||
            wp_doing_ajax() ||
            defined('REST_REQUEST') ||
            (defined('DOING_CRON') && DOING_CRON)) {
            return;
        }

        // Skip non-singular
        if (!is_singular()) {
            return;
        }

        // Check if post is protected
        $post_id = get_queried_object_id();
        $is_protected = get_post_meta($post_id, '_gate_protected', true);

        if ($is_protected !== '1') {
            return;
        }

        // Logged in users with access skip protection
        if (is_user_logged_in() && $this->user_has_access()) {
            return;
        }

        // Check for valid gate cookie (already verified visitor)
        if ($this->verify_gate_cookie()) {
            return;
        }

        // Start output buffering to strip content from HTML
        ob_start([$this, 'filter_output']);
    }

    /**
     * Output buffer callback - strips content and injects loader
     */
    public function filter_output($html) {
        $post_id = get_queried_object_id();
        if (!$post_id) return $html;

        // Find and replace the post content in HTML
        // Look for the content within common content wrappers
        $content_patterns = [
            // Standard WordPress themes
            '/<div[^>]*class="[^"]*entry-content[^"]*"[^>]*>(.*?)<\/div>/s',
            '/<div[^>]*class="[^"]*post-content[^"]*"[^>]*>(.*?)<\/div>/s',
            '/<div[^>]*class="[^"]*article-content[^"]*"[^>]*>(.*?)<\/div>/s',
            '/<article[^>]*>(.*?)<\/article>/s',
            // Block themes
            '/<div[^>]*class="[^"]*wp-block-post-content[^"]*"[^>]*>(.*?)<\/div>/s',
        ];

        $replaced = false;
        $challenge = wp_generate_uuid4();
        $difficulty = 4;
        $rest_url = esc_url(rest_url('gate-protect/v1'));

        $loader_html = $this->get_loader_html($post_id, $challenge, $difficulty, $rest_url);

        foreach ($content_patterns as $pattern) {
            if (preg_match($pattern, $html)) {
                // Replace content with loader, preserving the wrapper element
                $html = preg_replace_callback($pattern, function($matches) use ($loader_html) {
                    // Get the opening tag (everything before the content)
                    $full_match = $matches[0];
                    $inner = $matches[1];
                    // Replace just the inner content
                    return str_replace($inner, $loader_html, $full_match);
                }, $html, 1);
                $replaced = true;
                break;
            }
        }

        // Fallback: inject before </body> if no content wrapper found
        if (!$replaced) {
            $overlay = $this->get_overlay_html($post_id, $challenge, $difficulty, $rest_url);
            $html = str_replace('</body>', $overlay . '</body>', $html);
        }

        return $html;
    }

    /**
     * Generate the content loader HTML + JS
     * This replaces the actual content in the page
     */
    private function get_loader_html($post_id, $challenge, $difficulty, $rest_url) {
        $nonce = wp_create_nonce('gate_protect_' . $post_id);

        return '
        <div id="gate-protect-loader" style="padding:40px 0;text-align:center;">
            <div id="gate-spinner" style="width:32px;height:32px;border:3px solid #e2e8f0;border-top-color:#3b82f6;border-radius:50%;animation:gate-spin 0.8s linear infinite;margin:0 auto 16px;"></div>
            <p id="gate-status" style="color:#64748b;font-size:14px;margin:0;">Loading content...</p>
            <style>@keyframes gate-spin{to{transform:rotate(360deg)}}</style>
        </div>
        <div id="gate-content" style="display:none;"></div>
        <script>
        (function(){
            var postId = ' . intval($post_id) . ';
            var challenge = "' . esc_js($challenge) . '";
            var difficulty = ' . intval($difficulty) . ';
            var restUrl = "' . esc_js($rest_url) . '";

            function getFingerprint() {
                var c = document.createElement("canvas");
                var ctx = c.getContext("2d");
                ctx.textBaseline = "top";
                ctx.font = "14px Arial";
                ctx.fillText("gate", 2, 2);
                var canvasFp = c.toDataURL().slice(0, 80);
                var webgl = null;
                try {
                    var gl = document.createElement("canvas").getContext("webgl");
                    if (gl) webgl = { r: gl.getParameter(gl.RENDERER), v: gl.getParameter(gl.VENDOR) };
                } catch(e) {}
                return {
                    ua: navigator.userAgent,
                    lang: navigator.language,
                    platform: navigator.platform,
                    cores: navigator.hardwareConcurrency || 0,
                    sw: screen.width, sh: screen.height,
                    cd: screen.colorDepth, dpr: window.devicePixelRatio || 1,
                    touch: "ontouchstart" in window,
                    webdriver: !!navigator.webdriver,
                    canvas: canvasFp, webgl: webgl,
                    plugins: Array.from(navigator.plugins || []).slice(0, 5).map(function(p){ return p.name; }),
                    tz: Intl.DateTimeFormat().resolvedOptions().timeZone
                };
            }

            async function solvePoW(ch, diff) {
                var prefix = "0".repeat(diff);
                var nonce = 0;
                while (true) {
                    var data = ch + ":" + nonce;
                    var buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(data));
                    var hex = Array.from(new Uint8Array(buf)).map(function(b){ return b.toString(16).padStart(2, "0"); }).join("");
                    if (hex.startsWith(prefix)) return { nonce: nonce, hash: hex };
                    nonce++;
                    if (nonce % 50000 === 0) await new Promise(function(r){ setTimeout(r, 0); });
                }
            }

            async function loadContent() {
                try {
                    var fp = getFingerprint();
                    if (fp.webdriver) {
                        document.getElementById("gate-status").textContent = "Access denied.";
                        document.getElementById("gate-spinner").style.display = "none";
                        return;
                    }

                    document.getElementById("gate-status").textContent = "Verifying...";
                    var pow = await solvePoW(challenge, difficulty);

                    var verifyRes = await fetch(restUrl + "/verify", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            challenge: challenge,
                            nonce: pow.nonce,
                            hash: pow.hash,
                            difficulty: difficulty,
                            fingerprint: fp,
                            postId: postId
                        })
                    });

                    if (verifyRes.status === 402) {
                        var errData = await verifyRes.json();
                        if (errData.paymentUrl) window.location.href = errData.paymentUrl;
                        else {
                            document.getElementById("gate-status").textContent = "Payment required for automated access.";
                            document.getElementById("gate-spinner").style.display = "none";
                        }
                        return;
                    }

                    if (!verifyRes.ok) {
                        document.getElementById("gate-status").textContent = "Verification failed.";
                        document.getElementById("gate-spinner").style.display = "none";
                        return;
                    }

                    var verifyData = await verifyRes.json();
                    var token = verifyData.token;

                    // Set cookie for future visits
                    document.cookie = "__gate_wp=" + token + "; path=/; max-age=3600; secure; samesite=lax";

                    // Fetch content
                    var contentRes = await fetch(restUrl + "/content/" + postId, {
                        headers: { "Authorization": "Bearer " + token }
                    });

                    if (!contentRes.ok) {
                        document.getElementById("gate-status").textContent = "Failed to load content.";
                        document.getElementById("gate-spinner").style.display = "none";
                        return;
                    }

                    var contentData = await contentRes.json();
                    document.getElementById("gate-content").innerHTML = contentData.content;
                    document.getElementById("gate-content").style.display = "block";
                    document.getElementById("gate-protect-loader").style.display = "none";
                } catch(e) {
                    document.getElementById("gate-status").textContent = "Error loading content. Please refresh.";
                    document.getElementById("gate-spinner").style.display = "none";
                }
            }

            if (document.readyState === "loading") {
                document.addEventListener("DOMContentLoaded", loadContent);
            } else {
                loadContent();
            }
        })();
        </script>';
    }

    /**
     * Overlay fallback when content wrapper can't be found
     */
    private function get_overlay_html($post_id, $challenge, $difficulty, $rest_url) {
        return '<div id="gate-protect-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(255,255,255,0.95);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(10px);">
            ' . $this->get_loader_html($post_id, $challenge, $difficulty, $rest_url) . '
        </div>';
    }

    /**
     * Check if fingerprint indicates a headless browser
     */
    private function is_headless_fingerprint($fp) {
        if (!is_array($fp)) return true;

        // Webdriver flag
        if (!empty($fp['webdriver'])) return true;

        // Headless WebGL renderers
        if (!empty($fp['webgl']['r'])) {
            $renderer = strtolower($fp['webgl']['r']);
            if (preg_match('/swiftshader|llvmpipe|software|mesa offscreen/i', $renderer)) {
                return true;
            }
        }

        // No canvas (headless often fails)
        if (empty($fp['canvas']) || strlen($fp['canvas'] ?? '') < 20) return true;

        // Zero screen dimensions
        if (isset($fp['sw']) && $fp['sw'] === 0) return true;
        if (isset($fp['sh']) && $fp['sh'] === 0) return true;

        return false;
    }

    /**
     * Create a signed content access token
     */
    private function create_content_token($post_id, $ip) {
        $payload = [
            'pid' => $post_id,
            'ip' => hash('sha256', $ip . $this->challenge_secret),
            'exp' => time() + 3600, // 1 hour
            'iat' => time(),
        ];

        $payload_b64 = base64_encode(json_encode($payload));
        $sig = hash_hmac('sha256', $payload_b64, $this->challenge_secret);

        return $payload_b64 . '.' . $sig;
    }

    /**
     * Validate a content access token
     */
    private function validate_content_token($token, $post_id) {
        $parts = explode('.', $token);
        if (count($parts) !== 2) return false;

        list($payload_b64, $sig) = $parts;

        // Verify signature
        $expected_sig = hash_hmac('sha256', $payload_b64, $this->challenge_secret);
        if (!hash_equals($expected_sig, $sig)) return false;

        // Decode payload
        $payload = json_decode(base64_decode($payload_b64), true);
        if (!$payload) return false;

        // Check expiration
        if (time() > ($payload['exp'] ?? 0)) return false;

        // Check post ID matches
        if (intval($payload['pid'] ?? 0) !== intval($post_id)) return false;

        // Check IP binding
        $ip = $this->get_client_ip();
        $ip_hash = hash('sha256', $ip . $this->challenge_secret);
        if ($payload['ip'] !== $ip_hash) return false;

        return true;
    }

    /**
     * Verify gate cookie from a previous successful verification
     */
    private function verify_gate_cookie() {
        if (empty($_COOKIE['__gate_wp'])) return false;

        $post_id = get_queried_object_id();
        $token = sanitize_text_field($_COOKIE['__gate_wp']);

        return $this->validate_content_token($token, $post_id);
    }

    /**
     * Check if logged-in user has access
     */
    private function user_has_access() {
        $user = wp_get_current_user();

        if (in_array('administrator', $user->roles)) return true;
        if (in_array('subscriber', $user->roles)) return true;
        if (in_array('member', $user->roles)) return true;

        return apply_filters('gate_protect_user_has_access', false, $user);
    }

    /**
     * Get real client IP
     */
    private function get_client_ip() {
        $ip_keys = [
            'HTTP_CF_CONNECTING_IP',
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_REAL_IP',
            'HTTP_CLIENT_IP',
            'REMOTE_ADDR'
        ];

        foreach ($ip_keys as $key) {
            if (!empty($_SERVER[$key])) {
                $ip = $_SERVER[$key];
                if (strpos($ip, ',') !== false) {
                    $ips = explode(',', $ip);
                    $ip = trim($ips[0]);
                }
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }

        return '0.0.0.0';
    }

    /**
     * Shortcode: [gate]Protected content[/gate]
     */
    public function gate_shortcode($atts, $content = null) {
        if (is_user_logged_in() && $this->user_has_access()) {
            return do_shortcode($content);
        }

        // Replace content with loader
        $post_id = get_the_ID();
        $challenge = wp_generate_uuid4();
        $rest_url = esc_url(rest_url('gate-protect/v1'));

        // Store shortcode content transiently so REST endpoint can serve it
        $transient_key = 'gate_sc_' . $post_id . '_' . md5($content);
        set_transient($transient_key, $content, 3600);

        return $this->get_loader_html($post_id, $challenge, 4, $rest_url);
    }

    /**
     * Add body class
     */
    public function add_body_class($classes) {
        if (is_singular()) {
            $post_id = get_queried_object_id();
            if (get_post_meta($post_id, '_gate_protected', true) === '1') {
                $classes[] = 'gate-protected-page';
            }
        }
        return $classes;
    }
}
