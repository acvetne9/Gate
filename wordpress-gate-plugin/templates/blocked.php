<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>Access Denied - <?php bloginfo('name'); ?></title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 16px;
            padding: 60px 40px;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }
        .icon { font-size: 80px; margin-bottom: 20px; }
        h1 { font-size: 32px; color: #1a1a1a; margin-bottom: 16px; }
        p { color: #666; font-size: 16px; line-height: 1.6; margin-bottom: 24px; }
        .reason { background: #fee2e2; color: #991b1b; padding: 12px; border-radius: 8px; font-size: 14px; margin-bottom: 24px; }
        .footer { font-size: 12px; color: #999; margin-top: 32px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🤖</div>
        <h1>Access Denied</h1>
        <p>Automated access to this content is not permitted.</p>
        <?php if (!empty($result['reason'])): ?>
            <div class="reason"><strong>Reason:</strong> <?php echo esc_html($result['reason']); ?></div>
        <?php endif; ?>
        <p>If you're a human and believe this is an error, please visit using a web browser.</p>
        <div class="footer">Protected by GateProtect</div>
    </div>
</body>
</html>