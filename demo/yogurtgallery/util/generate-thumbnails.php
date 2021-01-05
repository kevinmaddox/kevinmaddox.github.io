<?php

/**
 *
 * YogurtGallery Image Thumbnail Generator
 *
 * Kevin Maddox, 2020
 * https://github.com/kevinmaddox/yogurtgallery
 *
**/

// - Initialization. -----------------------------------------------------------
echo 'Yogurt Gallery - Image Thumbnail Generator' . PHP_EOL;
echo 'https://github.com/kevinmaddox/yogurtgallery' . PHP_EOL . PHP_EOL;

// - Validate configuration options. -------------------------------------------
$cfg = require_once('config-generate-thumbnails.php');

if (!$cfg)
    exit('Could not locate configuration file.');
else if (!is_array($cfg)) {
    exit(
        'The configuration file was not a valid array. Something\'s broken. '
      . PHP_EOL . 'Please download a fresh copy from the repository if needed.'
    );
}

$validOptions = [
    'databaseFilePath'       => ['string',  '' ],
    'thumbnailDirectoryName' => ['string',  '' ],
    'thumbnailSize'          => ['integer', 154],
    'jpegQualityLevel'       => ['integer', 75 ],
    'webpQualityLevel'       => ['integer', 80 ],
    'pngCompressionLevel'    => ['integer', 6  ]
];

// Set default values for unspecified options.
foreach ($validOptions as $key => $val) {
    if (!array_key_exists($key, $cfg)) {
        echo "Missing parameter {$key}. ";
        if (!is_array($validOptions[$key][1]))
            echo "Defaulting value to {$validOptions[$key][1]}.";
        else
            echo "Defaulting value to [].";
        echo PHP_EOL . PHP_EOL;
        
        $cfg[$key] = $validOptions[$key][1];
    }
}

// Perform validation.
foreach ($cfg as $key => $val) {
    // Ensure key is allowed.
    if (!array_key_exists($key, $validOptions))
        exit("Invalid configuration option: {$key}. Fix your config file.");
    
    // Ensure value is of a valid type.
    if (gettype($cfg[$key]) !== $validOptions[$key][0]) {
        exit(
            "Invalid value for option {$key}. " . PHP_EOL
          . "Value must be of type {$validOptions[$key][0]} "
          . 'but was of type ' . gettype($cfg[$key]) . '.'
        );
    }
    
    // Validate specific options.
    switch ($key) {
        case 'databaseFilePath':
            if (strlen($cfg[$key]) === 0) {
                exit(
                    "{$key} cannot be an empty string. "
                  . 'Did you forget to specify this option in the config?'
                );
            }
            
            $cfg[$key] = sanitizePath($cfg[$key], true);
            
            break;
        case 'thumbnailDirectoryName':
            if (strlen($cfg[$key]) === 0) {
                exit(
                    "{$key} cannot be an empty string. "
                  . 'Did you forget to specify this option in the config?'
                );
            }
            
            $cfg[$key] = sanitizePath($cfg[$key]);
            
            break;
        case 'thumbnailSize':
            if ($cfg[$key] <= 0)
                exit("{$key} must be an integer with a value greater than 0.");
            
            break;
        case 'jpegQualityLevel':
            if ($cfg[$key] < 0
             || $cfg[$key] > 100)
                exit("{$key} must be an integer within the range of 0 - 100.");
            
            break;
        case 'pngCompressionLevel':
            if ($cfg[$key] < 0
             || $cfg[$key] > 9)
                exit("{$key} must be an integer within the range of 0 - 9.");
            
            break;
    }
}

// - Generate thumbnail images. ------------------------------------------------
$root =  dirname($cfg['databaseFilePath']) . '/';
$thumbDir = $root . $cfg['thumbnailDirectoryName'];

// Retrieve list of file paths database.
$filePaths = json_decode_ex(file_get_contents($cfg['databaseFilePath']));

// Get list of image folders.
$folders = [];
foreach ($filePaths as $path) {
    $dir = dirname($path);
    if (!in_array($dir, $folders, true))
        array_push($folders, $dir);
}

// Create thumbnail directories.
mkdir_ex($thumbDir);
foreach ($folders as $f) {
    // Original code
    // mkdir_ex($thumbDir . str_replace('../', '', $f));
    
    // Untested code
    // TODO: Test me
    $fn = str_replace('../', '', $f);
    $ff = $fn;
    
    $i = 1;
    while (is_dir($ff)) {
        $ff = $fn . '_' . $i;
        $i++;
    }
    
    mkdir_ex($thumbDir . $ff);
}

