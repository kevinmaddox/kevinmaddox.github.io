<?php

/**
 *
 * YogurtGallery Thumbnail Generator - Configuration File
 *
 * Kevin Maddox, 2020
 * https://github.com/kevinmaddox/yogurtgallery
 *
**/

return [
    /*
        This string is the path to the database which you should have previously
        generated via the YogurtGallery Database Generator script.
    */
    'databaseFilePath' => '../img/db.json',
    
    /*
        This string is the name of the folder where you want the thumbnails to
        be stored. This is only the folder name, not the entire path. It will be
        automatically created wherever the database file is located.
    */
    'thumbnailDirectoryName' => 'thumb',
    
    /*
        The target width or height of each generated thumbnail image. This is
        just the size of the image, not the actual size of the gallery items on
        the page. You'll need to ensure you make these big enough to acommodate
        the size of your gallery items.
    */
    'thumbnailSize' => 154,
    
    /*
        The level of quality for JPEG thumbnails.
        
        Quality range:
        
                0 <---------------------> 100
        
          worst quality               best quality
        smallest file size          largest file size
        
        Default is usually around 75.
    */
    'jpegQualityLevel' => 75,
    
    /*
        The level of quality for WEBP thumbnails.
        
        Quality range:
        
                0 <----------------------> 9
        
          worst quality               best quality
        smallest file size          largest file size
        
        Default is usually around 80.
    */
    'webpQualityLevel' => 80,
    
    /*
        The level of compression for PNG thumbnails. Compression does not affect
        image quality, only the speed of compression/uncompression processing.
        
        Quality range:
        
                0 <----------------------> 9
        
          no compression             max compression
        largest file size           smallest file size
        fastest processing          slowest processing
        
        Default is usually around 75.
    */
    'pngCompressionLevel' => 6
];

?>