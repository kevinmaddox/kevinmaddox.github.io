<?php

/**
 *
 * YogurtGallery Database Generator - Configuration File
 *
 * Kevin Maddox, 2020
 * https://github.com/kevinmaddox/yogurtgallery
 *
**/

return [
    /*
        This string is the path, relative to this script, where your image
        director(ies) are located. This path is also where the database will be
        saved to.
        
        For simplicity, this script assumes that you have a folder structure
        similar to this:
        
        - images
          --- imgFolder1
              --- img1.jpg
              --- img2.jpg
          --- imgFolder2
              --- imgA.jpg
              --- imgB.jpg
        
        If you don't you will need to modify the script, create your own script,
        or manually create the database by hand with the correct relative paths.
        This is outside the scope of YogurtGallery, which aims for simplicity.
    */
    'imageDirectoryRootPath' => '../img/',
    
    /*
        This array is a list of directories, relative to
        "imageDirectoryRootPath", where the images you want to be loaded by the
        gallery are stored. All files of the types specified in "filetypes" will
        be catalogued for the specified directories.
        
        No directory traversal/recursion occurs; any sub-directories (within
        these directories) will be ignored and must instead be added to the
        below list. For example:
        
        'illustration/',
        'illustration/extras/',
        'illustration/junk/',
        'pixel-art/',
        'pixel-art/icons/'
        
        Files will be globally sorted based on the method specified via
        $sortingMethod.
    */
    
    'imageDirectoryPaths' => [
        'japan-photos/',
        'random-photos/'
    ],
    
    /*
        This string is what you want to name the database file. You can always
        rename it after creation without issue.
        
    */
    'databaseOutputFileName' => 'db.json',
    
    /*
        This array dictates the file extensions you wish to be searched for when
        cataloguing the images contained in the directories specified via
        $imageDirectories.
        
        Accepted formats are:
        - 'jpg'  : JPEG (includes both *.jpg and *.jpeg)
        - 'png'  : PNG
        - 'gif'  : GIF
        - 'bmp'  : BMP
        - 'webp' : WEBP
    */
    'fileFormats' => ['jpg', 'png', 'gif', 'bmp', 'webp'],
    
    /*
        This string determines how the files are sorted when catalogued, which,
        in turn, dicates how they will appear in the gallery.
        
        Available sorting methods are:
        NONE
        ALPHANUMERIC
        DATE_MODIFIED
        DATE_CREATED
    */
    'sortingMethod' => 'ALPHANUMERIC',
    
    /*
        This boolean will cause the results, as initially sorted by the method
        specified via $sortingMethod, to be catalogued in reverse order.
    */
    'reverseSorting' => true
];

?>