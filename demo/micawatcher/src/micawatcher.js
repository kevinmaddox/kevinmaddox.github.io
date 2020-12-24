/**
 *  _  _ _ ___  ___ _  _ ___ _____ ___ _   _ ___ ___
 * | \/ | |  _|| _ | || | _ |_   _|  _| |_| | __| _ |
 * | .. | | |_ |   |    |   | | | | |_|  _  | _||   \
 * |_||_|_|___||_|_|_/\_|_|_| |_| |___|_| |_|___|_|\_|
 *
 *
 * MicaWatcher
 * JavaScript object-watching widget
 *
 * Wally Chantek, 2020
 * https://github.com/wallychantek/micawatcher
 *
**/

class MicaWatcher {
    _isMicaWatcher;      // Indicator to prevent watchers from being watched.
    
    _watchedObjs;        // The data being watched.
    _elems;              // References to watcher's various DOM elements.
    _collapsedElemFlags; // Keeps track of collapsed data for rebuilding list.
    
    _updateInterval;     // Updates the visual display of the watched data.
    _updateFrameRate;    // The visual update rate in FPS.
    _isPaused;           // Whether the watcher is running or paused.
    _statusMsgTimeout;   // Clears status message after some time.
    _isGrabbable;        // Prevents grabbing when touching title-bar buttons.
    _isBeingGrabbed;     // Whether the watcher is being moved by the user.
    _grabOffset;         // Used for positioning when being grabbed.
    _restoredHeight;     // Used for restoring height after minimizing.
    
    _isDisabled;         // Whether the watcher ignores watch/unwatch commands.
    
