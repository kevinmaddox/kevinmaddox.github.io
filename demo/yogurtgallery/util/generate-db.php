<?php

/**
 *
 * YogurtGallery Image Database Generator
 *
 * Kevin Maddox, 2020
 * https://github.com/kevinmaddox/yogurtgallery
 *
**/

// - Initialization. -----------------------------------------------------------
echo 'Yogurt Gallery - Image Database Generator' . PHP_EOL;
echo 'https://github.com/kevinmaddox/yogurtgallery' . PHP_EOL . PHP_EOL;

// - Validate configuration options. -------------------------------------------
$cfg = require_once('config-generate-db.php');

if (!$cfg)
    exit('Could not locate configuration file.');
else if (!is_array($cfg)) {
    exit(
        'The configuration file was not a valid array. Something\'s broken. '
      . PHP_EOL . 'Please download a fresh copy from the repository if needed.'
    );
}

$validOptions = [
    'imageDirectoryRootPath' => ['string' , ''                   ],
    'imageDirectoryPaths'    => ['array'  , []                   ],
    'databaseOutputFileName' => ['string' , 'db.json'            ],
    'fileFormats'            => ['array'  , ['jpg', 'png', 'gif']],
    'sortingMethod'          => ['string' , 'ALPHANUMERIC'       ],
    'reverseSorting'         => ['boolean', false                ]
];

$acceptedImageFormats = ['jpg', 'png', 'gif', 'bmp', 'webp'];

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
        case 'imageDirectoryRootPath':
            if (strlen($cfg[$key]) === 0) {
                exit(
                    "{$key} cannot be an empty string. "
                  . 'Did you forget to specify this option in the config?'
                );
            }
            
            $cfg[$key] = sanitizePath($cfg[$key]);
            
            break;
        case 'imageDirectoryPaths' :
            if (count($cfg[$key]) === 0) {
                exit(
                    "{$key} cannot be an empty array. "
                  . 'Did you forget to specify this option in the config?'
                );
            }
            
            for ($i = 0; $i < count($cfg[$key]); $i++) {
                // Ensure path isn't an empty string.
                if (strlen($cfg[$key][$i]) === 0) {
                    exit(
                        "{$key} contains an empty string entry. "
                      . 'This is not allowed.'
                    );
                }
                
                // Check if directory exists.
                if (!is_dir($cfg['imageDirectoryRootPath'] . $cfg[$key][$i])) {
                    exit(
                        'Image directory '
                      . "{$cfg['imageDirectoryRootPath']}{$cfg[$key][$i]} "
                      . "does not exist."
                    );
                }
                
                $cfg[$key][$i] = sanitizePath($cfg[$key][$i]);
            }
            
            break;
        case 'databaseOutputFileName':
            // Ensure path ends with ".json".
            if (substr($cfg[$key], -5) !== '.json') {
                echo "{$key} does not end in extension .json. ";
                echo 'This extension will be appended.';
                echo PHP_EOL . PHP_EOL;
                
                $cfg[$key] .= '.json';
            }
            
            break;
        case 'fileFormats':
            for ($i = 0; $i < count($cfg[$key]); $i++) {
                if (gettype($cfg[$key][$i]) !== 'string') {
                    exit(
                        'Please ensure all values contained in option'
                      . "{$key} are strings."
                    );
                }
                else if (!in_array($cfg[$key][$i], $acceptedImageFormats)) {
                    exit(
                        "{$cfg[$key][$i]} is not an accepted image format for "
                      . "{$key}." . PHP_EOL
                      . 'Accepted formats are:' . PHP_EOL
                      . '[' . implode(', ', $acceptedImageFormats) . ']'
                    );
                }
            }
            
            // Search for both JPEG extensions if only one was specified.
            if (in_array('jpg', $cfg[$key]) && !in_array('jpeg', $cfg[$key]))
                array_push($cfg[$key], 'jpeg');
            if (in_array('jpeg', $cfg[$key]) && !in_array('jpg', $cfg[$key]))
                array_push($cfg[$key], 'jpg');
            
            break;
        case 'sortingMethod':
            if (!in_array($cfg[$key], array(
                    'ALPHANUMERIC', 'DATE_MODIFIED', 'DATE_CREATED', 'NONE'
                ), true)) {
                exit("{$cfg[$key]} is not a valid value for {$key}.");
            }
                
            break;
    }
}

// - Retrieve and sort files to be catalogued in database. ---------------------
// Get list of target folders.
$root = $cfg['imageDirectoryRootPath'];
$folders = $cfg['imageDirectoryPaths'];

// Get complete list of files within folders.
// We'll need to store the parent folder and the file name as split-up arrays.
// This is so we can do a global sort, but still maintain the original folder.
$fileData = [];
foreach($folders as $folder)
{
    $files = glob($root . $folder . '*');
    foreach ($files as $f)
    {
        if (!in_array(pathinfo($f, PATHINFO_EXTENSION), $cfg['fileFormats']))
            continue;
        
        
        array_push($fileData, [
            dirname(str_replace($root, '', $f)) . '/',
            basename($f)
        ]);
    }
}

// Sort files.
switch ($cfg['sortingMethod']) {
    case 'ALPHANUMERIC':
        usort($fileData, function($a, $b) {
            return ($a[1] < $b[1]) ? -1 : 1;
        });
        
        break;
    case 'DATE_MODIFIED':
        usort($fileData, function($a, $b) use ($root) {
            $t1 = filemtime($root . $a[0] . $a[1]);
            $t2 = filemtime($root . $b[0] . $b[1]);
            
            return ($t1 < $t2);
        });
        
        break;
    case 'DATE_CREATED':
        usort($fileData, function($a, $b) use ($root) {
            $t1 = filectime($root . $a[0] . $a[1]);
            $t2 = filectime($root . $b[0] . $b[1]);
            
            return ($t1 < $t2);
        });
        
        break;
}

// Rever order of sorted files if specified.
if ($cfg['reverseSorting']) {
    usort($fileData, function($a, $b) {
        return $a <= $b;
    });
}

// Store as single folder/file strings.
$filePaths = [];
for ($i = 0; $i < count($fileData); $i++)
    array_push($filePaths, $fileData[$i][0] . $fileData[$i][1]);

// Save image path list as JSON file.
file_put_contents(
    $root . $cfg['databaseOutputFileName'], 
    json_encode($filePaths, JSON_PRETTY_PRINT)
);

echo 'Database generated: ' . $root . $cfg['databaseOutputFileName'];


// - Functions -----------------------------------------------------------------
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