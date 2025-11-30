<?php
// assets/php/install.php
clearstatcache();
$size = file_exists('/subtitles.phar') ? filesize('/subtitles.phar') : 0;
echo ($size > 0) ? 'LIBRARY_INSTALLED_CONFIRMED' : 'LIBRARY_MISSING';
