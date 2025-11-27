export const phpRunnerHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>PHP Worker</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <script>
        // 1. POLYFILL
        if (!navigator.locks) {
            navigator.locks = {
                request: async (name, options, callback) => {
                    if (typeof options === 'function') callback = options;
                    return await callback({ name: name });
                }
            };
        }

        // 2. CONSOLE BRIDGE
        function sendToRN(type, message, payload) {
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type, message, payload }));
            }
        }
        const originalLog = console.log;
        console.log = function(message) { sendToRN('LOG', message); originalLog.apply(console, arguments); };
        console.error = function(message) { sendToRN('LOG', "ERROR: " + message); };
        window.onerror = function(message) { sendToRN('LOG', "CRITICAL: " + message); };

        // 3. QUEUE SYSTEM
        window.taskQueue = Promise.resolve();

        window.resetPharFile = function() {
            window.taskQueue = window.taskQueue.then(async () => {
                if (!window.runPhp) return;
                await window.runPhp("<?php if(file_exists('/subtitles.phar')) unlink('/subtitles.phar'); ?>");
            });
        };

        window.appendChunk = function(chunk) {
            window.taskQueue = window.taskQueue.then(async () => {
                if (!window.runPhp) return;
                const phpCode = "<?php file_put_contents('/subtitles.phar', base64_decode('" + chunk + "'), FILE_APPEND); ?>";
                await window.runPhp(phpCode);
            }).catch(e => console.error("Chunk Write Failed: " + e.message));
        };

        window.installLibrary = function() {
            window.taskQueue = window.taskQueue.then(async () => {
                const phpCode = "<?php " + 
                    "clearstatcache(); " +
                    "$size = file_exists('/subtitles.phar') ? filesize('/subtitles.phar') : 0; " +
                    "echo ($size > 0) ? 'LIBRARY_INSTALLED_CONFIRMED' : 'LIBRARY_MISSING'; " +
                "?>";
                await window.runPhp(phpCode);
            });
        };
    </script>

    <script type="module">
        console.log("Connecting to PHP Engine (v0.0.9 Alpha)...");
        let phpInstance = null;

        try {
            const { PhpWeb } = await import('https://cdn.jsdelivr.net/npm/php-wasm@0.0.9-alpha-20/PhpWeb.mjs');
            
            phpInstance = new PhpWeb({ 
                autoTransaction: false,
                sharedLibs: [
                    { url: 'https://unpkg.com/php-wasm-phar/php8.3-phar.so', ini: true },
                    { url: 'https://unpkg.com/php-wasm-mbstring/libonig.so', ini: false },
                    { url: 'https://unpkg.com/php-wasm-mbstring/php8.3-mbstring.so', ini: true }
                ]
            });

            window.runPhp = async (code) => {
                await phpInstance.run(code);
            };

            phpInstance.addEventListener('output', (event) => {
                let output = event.detail;
                if (typeof output !== 'string') output = String(output);

                if (output.includes('LIBRARY_INSTALLED_CONFIRMED')) {
                    sendToRN('LOG', "Library installed successfully!");
                } 
                else if (output.includes('LIBRARY_MISSING')) {
                     console.error("Library upload failed (0 bytes)");
                }
                else if (output.trim().startsWith('{')) {
                    try {
                        const data = JSON.parse(output);
                        if (data.hash && data.preview) {
                             sendToRN('RESULT', 'Conversion Complete', data);
                        }
                    } catch(e) {
                        console.log("PHP StdOut (Not JSON): " + output);
                    }
                } 
                else {
                   if(output.trim().length > 0 && !output.includes('Deprecated')) console.log("PHP StdOut: " + output);
                }
            });

            phpInstance.addEventListener('error', (event) => {
                console.error("PHP Error: " + event.detail);
            });

            phpInstance.addEventListener('ready', () => {
                console.log("PHP Engine Ready! Waiting for Library...");
                sendToRN('READY', 'Engine Loaded');
            });

            window.processSubtitle = async function(rawContent) {
                console.log("Processing file...");
                const base64Content = btoa(unescape(encodeURIComponent(rawContent)));

                const phpCode = "<?php " +
                    "error_reporting(E_ERROR | E_PARSE); " +

                    "if (!is_dir('/library')) { " +
                        "try { " +
                            "$phar = new Phar('/subtitles.phar'); " +
                            "$phar->extractTo('/library'); " +
                        "} catch (Exception $e) { " +
                            "die('Extraction Failed: ' . $e->getMessage()); " +
                        "} " +
                    "} " +

                    "spl_autoload_register(function ($class) { " +
                        "$bs = chr(92); " + 
                        "$prefix = 'Done' . $bs . 'Subtitles' . $bs; " +
                        "$base_dir = '/library/src/'; " +
                        "$len = strlen($prefix); " +
                        "if (strncmp($prefix, $class, $len) !== 0) return; " +
                        "$relative_class = substr($class, $len); " +
                        "$file = $base_dir . str_replace($bs, '/', $relative_class) . '.php'; " +
                        "if (file_exists($file)) require $file; " +
                    "}); " +

                    "$content = base64_decode('" + base64Content + "'); " +
                    
                    "try { " +
                        "$className = 'Done' . chr(92) . 'Subtitles' . chr(92) . 'Subtitles'; " +
                        "$subtitles = (new $className())->loadFromString($content); " +
                        
                        // 1. Get Initial Plain Text (No timestamps)
                        "$rawText = $subtitles->content('txt'); " +

                        // 2. PYTHON EQUIVALENT CLEANING ---
                        // Python: [line.strip() for line in content.splitlines() if line.strip()]
                        
                        // A. Split by any newline (universal)
                        "$lines = preg_split('/\\\\R/u', $rawText); " + 
                        
                        // B. Trim and Filter
                        "$cleanLines = array(); " +
                        "foreach ($lines as $line) { " +
                            "$trimmed = trim($line); " +
                            "if ($trimmed !== '') { " +
                                "$cleanLines[] = $trimmed; " +
                            "} " +
                        "} " +
                        
                        // C. Join back with \\n
                        "$finalCleanText = implode(PHP_EOL, $cleanLines); " + 
                        // ---------------------------------

                        // 3. Generate Preview (First 5 lines of the CLEANED text)
                        "$previewArr = array_slice($cleanLines, 0, 5); " +
                        "$preview = implode(PHP_EOL, $previewArr); " +

                        // 4. Normalize & Hash (Based on the CLEANED text)
                        "$normalized = strtolower($finalCleanText); " +
                        "$normalized = preg_replace('/[^a-z0-9]/', '', $normalized); " +
                        "$hash = hash('sha256', $normalized); " +
                        
                        "echo json_encode(['hash' => $hash, 'preview' => $preview]); " +

                    "} catch (Exception $e) { " +
                        "fwrite(STDERR, 'Parse Error: ' . $e->getMessage()); " +
                    "} " +
                "?>";

                window.taskQueue = window.taskQueue.then(() => phpInstance.run(phpCode));
            }

        } catch (e) {
            console.error("Setup Failed: " + e.message);
        }
    </script>
</head>
<body></body>
</html>
`;
