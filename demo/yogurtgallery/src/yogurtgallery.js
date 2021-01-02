/**
 * __ __ ___ ___  _ _ ___  _____ ___ ___ _   _   ___ ___ __ __
 * \ | /|   |  _|| | | _ ||_   _|  _| _ | | | | | __| _ |\ | /
 *  | | | - | | || | |   \  | | | | |   | |_| |_| _||   \ | |
 *  |_| |___|___||___|_|\_| |_| |___|_|_|___|___|___|_|\_||_|
 *
 *
 * YogurtGallery
 * Image gallery with pop-up previews and pagination
 *
 * Kevin Maddox, 2020
 * https://github.com/kevinmaddox/yogurtgallery
 *
**/

class YogurtGallery {
    _elems;
    _lastGalleryItemClicked;
    _lastWidth;
    
    /**
     *
     * Class constructor.
     *
     * @param
     *
    **/
    constructor(
        rootPath,
        databaseFileName,
        thumbnailDirectoryName,
        options = {}
    ) {
        // - Validate arguments. -----------------------------------------------
        if (typeof rootPath !== 'string') {
            this._report(
                'Error',
                `Invalid value for argument rootPath. `
              + `Value must be of type string `
              + `but was of type ${(typeof rootPath)}. `
            );
            return;
        }
        
        if (typeof databaseFileName !== 'string') {
            this._report(
                'Error',
                `Invalid value for argument databaseFileName. `
              + `Value must be of type string `
              + `but was of type ${(typeof databaseFileName)}. `
            );
            return;
        }
        
        if (typeof thumbnailDirectoryName !== 'string') {
            this._report(
                'Error',
                `Invalid value for argument thumbnailDirectoryName. `
              + `Value must be of type string `
              + `but was of type ${(typeof thumbnailDirectoryName)}. `
            );
            return;
        }
        
        if (typeof options !== 'object') {
            this._report(
                'Warning',
                `Invalid value for argument options. `
              + `Value must be of type object `
              + `but was of type ${(typeof options)}. `
              + `Defaulting value to {}.`
            );
            options = {};
        }
        
        rootPath = this._sanitizePath(rootPath, true);
        thumbnailDirectoryName = this._sanitizePath(
            thumbnailDirectoryName, true);
        
        // - Validate configuration options. -----------------------------------
        let validOptions = {
            'layoutType':             ['string',  'fluid'],
            'itemsPerPage':           ['number',  30     ],
            'maxPaginationLinks':     ['number',  7      ],
            'itemSizeRatio':          ['string',  '1:1'  ],
            'itemGap':                ['number',  0      ],
            'itemsPerRow':            ['number',  6      ],
            'magnification':          ['number',  1      ]
        };
        
        // Perform validation.
        for (const key in options) {
            // Ensure key is allowed.
            if (!validOptions.hasOwnProperty(key)) {
                this._report('Warning', `Invalid option "${key}".`);
                continue;
            }
            
            // Ensure value is of a valid type.
            if (typeof options[key] !== validOptions[key][0]) {
                this._report(
                    'Warning',
                    `Invalid value for option ${key}. `
                  + `Value must be of type ${validOptions[key][0]} `
                  + `but was of type ${(typeof options[key])}. `
                  + `Defaulting value to ${validOptions[key][1]}.`
                );
                options[key] = validOptions[key][1];
            }
            
            // Validate specific options.
            switch (key) {
                case 'layoutType':
                    if (options[key] !== 'fluid' && options[key] !== 'fixed') {
                        this._report(
                            'Warning',
                            `Invalid value for option ${key}. `
                          + 'Value must be either "fluid" or "fixed".'
                          + `Defaulting value to ${validOptions[key][1]}.`
                        );
                        options[key] = validOptions[key][1];
                        break;
                    }
                
            }
        }
        
        // Set default values for unspecified options.
        for (const key in validOptions) {
            if (!options.hasOwnProperty(key))
                options[key] = validOptions[key][1];
        }
        
        // - Initialize variables. ---------------------------------------------
        this._elems = {};
        this._lastGalleryItemClicked = null;
        this._lastWidth = 0;
        
        // - Set up and get references to DOM elements. ------------------------
        let container = document.getElementById('yogurtgallery');
        if (!container) {
            this.report(
                'Error',
                'Could not locate <div> with ID "yogurtgallery". '
              + 'Did you add it to the page content?'
            );
            return;
        }
        
        let containerHTML =
            '<p id="yogurtgallery-header">'
          +     'Page (<span></span> / <span></span>) | '
          +     'Total Files: <span></span>'
          + '</p>'
          + '<div id="yogurtgallery-gallery"></div>'
          + '<div id="yogurtgallery-navigation"></div>'
        ;
        
        container.innerHTML = containerHTML;
        document.body.innerHTML += 
            '<div id="yogurtgallery-popup">'
          +     '<div><img id="yogurtgallery-popup-image" src=""></div>'
          +     '<div>'
          +         '<span id="yogurtgallery-popup-name"></span>'
          +         '<a id="yogurtgallery-popup-link" target="_blank" href="#">'
          +             '[View Full Size]'
          +         '</a>'
          +     '</div>'
          + '</div>'
        ;
        
        this._elems.header = document.getElementById(
            'yogurtgallery-header'
        );
        
        this._elems.gallery = document.getElementById(
            'yogurtgallery-gallery'
        );
        
        this._elems.navigation = document.getElementById(
            'yogurtgallery-navigation'
        );
        
        this._elems.popup = document.getElementById(
            'yogurtgallery-popup'
        );
        
        this._elems.popupImageContainer =
            this._elems.popup.getElementsByTagName('div')[0];
        
        this._elems.popupImage = document.getElementById(
            'yogurtgallery-popup-image'
        );
        
        this._elems.popupFilename = document.getElementById(
            'yogurtgallery-popup-name'
        );
        
        this._elems.popupLink = document.getElementById(
            'yogurtgallery-popup-link'
        );
        
        // - Load database and populate page with data. ------------------------
        let request = new XMLHttpRequest();
        request.open('GET', rootPath + databaseFileName);
        request.responseType = 'json';
        request.onload = function() {
            if (request.readyState !== 4 || request.status !== 200) {
                this.report('Error', 'Could not load image file database.');
                return;
            }
            
            let fileNames = request.response;
            if (fileNames.length <= 0)
                return;
            
            let pageNum = this._grabGET('page');
            pageNum = (!pageNum || isNaN(pageNum)) ? 1 : parseInt(pageNum);
            
            let maxEntriesPerPage = Math.min(
                options.itemsPerPage,
                fileNames.length
            );
            let totalPageCount = Math.ceil(
                fileNames.length / maxEntriesPerPage
            );
            
            // Constrain page number if it exceeds boundaries.
            if (pageNum < 1)
                pageNum = 1;
            else if (pageNum > totalPageCount)
                pageNum = totalPageCount;
            
            // - Build gallery HTML. -------------------------------------------
            let galleryHTML = '<a class="yogurtgallery-item"></a>';
            for (
                var i = ((pageNum - 1) * maxEntriesPerPage);
                i < Math.min((maxEntriesPerPage * pageNum), fileNames.length);
                i++
            ) {
                galleryHTML +=
                    '<a'
                  + ' class="yogurtgallery-item"'
                  + ` href="${rootPath}${fileNames[i]}">`
                  + '<span class="yogurtgallery-item-thumbnail-container">'
                  + '<span class="yogurtgallery-item-thumbnail" '
                  + 'style="background-image:url(\''
                  + rootPath + thumbnailDirectoryName
                  + fileNames[i]
                        .replace(/.gif|.bmp/g, '.png')
                        .replace(/\.\.\//g, '')
                  + '\')"></span></span></a>'
                ;
            }
            
            // - Build page navigation HTML. -----------------------------------
            // Find display ranges.
            let nav = {};
            nav.maxLinks = options.maxPaginationLinks;
            nav.rLower = pageNum - Math.floor(nav.maxLinks / 2);
            nav.rUpper = pageNum + Math.floor(nav.maxLinks / 2);
            
            // If max links is even we have to make a correction.
            if (nav.maxLinks % 2 === 0)
                nav.rLower++;
            
            // Shift right if we hit the left side.
            while (nav.rLower < 1)
            {
                nav.rLower++;
                nav.rUpper++;
            }
            
            // Shift left if we hit the right side.
            while (nav.rUpper > totalPageCount)
            {
                nav.rLower--;
                nav.rUpper--;
            }
            
            // Contain ends if we're exceeding boundaries.
            nav.rLower = Math.max(nav.rLower, 1);
            nav.rUpper = Math.min(nav.rUpper, totalPageCount);
            
            // Build out links.
            let navHTML = '<div>';
            if (totalPageCount > 1 && (pageNum - 1) >= 1) {
                navHTML += '<a href="?page=1">[<<]</a>';
                navHTML += `<a href="?page=${pageNum - 1}">[<]</a>`;
            }
            else
            {
                navHTML += '<span>[<<]</span><span>[<]</span>';
            }
            navHTML += '</div><div>';
            for (var i = nav.rLower; i <= nav.rUpper; i++) {
                if (i !== pageNum) {
                    navHTML +=
                        `<a href="?page=${i}">[`
                      +     this._padNumber(i, totalPageCount.toString().length)
                      + ']</a>'
                    ;
                }
                else {
                    navHTML +=
                        '<span>['
                      +     this._padNumber(i, totalPageCount.toString().length)
                      + ']</span>'
                    ;
                }
            }
            navHTML += '</div><div>';
            if (totalPageCount > 1 && (pageNum + 1) <= totalPageCount) {
                navHTML += '<a href="?page=' + (pageNum + 1) + '">[>]</a>';
                navHTML += '<a href="?page=' + totalPageCount + '">[>>]</a>';
            }
            else
            {
                navHTML += '<span>[>]</span><span>[>>]</span>';
            }
            navHTML += '</div>';
            
            // - Insert HTML into page. ----------------------------------------
            this._elems.gallery.innerHTML = galleryHTML;
            this._elems.navigation.innerHTML = navHTML;
            let headerItems = this._elems.header.getElementsByTagName('span');
            headerItems[0].innerHTML = pageNum;
            headerItems[1].innerHTML = totalPageCount;
            headerItems[2].innerHTML = fileNames.length;
            
            // - Set up layout for item grid. ----------------------------------
            let ratio = {
                w: options.itemSizeRatio.split(':')[0],
                h: options.itemSizeRatio.split(':')[1]
            };
            
            if (options.layoutType === 'fixed') {
                this._elems.gallery.style.gridTemplateColumns =
                    'repeat('
                  + Math.min(options.itemsPerRow, maxEntriesPerPage)
                  + ', minmax(0, 1fr))'
                ;
                
                this._elems.gallery.getElementsByClassName(
                    'yogurtgallery-item'
                )[0].style.paddingBottom = ((ratio.h / ratio.w) * 100) + '%';
            }
            else if (options.layoutType === 'fluid') {
                let baseSize = options.magnification * 8;
                
                if (ratio.w > ratio.h) {
                    // Size: Long
                    this._elems.gallery.style.gridTemplateColumns =
                        'repeat(auto-fill, minmax(' + baseSize + 'rem, 1fr))'
                    ;
                    this._elems.gallery.getElementsByClassName(
                        'yogurtgallery-item'
                    )[0].style.paddingBottom =
                        ((ratio.h / ratio.w) * 100) + '%'
                    ;
                }
                else if (ratio.w < ratio.h) {
                    // Size: Tall
                    this._elems.gallery.style.gridTemplateColumns =
                        'minmax(' + (baseSize * (ratio.w / ratio.h))
                      + 'rem, 1fr) repeat(auto-fill, minmax('
                      + (baseSize * (ratio.w / ratio.h)) + 'rem, 1fr))'
                    ;
                    this._elems.gallery.style.gridTemplateRows =
                        'repeat(auto-fill, minmax('
                      + baseSize + 'rem, 1fr))'
                    ;
                }
                else {
                    // Size: Proportional (squares)
                    this._elems.gallery.style.gridTemplateColumns =
                        'repeat(auto-fill, minmax(' + baseSize + 'rem, 1fr))'
                    ;
                }
                
            }
            
            this._elems.galleryItemModel =
                this._elems.gallery.getElementsByClassName(
                    'yogurtgallery-item'
                )[1]
            ;
            
            let resizeObserver = new ResizeObserver(() => {
                if (this._elems.gallery.offsetWidth !== this._lastWidth) {
                    let sizeAvg =
                        (this._elems.galleryItemModel.offsetWidth
                       + this._elems.galleryItemModel.offsetHeight)
                       / 2
                    ;
                    this._elems.gallery.style.gap = Math.round(
                        options.itemGap * sizeAvg * .1) + 'px';
                }
                this._lastWidth = this._elems.gallery.offsetWidth;
            });
            
            resizeObserver.observe(this._elems.gallery);
            
            // - Enable image preview popup. -----------------------------------
            let galleryItems = this._elems.gallery.getElementsByClassName(
                'yogurtgallery-item'
            );
            
            for (const item of galleryItems) {
                item.addEventListener('click', function() {
                    event.preventDefault();
                    
                    if (this._lastGalleryItemClicked === item) {
                        this.closePopup();
                        return;
                    }
                    
                    this._elems.popupImage.src = item.href;
                    this._elems.popupFilename.innerHTML = item.href.substr(
                        item.href.lastIndexOf('/') + 1);
                    this._elems.popupLink.href = item.href;
                    
                    this._lastGalleryItemClicked = item;
                }.bind(this));
            }
            
            this._elems.popupImage.onload = function() {
                this._elems.popup.style.display = 'block';
            }.bind(this);
            
            this._elems.popupImageContainer.addEventListener(
                'click',
                this.closePopup.bind(this)
            );
        }.bind(this);
        
        request.send();
    }
    
    /**
     *
     * Closes (hides) the image viewer popup box.
     *
    **/
    closePopup() {
        this._elems.popup.style.display = 'none';
        this._elems.popupImage.src = '';
        this._elems.popupFilename.innerHTML = '';
        this._elems.popupLink.href = '#';
        this._lastGalleryItemClicked = null;
    }
    
    /**
     *
     * Extracts a GET parameter from the page's URL.
     *
     * @param {string}
     *
    **/
    _grabGET(requestedParam) {
        let urlParamPairs = window.location.search.substring(1).split('&');

        for (let i = 0; i < urlParamPairs.length; i++) {
            let pair = urlParamPairs[i].split('=');
            
            if (pair[0] === requestedParam) {
                return pair[1] === undefined ?
                    true
                  : decodeURIComponent(pair[1]);
            }
        }
    };
    
    /**
     *
     * Pads a number with leading zeroes (up to 10 digits, max).
     *
     * @param {number} value  - The number to be padded with zeroes.
     * @param {number} digits - The desired number of total digits.
     *
    **/
    _padNumber(value, digits) {
        var s = "000000000" + value;
        return s.substr(s.length - digits);
    }
    
    /**
     *
     * Fixes slashes in paths.
     *
     * @param {string}  path               - The path to be sanitized.
     * @param {boolean} forceTrailingSlash - Append a trailing slash if absent.
     *
    **/
    _sanitizePath(path, forceTrailingSlash) {
        path = path.replace(/\\/g, "/");
        if (forceTrailingSlash)
            path += (path[path.length - 1] !== '/') ? '/' : '';
        
        return path;
    }
    
    /**
     *
     * Logs a message to the console while also displaying a notice in the UI.
     *
     * @param {string} level - The severity level (completely arbitrary).
     * @param {string} msg   - The message to log to the console.
     *
    **/
    _report(level, msg) {
        console.log('YogurtGallery ' + level + ': ' + msg);
    }
}
