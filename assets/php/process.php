<?php
// assets/php/process.php

// 1. SETUP: Enable full logging
error_reporting(E_ALL);
ini_set('display_errors', '1');
echo "DEBUG: Starting Process Script...\n";

// 2. CHECK INPUT
if (!file_exists('/input.b64')) {
    die('Fatal: Input file /input.b64 not found');
}

$size = filesize('/input.b64');
echo "DEBUG: Found input file. Size: " . $size . " bytes\n";

if ($size == 0) {
    die('Fatal: Input file is empty');
}

// 3. DECODE
echo "DEBUG: Decoding Base64...\n";
$base64Content = file_get_contents('/input.b64');
$content = base64_decode($base64Content);

if (!$content) {
    die('Fatal: Base64 decode returned empty');
}
echo "DEBUG: Decode complete. Raw content length: " . strlen($content) . "\n";

// 4. ENCODING STANDARDIZATION
echo "DEBUG: Checking Encoding...\n";
if (substr($content, 0, 2) === "\xFF\xFE") {
    echo "DEBUG: Detected UTF-16LE. Converting to UTF-8...\n";
    $content = mb_convert_encoding($content, 'UTF-8', 'UTF-16LE');
} else if (substr($content, 0, 2) === "\xFE\xFF") {
    echo "DEBUG: Detected UTF-16BE. Converting to UTF-8...\n";
    $content = mb_convert_encoding($content, 'UTF-8', 'UTF-16BE');
} else {
    // Attempt auto-detection/ensure validity for standard UTF-8 files
    $content = mb_convert_encoding($content, 'UTF-8', 'auto');
    echo "DEBUG: standard UTF-8 or Auto-detected.\n";
}

// 5. LOAD LIBRARY
echo "DEBUG: Setting up Library...\n";
if (!is_dir('/library')) {
    echo "DEBUG: Extracting Phar...\n";
    try {
        $phar = new Phar('/subtitles.phar');
        $phar->extractTo('/library');
    } catch (Exception $e) {
        die(json_encode(['error' => 'Extraction Failed: ' . $e->getMessage()]));
    }
}

spl_autoload_register(function ($class) {
    $bs = chr(92);
    $prefix = 'Done' . $bs . 'Subtitles' . $bs;
    $base_dir = '/library/src/';
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) return;
    $relative_class = substr($class, $len);
    $file = $base_dir . str_replace($bs, '/', $relative_class) . '.php';
    if (file_exists($file)) require $file;
});

try {
    echo "DEBUG: Parsing Subtitles...\n";
    $className = 'Done' . chr(92) . 'Subtitles' . chr(92) . 'Subtitles';
    $subtitles = (new $className())->loadFromString($content);

    // Get Raw Text
    $rawText = $subtitles->content('txt');
    echo "DEBUG: Text extracted. Length: " . mb_strlen($rawText) . "\n";

    // --- PREVIEW GENERATION ---
    $lines = preg_split('/\R/u', $rawText);
    $cleanLines = array();
    foreach ($lines as $line) {
        $t = trim($line);
        if ($t !== '') $cleanLines[] = $t;
    }
    $previewArr = array_slice($cleanLines, 0, 5);
    $preview = implode("\n", $previewArr);

    echo "DEBUG: --- PREVIEW START ---\n";
    echo $preview . "\n";
    echo "DEBUG: --- PREVIEW END ---\n";

    // --- ALPHANUMERIC SUPER-STRIP (For Hashing) ---
    echo "DEBUG: Starting Normalization...\n";

    // 1. Lowercase
    $normalized = mb_strtolower($rawText, 'UTF-8');

    // 2. Remove EVERYTHING that is not a Letter (\p{L}) or Number (\p{N})
    $normalized = preg_replace('/[^\p{L}\p{N}]/u', '', $normalized);

    $debugLen = mb_strlen($normalized, 'UTF-8');
    echo "DEBUG: Normalized string length: " . $debugLen . "\n";

    // 3. Hash
    $hash = hash('sha256', $normalized);

    echo "DEBUG: Calculated Hash: " . $hash . "\n";

    // 4. Output
    echo "DEBUG: Success! Sending JSON...\n";
    echo json_encode(['hash' => $hash, 'preview' => $preview, 'debugLen' => $debugLen]);

    unlink('/input.b64');
} catch (Exception $e) {
    fwrite(STDERR, 'Parse Error: ' . $e->getMessage());
    echo json_encode(['error' => 'Parse Error: ' . $e->getMessage()]);
}