    /**
     *
     * Class constructor.
     *
     * @param {boolean} isEnabled         - Enables or disables the watcher.
     * @param {object}  options           - Instance configuration options.
     * @param {string}  options.name      - Instance's title bar name.
     * @param {string}  options.fps       - Refresh rate for data display.
     * @param {string}  options.startAuto - Starts/stops instance on creation.
     * @param {string}  options.width     - Starting width of instance.
     * @param {string}  options.height    - Starting height of instance.
     * @param {string}  options.x         - Starting x position of instance.
     * @param {string}  options.y         - Starting y position of instance.
     *
    **/
    constructor(isEnabled = true, options = {}) {
        // Handle enabling/disabling of watcher. -------------------------------
        if (typeof isEnabled !== 'boolean') {
            this._report(
                'Warning',
                'Enable/disable toggle must be passed in as a boolean.'
            );
            isEnabled = true;
        }
        
        this._isDisabled = !isEnabled;
        if (this._isDisabled)
            return;
        
        // - Validate configuration options. -----------------------------------
        if (typeof options !== 'object') {
            this._report(
                'Warning',
                'Configuration options must be passed in as an object.'
            );
            options = {};
        }
        
        let validOptions = {
            'name':      ['string' , 'MicaWatcher'],
            'fps':       ['number' , 30           ],
            'startAuto': ['boolean', true         ],
            'width':     ['number' , 320          ],
            'height':    ['number' , 240          ],
            'x':         ['number' , 24           ],
            'y':         ['number' , 24           ]
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
                    `Invalid value for option "${key}". `
                  + `Value must be of type "${validOptions[key][0]}" `
                  + `but was of type "${(typeof options[key])}". `
                  + `Defaulting value to "${validOptions[key][1]}".`
                );
                options[key] = validOptions[key][1];
            }
        }
        
        // Set default values for unspecified options.
        for (const key in validOptions) {
            if (!options.hasOwnProperty(key))
                options[key] = validOptions[key][1];
        }
        
        // - Initialize variables. ---------------------------------------------
        this._isMicaWatcher = true;
        this._watchedObjs = {};
        this._elems = {};
        this._collapsedElemFlags = [];
        this._updateFrameRate = options.fps;
        this._isPaused = options.startAuto;
        this._isGrabbable = true;
        this._isBeingGrabbed = false;
        this._grabOffset = {
            x: 0,
            y: 0
        }
        this._restoredHeight = options.height;
        
        
        // - Set up and get references to DOM elements. ------------------------
        this._elems.watcher = document.createElement('div');
        this._elems.watcher.className = 'micawatcher';
        this._elems.watcher.innerHTML =
            '<div class="micawatcher-title-bar">'
          +     '<h1>MicaWatcher</h1>'
          +     '<div class="micawatcher-collapse-button micawatcher-button">'
          +         '<div></div>'
          +     '</div>'
          + '</div>'
          + '<div class="micawatcher-items"></div>'
          + '<div class="micawatcher-add-data-bar">'
          +     '<input '
          +     'type="text" '
          +     'class="micawatcher-obj-name-field" '
          +     'placeholder="Object Variable Name"'
          +     '>'
          +     '<input '
          +     'type="text" '
          +     'class="micawatcher-display-name-field" '
          +     'placeholder="Display Name"'
          +     '>'
          +     '<div class="micawatcher-add-object-button micawatcher-button">'
          +         'Add'
          +     '</div>'
          + '</div>'
          + '<div class="micawatcher-status-bar">'
          +     '<div class="micawatcher-pause-button"></div>'
          +     '<div class="micawatcher-pause-status"></div>'
          +     '<div class="micawatcher-general-status"></div>'
          + '</div>'
        ;
        this._elems.watcher.style.width  = `${options.width}px`;
        this._elems.watcher.style.height = `${options.height}px`;
        this._elems.watcher.style.left   = `${options.x}px`;
        this._elems.watcher.style.top    = `${options.y}px`;
        document.body.appendChild(this._elems.watcher);
        
        this._elems.titleBar = this._elems.watcher.getElementsByClassName(
            'micawatcher-title-bar'
        )[0];
        this._elems.titleBar.getElementsByTagName('h1')[0].innerHTML =
            options.name;
        
        this._elems.itemContainer = this._elems.watcher.getElementsByClassName(
            'micawatcher-items'
        )[0];
        
        this._elems.addDataBar = this._elems.watcher.getElementsByClassName(
            'micawatcher-add-data-bar'
        )[0];
        
        this._elems.statusBar = this._elems.watcher.getElementsByClassName(
            'micawatcher-status-bar'
        )[0];
        
        this._elems.itemDataDisplays = [];
        
        this._elems.objNameField = this._elems.watcher.getElementsByClassName(
            'micawatcher-obj-name-field'
        )[0];
        
        this._elems.displayNameField =
            this._elems.watcher.getElementsByClassName(
                'micawatcher-display-name-field'
            )[0]
        ;
        
        this._elems.pauseButton = this._elems.watcher.getElementsByClassName(
            'micawatcher-pause-button'
        )[0];
        
        this._elems.pauseStatus = this._elems.watcher.getElementsByClassName(
            'micawatcher-pause-status'
        )[0];
        
        this._elems.generalStatus = this._elems.watcher.getElementsByClassName(
            'micawatcher-general-status'
        )[0];
        
        let collapseButtonElem = this._elems.watcher.getElementsByClassName(
            'micawatcher-collapse-button'
        )[0];
        
        let addObjectButtonElem = this._elems.watcher.getElementsByClassName(
            'micawatcher-add-object-button'
        )[0];
        
        // - Set up event listeners. -------------------------------------------
        this._elems.titleBar.addEventListener('mousedown', function() {
            if (event.button === 0 && this._isGrabbable) {
                let rect = this._elems.watcher.getBoundingClientRect();
                this._grabOffset.x = event.x - rect.left;
                this._grabOffset.y = event.y - rect.top;
                this._isBeingGrabbed = true;
            }
        }.bind(this));
        
        document.addEventListener('mouseup', function() {
            if (event.button === 0)
                this._isBeingGrabbed = false;
        }.bind(this));
        
        document.addEventListener('mousemove', function() {
            if (this._isBeingGrabbed) {
                this._elems.watcher.style.left =
                    Math.max(event.x - this._grabOffset.x, 0) + 'px';
                this._elems.watcher.style.top =
                    Math.max(event.y - this._grabOffset.y, 0) + 'px';
            }
        }.bind(this));
        
        collapseButtonElem.addEventListener('click', function() {
            // Get all elements below title bar.
            let elems = [
                this._elems.itemContainer,
                this._elems.addDataBar,
                this._elems.statusBar
            ];
            
            // Toggle visibility of elements.
            for (const elem of elems) {
                if (elem.style.display === 'none') {
                    elem.style.display = 'flex';
                }
                else {
                    this._restoredHeight = this._elems.watcher.offsetHeight;
                    elem.style.display = 'none';
                }
            }
            
            // Set CSS properties based on visibility.
            if (elems[0].style.display === 'none') {
                this._elems.titleBar.style.border = 'none';
                this._elems.watcher.style.height = 'auto';
                this._elems.watcher.style.minHeight = 'auto';
                this._elems.watcher.style.resize = 'none';
            }
            else {
                this._elems.titleBar.style.removeProperty('border');
                this._elems.watcher.style.height = this._restoredHeight + 'px';
                this._elems.watcher.style.minHeight = '240px';
                this._elems.watcher.style.resize = 'both';
            }
        }.bind(this));
        
        collapseButtonElem.addEventListener('mouseover', function() {
            this._isGrabbable = false;
        }.bind(this));
        
        collapseButtonElem.addEventListener('mouseout', function() {
            this._isGrabbable = true;
        }.bind(this));
        
        this._elems.objNameField.addEventListener(
            'keydown',
            this._addItemThroughUI.bind(this)
        );
        
        this._elems.displayNameField.addEventListener(
            'keydown',
            this._addItemThroughUI.bind(this)
        );
        
        addObjectButtonElem.addEventListener(
            'click',
            this._addItemThroughUI.bind(this)
        );
        
        this._elems.pauseButton.addEventListener('click', function() {
            // Pause
            if (!this._isPaused) {
                clearInterval(this._updateInterval);
                for (const key in this._elems.itemDataDisplays) {
                    this._elems.itemDataDisplays[key].classList.remove(
                        'micawatcher-unselectable'
                    );
                }
                this._elems.pauseStatus.innerHTML = 'Paused';
                this._elems.pauseButton.classList.remove(
                    'micawatcher-pause-button-paused'
                );
            }
            // Resume
            else {
                for (const key in this._elems.itemDataDisplays) {
                    this._elems.itemDataDisplays[key].classList.add(
                        'micawatcher-unselectable'
                    );
                }
                this._elems.pauseStatus.innerHTML = 'Active';
                this._updateInterval = setInterval(
                    this._updateDisplay.bind(this),
                    1000 / this._updateFrameRate
                );
                this._elems.pauseButton.classList.add(
                    'micawatcher-pause-button-paused'
                );
            }
            
            this._isPaused = !this._isPaused;
        }.bind(this));
        
        // - Finish up initialization. -----------------------------------------
        this._elems.pauseButton.click();
    }
    
    /**
     *
     * Adds an object to the instance's watch list.
     *
     * @param {object}  objToWatch     - The object to be watched.
     * @param {string}  key            - The list display name for the object.
     * @param {boolean} startCollapsed - Collapse item in list by default.
     *
    **/
    watch(objToWatch, key, startCollapsed = false) {
        if (this._isDisabled)
            return;
        
        // Validate data.
        if (typeof key !== 'string' || key.length === 0) {
            this._report(
                'Warning',
                `Invalid key. Key was of type: ${(typeof key)}. `
              + 'Key must be a string.'
            );
            return;
        }
        else if (typeof objToWatch !== 'object') {
            this._report(
                'Warning',
                `Data for key: "${key}" is of type: ${(typeof objToWatch)}. `
              + 'Watched data can only be an object.'
            );
            return;
        }
        else if (this._watchedObjs.hasOwnProperty(key)) {
            this._report(
                'Warning',
                `Key "' + key + '" has already been used. `
              + 'Please use a different key or ensure you\'re not accidentally '
              + 're-adding the same object.'
            );
            return;
        }
        else if (objToWatch.isMicaWatcher) {
            this._report(
                'Warning',
                'To prevent cyclic object value errors from occurring, '
              + 'watching a MicaWatcher object is not allowed.'
            );
            return;
        }
        
        if (startCollapsed)
            this._collapsedElemFlags.push(key);
        
        this._watchedObjs[key] = objToWatch;
        this._rebuildItemList();
        
        this._elems.objNameField.value = '';
        this._elems.displayNameField.value = '';
        
        if (document.activeElement === this._elems.displayNameField)
            this._elems.objNameField.focus();
    }
    
    /**
     *
     * Removes an object from the instance's watch list.
     *
     * @param {string} key - The display name used to identify the object.
     *
    **/
    unwatch(key) {
        if (this._isDisabled)
            return;
        
        delete this._watchedObjs[key];
        this._rebuildItemList();
    }
    
    /**
     *
     * Specifies an item to be watched via the instance's UI inputs.
     *
    **/
    _addItemThroughUI() {
        // Stop if user hit a key other than enter.
        if (event.type === 'keydown' && event.keyCode !== 13) {
            return;
        }
        
        let obj;
        let objName = '' + this._elems.objNameField.value;
        let objKey = '' + this._elems.displayNameField.value;
        
        // Validate input fields.
        if (objName.length === 0) {
            this._report('Error', 'Please provide a valid object name.');
            return;
        }
        else if (objKey.length === 0) {
            this._report('Error', 'Please provide a valid display name.');
            return;
        }
        
        // Attempt to retrieve object by name.
        try {
            // Oh noez, the evil eval() function! I should never use it because
            // MDN and random bloggers said so! Dude, MicaWatcher is a debugging
            // tool. Who cares. If you're deploying code with this script in it,
            // that's on YOU, it's NOT on me. Anyone who thinks eval() should be
            // removed is an idiot who's never had a legitimate use case for it.
            //
            // Could we parse out dot-notated object trees, figuring out the
            // parent, and assume the parent is window if no parent was
            // specified? Sure we could, but then how the hell do you handle
            // variables declared with let? You don't. "Oh, but you shouldn't be
            // doing that anyway..." Blah blah blah. You're not wrong! But I
            // also really don't care because it has nothing to do with this!
            // This is the easiest way to do it and it's a case where it makes
            // sense. Just accept that this world isn't black and white and
            // corner cases exist.
            obj = eval(this._elems.objNameField.value);
        }
        catch (e) {
            this._report('Error', e.message);
            return;
        }
        
        this.watch(obj, objKey);
    }
    
    /**
     *
     * Destroys and rebuilds the watched-object display list.
     *
    **/
    _rebuildItemList() {
        // Reset currently-displayed elements.
        for (const key in this._elems.itemDataDisplays) {
            delete this._elems.itemDataDisplays[key];
        }
        
        this._elems.itemContainer.innerHTML = '';
        
        // Create new display items for watched data.
        for (const key in this._watchedObjs) {
            let newItem = document.createElement('div');
            newItem.classList.add('micawatcher-item');
            newItem.setAttribute('data-key', key);
            newItem.innerHTML =
                '<div>'
              +     `<h2>${key}</h2>`
              +     '<div class="'
              +         'micawatcher-collapse-button '
              +         'micawatcher-button'
              +     '">'
              +         '<div></div>'
              +     '</div>'
              +     '<div class="'
              +         'micawatcher-remove-button '
              +         'micawatcher-button'
              +     '">'
              +         '<div></div>'
              +     '</div>'
              + '</div>'
            ;
            
            let newDataDisplay = document.createElement('p');
            
            if (!this._isPaused)
                newDataDisplay.classList.add('micawatcher-unselectable');
            
            if (this._collapsedElemFlags.includes(key))
                newDataDisplay.style.display = 'none';
            
            newItem.appendChild(newDataDisplay);
              
            this._elems.itemContainer.appendChild(newItem);
            
            this._elems.itemDataDisplays[key] = newItem.getElementsByTagName(
                'p'
            )[0];
        }
        
        // Add listeners for collapse & remove buttons.
        let newItems = this._elems.itemContainer.getElementsByClassName(
            'micawatcher-item'
        );
        for (const item of newItems) {
            let collapseButtonElem = item.getElementsByClassName(
                'micawatcher-collapse-button'
            )[0];
            collapseButtonElem.addEventListener('click', function() {
                let elem = collapseButtonElem.parentNode.nextSibling;
                let key = collapseButtonElem.closest('.micawatcher-item')
                    .getAttribute('data-key');
                
                if (elem.style.display === 'none') {
                    elem.style.display = 'block';
                    this._collapsedElemFlags.push(key);
                }
                else {
                    elem.style.display = 'none';
                    this._collapsedElemFlags = this._collapsedElemFlags
                        .filter(e => e !== key);
                }
            }.bind(this));
            
            item.getElementsByClassName(
                'micawatcher-remove-button'
            )[0].addEventListener(
                'click',
                this.unwatch.bind(this, item.getAttribute('data-key'))
            );
        }
        
        this._updateDisplay();
    }
    
    /**
     *
     * Shows current data in the watched-object display list.
     *
    **/
    _updateDisplay() {
        for (const key in this._elems.itemDataDisplays) {
            this._elems.itemDataDisplays[key].innerHTML = JSON.stringify(
                this._watchedObjs[key],
                null,
                2
            );
        }
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
        console.log('MicaWatcher ' + level + ': ' + msg);
        
        // We need to check if the status message DOM element exists yet, as we
        // may need to call this before any HTML is injected.
        if (this._elems.generalStatus) {
            this._elems.generalStatus.innerHTML =
                'Error! Please check console.'
            ;
        
            window.clearTimeout(this._statusMsgTimeout);
            this._statusMsgTimeout = window.setTimeout(function() {
                this._elems.generalStatus.innerHTML = '';
            }.bind(this), 3000);
        }
    }
}