// Generate thumbnails.
$successCount = 0;
$failCount = 0;
echo 'Generating thumbnails, please wait...' . PHP_EOL;
foreach ($filePaths as $fp)
{
    $srcImg = $root . $fp;
    $dstImg = $thumbDir . str_replace('../', '', $fp);
    $dstImg = str_replace('.gif', '.png', $dstImg);
    $dstImg = str_replace('.bmp', '.png', $dstImg);
    $ext = pathinfo($dstImg, PATHINFO_EXTENSION);
    
    if (strcasecmp($ext, 'jpg') === 0 || strcasecmp($ext, 'jpeg') === 0)
        $quality = $cfg['jpegQualityLevel'];
    else if (strcasecmp($ext, 'webp') === 0)
        $quality = $cfg['webpQualityLevel'];
    else
        $quality = $cfg['pngCompressionLevel'];
    
    echo "Generating: $fp" . PHP_EOL;
    if (generateThumbnail(
            $srcImg, $dstImg, $cfg['thumbnailSize'], $quality)
        ) {
        $successCount++;
    }
    else {
        echo "FAILED: $fp" . PHP_EOL;
        $failCount++;
    }
}

echo PHP_EOL . 'Thumbnail generation complete.' . PHP_EOL;
echo "{$successCount} generated successfully and {$failCount} failed.";


// - Functions -----------------------------------------------------------------
/**
 *
 * Helper function for generating thumbnails via the GD graphics library.
 *
 * @param {string}  $srcImg  - The path to the existing input source image.
 * @param {string}  $dstImg  - The path to the desired thumbnail output.
 * @param {integer} $size    - The max width/height of the thumbnail.
 * @param {integer} $quality - The quality (JPEG) or compression (PNG) to use.
 *
**/
function generateThumbnail($srcImg, $dstImg, $size, $quality)
{
    $srcExt = pathinfo($srcImg, PATHINFO_EXTENSION);
    $dstExt = pathinfo($dstImg, PATHINFO_EXTENSION);
    
    // Get image data based on file type.
    if (strcasecmp($srcExt, 'jpg') === 0 || strcasecmp($srcExt, 'jpeg') === 0)
        $image = imagecreatefromjpeg($srcImg);
    else if (strcasecmp($srcExt, 'png') === 0)
        $image = imagecreatefrompng($srcImg);
    else if (strcasecmp($srcExt, 'gif') === 0)
        $image = imagecreatefromgif($srcImg);
    else if (strcasecmp($srcExt, 'bmp') === 0)
        $image = imagecreatefrombmp($srcImg);
    else if (strcasecmp($srcExt, 'webp') === 0)
        $image = imagecreatefromwebp($srcImg);
    else
        return false;
    
    // Scale image data.
    $image = scaleImageProportionally($image, $size);
    
    // Save image.
    if (strcasecmp($dstExt, 'jpg') === 0 || strcasecmp($dstExt, 'jpeg') === 0)
        imagejpeg($image, $dstImg, $quality);
    else if (strcasecmp($dstExt, 'webp') === 0)
        imagewebp($image, $dstImg, $quality);
    else
        imagepng($image, $dstImg, $quality);
    
    return true;
}

/**
 *
 * Scales image data while maintaining the original aspect ratio.
 *
 * @param {resource} $image - The image data to be scaled proportionally.
 * @param {integer}  $size  - The target width/height to scale the image to.
 *
**/
function scaleImageProportionally($image, $size)
{
    $w = imagesx($image);
    $h = imagesy($image);
    
    $ratioX = 1;
    $ratioY = 1;
    
    if ($w < $h)
        $ratioX = $w / $h;
    else if ($h < $w)
        $ratioY = $h / $w;
    
    $newW = $size * $ratioX;
    $newH = $size * $ratioY;
    
    $resized = imagecreatetruecolor($newW, $newH);
    
    imagealphablending( $resized, false );
    imagesavealpha( $resized, true );
    
    imagecopyresampled($resized, $image, 0, 0, 0, 0, $newW, $newH, $w, $h);

    return $resized;
}

/**
 *
 * Extension for json_decode() that always returns an array and throws an error
 * in JSON string is malformed.
 *
 * @param {string} $json - The JSON data to convert to an array.
 *
**/
function json_decode_ex($json)
{
    $data = json_decode($json, true);
    if (JSON_ERROR_NONE !== json_last_error())
        trigger_error('json_decode error: ' . json_last_error_msg());
    return $data;
}

/**
 *
 * Extension for mkdir() which doesn't attempt to create the directory if it
 * already exists and always creates subdirectories recursively.
 *
 * @param {string} $path - The directory path to be created.
 *
**/
function mkdir_ex($path)
{
    if (!is_dir($path) && !file_exists($path))
        mkdir($path, 0777, true);
}

/**
 *
 * Fixes slashes in paths.
 *
 * @param {string}  $path              - The path to be sanitized.
 * @param {boolean} forceTrailingSlash - Append a trailing slash if absent.
 *
**/
function sanitizePath($path, $isFile = false) {
    // Convert slashes.
    $path = str_replace('\\', '/', $path);
    
    // Force trailing slash if target is a directory.
    if (!$isFile)
        $path = (substr($path, -1) !== '/' ? $path . '/' : $path);
    
    return $path;
}

?>