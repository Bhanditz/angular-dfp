'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

/**
* @file Entry point to `angularDfp`.
* @author Peter Goldsborough <peter@goldsborough.me>
* @license MIT
*/

// eslint-disable-next-line no-use-before-define, no-var
var googletag = googletag || {};
googletag.cmd = googletag.cmd || [];

// eslint-disable-next-line no-undef, no-unused-vars
var angularDfp = angular.module('angularDfp');

/**
 * @file
 * @author Peter Goldsborough <peter@goldsborough.me>
 * @license MIT
 */

(function (module) {
  /**
   * Formats a string similar to str.format in Python.
   *
   * For a string '{0} {1} {2}', the function will replace each placeholder with
   * the argument at the given index (after the format string itself).
   *
   * @param  {string} string The format string.
   * @return {string} The formatted string.
   */
  function dfpFormat(string) {
    // Grab all arguments passed the first
    var args = Array.prototype.slice.call(arguments, 1);

    // Check if we still have arguments we can replace with,
    // else just return the un-formatted string
    return string.replace(/{(\d+)}/g, function (match, index) {
      return index < args.length ? args[index] : match;
    });
  }

  module.factory('dfpFormat', [function () {
    return dfpFormat;
  }]);
  // eslint-disable-next-line
})(angularDfp);

/**
 * @file Defines the `dfpParseDuration` service.
 * @author Peter Goldsborough <peter@goldsborough.me>
 * @license MIT
 */

(function (module) {
  /**
   * An error thrown by the `dfpParseDuration` service.
   */
  var DFPDurationError = function (_Error) {
    _inherits(DFPDurationError, _Error);

    function DFPDurationError(interval) {
      _classCallCheck(this, DFPDurationError);

      return _possibleConstructorReturn(this, (DFPDurationError.__proto__ || Object.getPrototypeOf(DFPDurationError)).call(this, "Invalid interval: '" + interval + "'"));
    }

    return DFPDurationError;
  }(Error);

  /**
   * A factory for the `dfpParseDuration` service.
   *
   * This service allows parsing of strings specifying
   * durations, such as '2s' or '5min'.
   *
   * @param {Function} format The `format` service.
   * @return {Function} The `dfpParseDuration` service.
   */


  function dfpParseDurationFactory(format) {
    /**
     * Converts a given time in a given unit to milliseconds.
     * @param  {!number} time A time number in a certain unit.
     * @param  {!string} unit A string describing the unit (ms|s|min|h).
     * @return {!number} The time, in milliseconds.
     */
    function convertToMilliseconds(time, unit) {
      console.assert(/^(m?s|min|h)$/g.test(unit));

      if (unit === 'ms') return time;
      if (unit === 's') return time * 1000;
      if (unit === 'min') return time * 60 * 1000;

      // hours
      return time * 60 * 60 * 1000;
    }

    /**
     * Converts a regular expression match into a duration.
     * @param  {!Array} match A regular expression match object.
     * @return {!number} The converted milliseconds.
     */
    function convert(match) {
      var time = parseInt(match[1], 10);

      // No unit means milliseconds
      // Note: match[0] is the entire matched string
      if (match.length === 2) return time;

      return convertToMilliseconds(time, match[2]);
    }

    /**
     * Given an interval string, returns the corresponding milliseconds.
     * @param  {number|string} interval The string to parse.
     * @return {number} The corresponding number of milliseconds.
     */
    function dfpParseDuration(interval) {
      if (typeof interval === 'number') {
        return interval;
      }

      if (typeof interval !== 'string') {
        throw new TypeError(format("'{0}' must be of number or string type", interval));
      }

      // Convert any allowed time format into milliseconds
      var match = interval.match(/(\d+)(m?s|min|h)?/);

      if (!match) {
        throw new DFPDurationError(interval);
      }

      return convert(match);
    }

    return dfpParseDuration;
  }

  module.factory('dfpParseDuration', ['dfpFormat', dfpParseDurationFactory]);

  // eslint-disable-next-line
})(angularDfp);

/**
* @file Defines the responsiveResize service.
* @author Peter Goldsborough <peter@goldsborough.me>
* @license MIT
*/

(function (module) {
  /**
   * The factory of the `responsiveResize` service.
   *
   * The `responsiveResize` service ensures that ads with responsive mappings
   * defined always have iframes that fit their ad's dimensions and not their
   * containers' width. This ensures that centering ads, which is essential to
   * responsive ads, works well.
   *
   * @param  {Function} $interval {@link http://docs.angularjs.org/api/ng.$interval}
   * @param  {Function} $timeout  {@link http://docs.angularjs.org/api/ng.$timeout}
   * @param  {Object} $window  {@link http://docs.angularjs.org/api/ng.$window}
   * @param {Function} dfpRefresh The dfpRefresh service.
   * @return {Function} The `responsiveResize` service.
   */
  function responsiveResizeFactory($interval, $timeout, $window, dfpRefresh) {
    // Turn into jQLite element
    // eslint-disable-next-line
    $window = angular.element($window);
    return function (element, boundaries) {
      boundaries = boundaries || [320, 780, 1480];
      console.assert(Array.isArray(boundaries));

      /**
       * The interval for polling changes in the iframe's dimensions.
       * @type {number}
       * @constant
       */
      var POLL_INTERVAL = 100; // 100ms

      /**
       * How long we poll (at the rate of POLL_INTERVAL).
       * @type {number}
       * @constant
       */
      var POLL_DURATION = 2500; // 2.5s

      /**
       * Retrieves the iframe of the ad of the element.
       * @return {Object} An iframe HTML element.
       */
      function queryIFrame() {
        return element.querySelector('div iframe');
      }

      /**
       * Normalized the iframe dimensions.
       *
       * This operation here is the main goal of this service. To ensure that the
       * responsive ad can always be centered, it must have width and height
       * matching its content. However, upon new ad loads, it may happen that
       * even though the iframe width and height *attributes* change, the CSS
       * dimensions remain unchanged. This distorts the element. As such, we
       * simply normalize these two dimensionss here.
       *
       * @param  {Object} iframe Optionally, the iframe to normalize
       *                         (else it is queried).
       */
      function normalizeIFrame(iframe) {
        iframe = iframe || queryIFrame();
        iframe.style.width = iframe.width + 'px';
        iframe.style.height = iframe.height + 'px';
      }

      /**
       * Adds the 'hidden' class to the element before fetching a new ad.
       */
      function hideElement() {
        element.addClass('hidden');
      }

      /**
       * Removes the 'hidden' class to the element after fetching a new ad.
       *
       * A one second delay is added for this
       * while the ad is loading and rendering.
       */
      function showElement() {
        $timeout(function () {
          element.removeClass('hidden');
        }, 1000);
      }

      /**
       * Sets up the watching mechanisms for the responsive resizing.
       */
      function watchResize() {
        // The goal is to have the iFrame's width and height style (CSS)
        // properties match the width and height attributes, which are set by
        // DFP are thus the correct dimensions. However, the behavior here is
        // quite undeterministic and difficult to predict in terms of what
        // events trigger a change in size and when this hdfpens. As such, the
        // best strategy I found was to periodically poll for any changes in the
        // width and height attributes for the first second, every 100ms. After
        // that any changes to the dimensions of the iframe should have been
        // captured and digested. Since changes to these dimensions will only
        // happen after a request, it is also not necessary to setup a resize
        // watch.

        var iframe = queryIFrame();

        // Get the width currently set in the style, without the 'px'
        var initialWidth = iframe.style.width.slice(0, -2);

        var poll = $interval(function () {
          // The iframe element may change between calls
          var iframe = queryIFrame();
          if (iframe.width !== initialWidth) {
            normalizeIFrame(iframe);
          }
        }, POLL_INTERVAL);

        $timeout(function () {
          $interval.cancel(poll);
        }, POLL_DURATION);

        // An additional resize listener helps for tricky cases
        // eslint-disable-next-line no-undef
        $window.on('resize', function () {
          normalizeIFrame();
        });

        showElement();
      }

      /**
       * Returns a function suitable for responsive resize-event watching.
       * @param  {googletag.Slot} slot The slot to make responsive.
       * @return {Function} A function to pass as an event
       *                    listener for (window) resize events.
       */
      function makeResponsive(slot) {
        /**
         * Determinates in which of the boundaries the element is.
         * @return {number} The current index.
         */
        function determineIndex() {
          var width = $window.innerWidth;
          var last = boundaries.length - 1;

          for (var _index = 0, _last; _index < _last; ++_index) {
            if (width < boundaries[_index + 1]) return _index;
          }

          return last;
        }

        /**
         * The index corresponding to the current boundaries of the element.
         * @type {number}
         */
        var index = determineIndex();

        /**
         * Tests if the element could grow in size.
         *
         * An element can grow if it's not yet maximally sized and
         * its width is at least as big as that of the next boundary.
         * @return {boolean} True if the index should be
         *                   incremented by one, else false.
         */
        function couldGrow() {
          if (index + 1 >= boundaries.length) return false;
          if ($window.innerWidth < boundaries[index + 1]) return false;
          return true;
        }

        /**
         * Tests if the element could shrink in size.
         *
         * An element can grow if it's not yet minimally sized and
         * its width is less than the current boundary.
         * @return {boolean} True if the index should be
         *                   decremented by one, else false.
         */
        function couldShrink() {
          if (index - 1 < 0) return false;
          if ($window.innerWidth >= boundaries[index]) return false;
          return true;
        }

        /**
         * Performs a size transition.
         * @param  {number} delta The delta by which to change the index.
         */
        function transition(delta) {
          console.assert(index >= 0 && index < boundaries.length);
          console.assert(delta === -1 || delta === +1);

          index += delta;
          hideElement();

          // Refresh the ad slot now
          dfpRefresh(slot, function () {
            watchResize(index);
          });

          console.assert(index >= 0 && index < boundaries.length);
        }

        // Resize initially
        watchResize();

        return function watchListener() {
          if (couldGrow()) {
            transition(+1);
          } else if (couldShrink()) {
            transition(-1);
          }
        };
      }

      $window.on('resize', makeResponsive(element));
    };
  }

  module.addFactory('responsiveResize', ['$interval', '$timeout', '$window', 'dfpRefresh', responsiveResizeFactory]);

  // eslint-disable-next-line
})(angularDfp);

/**
 * @file Defines the `dfp-ad` directive.
 * @author Peter Goldsborough <peter@goldsborough.me>
 * @license MIT
 */

// eslint-disable-next-line no-use-before-define, no-var
var googletag = googletag || {};
googletag.cmd = googletag.cmd || [];

(function (module) {
  "use strict";

  /**
   * The controller for the `dfp-ad` directive.
   */

  function dfpAdController() {
    /**
     * The fixed (non-responsive) sizes for the ad slot.
     * @type {Array}
     */
    var sizes = [];

    /**
     * Any `{browserSize, adSizes}` objects to create responsive mappings.
     * @type {Array}
     */
    var responsiveMapping = [];

    /**
     * Any key/value targeting objects.
     * @type {Array}
     */
    var targetings = [];

    /**
     * Any category exclusion labels.
     * @type {Array}
     */
    var exclusions = [];

    /**
     * Any additional scripts to execute for the slot.
     * @type {Array}
     */
    var scripts = [];

    /**
     * Tests if the state of the directive is valid and complete.
     * @return {Boolean} True if the ad slot may be created, else false.
     */
    this.isValid = function () {
      if (sizes.length === 0) return false;
      if (!this.adUnit) return false;
      return true;
    };

    /**
     * Returns the public state of the controller for use by the directive.
     * @return {Object} An object of all properties the directive will
     *                  need to create an ad slot.
     */
    this.getState = function () {
      console.assert(this.isValid());
      return Object.freeze({
        sizes: sizes,
        responsiveMapping: responsiveMapping,
        targeting: targetings,
        exclusions: exclusions,
        adUnit: this.adUnit,
        forceSafeFrame: this.forceSafeFrame,
        safeFrameConfig: this.safeFrameConfig,
        clickUrl: this.clickUrl,
        refresh: this.refresh,
        scripts: scripts,
        collapseIfEmpty: this.collapseIfEmpty
      });
    };

    /**
     * Registers a (fixed) size for the ad slot.
     *
     * @param {Array} size A [width, height] array.
     * @see [Google DFP Support]{@link https://support.google.com/dfp_premium/answer/1697712?hl=en}
     * @see [GPT Reference]{@link https://developers.google.com/doubleclick-gpt/reference#googletag.defineSlot}
     */
    this.addSize = function (size) {
      sizes.push(size);
    };

    /**
     * Registers a responsive mapping for the ad slot.
     * @param {Object} mapping A `{browserSize, adSizes}` mapping.
     * @see [Google DFP Support]{@link https://support.google.com/dfp_premium/answer/3423562?hl=en}
     * @see [GPT Reference]{@link https://developers.google.com/doubleclick-gpt/reference#googletag.SizeMappingBuilder}
     */
    this.addResponsiveMapping = function (mapping) {
      responsiveMapping.push(mapping);
    };

    /**
     * Registers a targeting object for the ad slot.
     * @param {Object} targeting A {browserSize, adSizes} object.
     * @see [Google DFP Support]{@link https://support.google.com/dfp_premium/answer/177383?hl=en}
     * @see [GPT Reference]{@link https://developers.google.com/doubleclick-gpt/reference#googletag.PassbackSlot_setTargeting}
     */
    this.addTargeting = function (targeting) {
      targetings.push(targeting);
    };

    /**
     * Registers a category exclusion for the slot.
     * @param {string} exclusion The category exclusion label.
     * @see [Google Developer Support]{@link https://support.google.com/dfp_premium/answer/3238504?hl=en&visit_id=1-636115253122574896-2326272409&rd=1}
     * @see [GPT Reference] {@link https://developers.google.com/doubleclick-gpt/reference#googletag.PubAdsService_setCategoryExclusion}
     */
    this.addExclusion = function (exclusion) {
      exclusions.push(exclusion);
    };

    /**
     * Registers a script for the slot.
     *
     * Scripts can be run during ad slot definition and before the actual ad
     * call, to perform any auxiliary configuration taks not handled by our
     * interface.
     *
     * @param {string} script The script string to be evaluated.
     */
    this.addScript = function (script) {
      scripts.push(script);
    };
  }

  /**
   * The directive for the `dfp-ad` tag.
   *
   * This is the primary directive used for defining ad slots. All other
   * directives, except `dfp-video`, are nested under this slot. It is
   * standalone except for the necessity of (at least) one nested `dfp-size`
   * directive.
   *
   * @param {Object} scope          The Angular element scope.
   * @param {Object} element        The jQuery/jQlite element of the directive.
   * @param {Object} attributes     The attributes defined on the element.
   * @param  {Function} $injector {@link http://docs.angularjs.org/api/ng.$injector}
   */
  function dfpAdDirective(scope, element, attributes, $injector) {
    var $window = $injector.get('$window');
    var doubleClick = $injector.get('doubleClick');
    var dfpIDGenerator = $injector.get('dfpIDGenerator');
    var dfpRefresh = $injector.get('dfpRefresh');
    var responsiveResize = $injector.get('responsiveResize');

    var ad = scope.controller.getState();

    // Turn the window into a jQuery/jQlite object
    // eslint-disable-next-line no-undef
    $window = angular.element($window);

    // Unpack jQuery object
    element = element[0];

    // Generate an ID or check for uniqueness of an existing one
    dfpIDGenerator(element);

    /**
     * Handles the responsive mapping (`sizeMapping`) building.
     * @param {googletag.Slot} slot The ad slot.
     */
    function addResponsiveMapping(slot) {
      if (ad.responsiveMapping.length === 0) return;

      var sizeMapping = googletag.sizeMapping();

      ad.responsiveMapping.forEach(function (mapping) {
        sizeMapping.addSize(mapping.browserSize, mapping.adSizes);
      });

      slot.defineSizeMapping(sizeMapping.build());
    }

    /**
     * Defines the ad slot, aggregating all nested directives.
     *
     * This function combines all the properties added by nested directives.
     * Recall, for this, that angular executes controllers on the way down the
     * DOM and directives on the way up. As such, this directive is executed
     * after all nested directives were been invoked (adding properties such as
     * sizes, responsive mappings or key/value pairs to the controller). The
     * full ad slot definition can then be sent into the `googletag` command
     * queue to fetch an ad from the DoubleClick ad network.
     */
    function defineSlot() {
      var slot = googletag.defineSlot(ad.adUnit, ad.sizes, element.id);

      if (ad.forceSafeFrame !== undefined) {
        slot.setForceSafeFrame(true);
      }

      if (ad.clickUrl) {
        slot.setClickUrl(ad.clickUrl);
      }

      if (ad.collapseIfEmpty !== undefined) {
        slot.setCollapseEmptyDiv(true, true);
      }

      if (ad.safeFrameConfig !== undefined) {
        slot.setSafeFrameConfig(JSON.parse(ad.safeFrameConfig));
      }

      addResponsiveMapping(slot);

      ad.targeting.forEach(function (targeting) {
        slot.setTargeting(targeting.key, targeting.values);
      });

      ad.exclusions.forEach(function (exclusion) {
        slot.setCategoryExclusion(exclusion);
      });

      ad.scripts.forEach(function (script) {
        script(slot);
      });

      slot.addService(googletag.pubads());

      // When initialLoad is disabled, display()
      // will only register the slot as ready, but not actually
      // fetch an ad for it yet. This is done via refresh().
      googletag.display(element.id);

      // Send to the refresh proxy
      dfpRefresh(slot, ad.refresh, function () {
        if (ad.responsiveMapping.length > 0) {
          $window.on('resize', responsiveResize(slot));
        }
      });
    }

    // Push the ad slot definition into the command queue.
    doubleClick.then(defineSlot);
  }

  module.directive('dfpAd', ['$injector', function ($injector) {
    return {
      restrict: 'AE',
      controller: dfpAdController,
      bindToController: true,
      link: function link() {
        dfpAdDirective.apply(arguments.concat($injector));
      },
      scope: {
        adUnit: '@',
        clickUrl: '@',
        forceSafeFrame: '@',
        safeFrameConfig: '@',
        refresh: '@',
        collapseIfEmpty: '@'
      }
    };
  }]);

  // eslint-disable-next-line
})(angularDfp);

/**
 * @file Defines the `dfp-audience-pixel` directive.
 * @author Peter Goldsborough <peter@goldsborough.me>
 * @license MIT
 */

(function (module) {
  /**
   *
   * The `dfp-audience-pixel` tag.
   *
   * Audience pixels are useful for getting audience impressions on parts of a
   * page that do not show ads. Usually, audience impressions are generated when
   * a user sees an ad (unit) and is then eventually added to that audience
   * segmenet. However, when you have no ads but still want to record an
   * impression for an audience segment, you can add a transparent 1x1 pixel to
   * do so.
   *
   * @see [Google DFP Support]{@link https://support.google.com/dfp_premium/answer/2508388?hl=en}
   *
   * @param {Object} scope The angular scope.
   * @param {Object} element The HTML element on which the directive is defined.
   * @param {Object} attributes The attributes of the element.
   * @param {Object} $injector The angular `$injector` service.
   */
  function dfpAudiencePixelDirective(scope, element, attributes, $injector) {
    var format = $injector.get('dfpFormat');

    var axel = String(Math.random());
    var random = axel * 10000000000000;

    var adUnit = '';
    if (scope.adUnit) {
      adUnit = format('dc_iu={0};', scope.adUnit);
    }

    var ppid = '';
    if (scope.ppid) {
      ppid = format('ppid={0};', scope.ppid);
    }

    var pixel = document.createElement('img');

    pixel.src = format('https://pubads.g.doubleclick.net/activity;ord={0};dc_seg={1};{2}{3}', random, scope.segmentId, adUnit, ppid);

    pixel.width = 1;
    pixel.height = 1;
    pixel.border = 0;
    pixel.style.visibility = 'hidden';

    document.body.appendChild(pixel);
  }

  module.directive('dfpAudiencePixel', ['$injector', function ($injector) {
    return {
      restrict: 'E',
      scope: { adUnit: '@', segmentId: '@', ppid: '@' },
      link: function link() {
        dfpAudiencePixelDirective.apply(arguments.concat($injector));
      }
    };
  }]);

  // eslint-disable-next-line
})(angularDfp);

/**
 * @file Defines the `dfp-exclusion` directive.
 * @author Peter Goldsborough <peter@goldsborough.me>
 * @license MIT
 */

(function (module) {
  /**
   * The `dfp-exclusion` directive.
   *
   * This directive allows specifying a category exclusion label, such that ads
   * from that category exclusion will not show in this slot. This ensures, for
   * example, that airline ads don't show next
   * to articles of an airplane accident.
   *
   * @see [Google DFP Support]{@link https://support.google.com/dfp_premium/answer/2627086?hl=en}
   *
   * @param {Object} scope The angular scope.
   * @param {Object} element The HTML element on which the directive is defined.
   * @param {Object} attributes The attributes of the element.
   * @param {Object} ad The parent `dfp-ad` controller.
   */
  function dfpExclusionDirective(scope, element, attributes, ad) {
    ad.addExclusion(element.html());
  }

  module.directive('dfpExclusion', [function () {
    return {
      restrict: 'E',
      require: '^^dfpAd',
      link: dfpExclusionDirective
    };
  }]);

  // eslint-disable-next-line
})(angularDfp);

/**
 * @file An ID generating service.
 * @author Peter Goldsborough <peter@goldsborough.me>
 * @license MIT
 */

(function (module) {
  /**
   * [dfpIDGeneratorFactory description]
   * @return {Function} The dfpIDGenerator service.
   */
  function dfpIDGeneratorFactory() {
    /**
     * The hash of IDs generated so far.
     * @type {Object}
     */
    var generatedIDs = {};

    /**
     * Generates random IDs until unique one is found.
     * @return {Number} The unique numeric ID.
     */
    function generateID() {
      var id = null;

      do {
        var number = Math.random().toString().slice(2);
        id = 'gpt-ad-' + number;
      } while (id in generatedIDs);

      generatedIDs[id] = true;

      return id;
    }

    /**
     * The ID generator service.
     *
     * If the element passed has an ID already defined, it's uniqueness will be
     * checked. If it is not unique or not set at all, a new unique, random ID
     * is generated for the element.
     *
     * @param {Object} element The element whose ID to check or assign.
     * @return {Number} The unique ID of the element, or a new generated one.
     */
    function dfpIDGenerator(element) {
      if (element && element.id && !(element.id in generatedIDs)) {
        return element.id;
      }

      var id = generateID();
      if (element) element.id = id;

      return id;
    }

    /**
     * Tests if an ID is taken.
     * @param  {Number} id The ID to test.
     * @return {boolean} True if the ID is not unique, else false.
     * @see dfpIDGenerator.isUnique()
     */
    dfpIDGenerator.isTaken = function (id) {
      return id in generatedIDs;
    };

    /**
     * Tests if an ID is unique (not taken).
     * @param  {Number} id The ID to test.
     * @return {boolean} True if the ID is unique, else false.
     * @see dfpIDGenerator.isTaken()
     */
    dfpIDGenerator.isUnique = function (id) {
      return !dfpIDGenerator.isTaken(id);
    };

    return dfpIDGenerator;
  }

  module.factory('dfpIDGenerator', [dfpIDGeneratorFactory]);

  // eslint-disable-next-line
})(angularDfp);

/**
 * @file
 * @author Peter Goldsborough <peter@goldsborough.me>
 * @license MIT
 */

// eslint-disable-next-line no-use-before-define, no-var
var googletag = googletag || {};
googletag.cmd = googletag.cmd || [];

(function (module) {
  /**
   * An error thrown by the `dfpRefresh` service.
   */
  var DFPRefreshError = function (_Error2) {
    _inherits(DFPRefreshError, _Error2);

    function DFPRefreshError() {
      _classCallCheck(this, DFPRefreshError);

      return _possibleConstructorReturn(this, (DFPRefreshError.__proto__ || Object.getPrototypeOf(DFPRefreshError)).apply(this, arguments));
    }

    return DFPRefreshError;
  }(Error);

  /**
  * The core unit handling refresh calls to DFP.
  *
  * This provider exposes the `dfpRefresh` function, which, at the simplest, is
  * simply a proxy for `googletag.pubads().refresh()` and allows for dynamic ad
  * calls. However, do note that is has more complex refreshing functionality
  * built in, such as being able to buffer refresh calls and flush at certain
  * intervals, or have refresh call "barriers" (a fixed number of calls to wait
  * for) and global refresh intervals.
  *
  * @param {Object} $interval
  *                 {@link http://docs.angularjs.org/api/ng.$interval}
  * @param {Function} parseDuration The duration parsing service.
  */


  function dfpRefreshProvider($interval, parseDuration) {
    // Store reference
    var self = this;

    /**
     * The milliseconds to wait after receiving a refresh request
     * to see if more requests come that we can buffer.
     * @type {Number}
     */
    self.bufferInterval = 1000;

    /**
    *  The current limit of requests to buffer before sending a request.
    *  If a proxy timeout is set and times out but the amount has not
    *  yet been reached, the timeout will *not* be respected. That is,
    *  setting a barrier temporarily (disables) the timeout.
    * @type {Number}
    */
    self.bufferBarrier = null;

    /**
    *  If true, disables any barrier set once it was reached and re-enables
    *  any timeout. If false, the barrier must be manually
    *  disables via clearBarrier().
    * @type {boolean}
    */
    self.oneShotBarrier = true;

    /**
    *  The interval after which *all* ads on the page are refreshed.
    * @type {number}
    * @default 1 hour.
    */
    self.refreshInterval = 60 * 60 * 1000; // 60 minutes * 60 seconds * 1000ms

    /**
     * Dynamic weighting to prioritize certain
     * refresh mechanisms over others.
     * @type {Object}
     */
    self.priority = {
      refresh: 1,
      interval: 1,
      barrier: 1
    };

    self.$get = ['$rootScope', '$interval', 'parseDuration', function ($rootScope, $interval, parseDuration) {
      /**
       * The possible buffering/refreshing options
       * @type {!Object}
       */
      var Options = Object.freeze({
        REFRESH: 'refresh',
        INTERVAL: 'interval',
        BARRIER: 'barrier'
      });

      dfpRefresh.Options = Options;

      /**
       * The buffered ads waiting to be refreshed.
       * @type {Array}
       */
      var buffer = [];

      /**
       * Need to store all intervals because any interval created
       * using $interval must explicitly be destroyed, and to enable
       * stopping a refresh.
       * @type {Object}
       */
      var intervals = { refresh: null, buffer: null };

      /**
       * Stores the activity status of the buffering/refreshing options.
       * @type {Object}
       */
      var isEnabled = Object.seal({
        refresh: self.refreshInterval !== null,
        interval: self.bufferInterval !== null,
        barrier: self.bufferBarrier !== null
      });

      /**
       * The main interfacing function to the `dfpRefresh` proxy.
       *
       * Depending on the buffering configuration currently in place, the slot
       * passed may be buffered until either a barrier is reached or the
       * buffering interval elapses. If no buffering is set, the slot is
       * refreshed immediately.
       *
       * @param  {googletag.Slot} slot  The adslot to refresh.
       * @param  {string|number=} interval The interval at which to refresh.
       * @param  {Function} callback A callback to be executed after the refresh.
       * @return {promise} A promise, resolved after the refresh call.
       */
      function dfpRefresh(slot, interval, callback) {
        var deferred = Promise.defer();

        if (typeof interval === 'function') {
          callback = interval;
          interval = undefined;
        }

        var task = { slot: slot, deferred: deferred };

        if (interval === undefined) {
          scheduleRefresh(task);
        } else {
          addSlotInterval(task, interval);
        }

        return deferred.promise;
      }

      /**
       * Cancels an interval set for a certain ad slot.
       * @param  {googletag.Slot} slot The ad slot to cancel the interval for.
       * @throws DFPRefreshError When the given slot has not interval associated.
       * @return {Function} The current `dfpRefresh` instance.
       */
      dfpRefresh.cancelInterval = function (slot) {
        if (!dfpRefresh.hasSlotInterval(slot)) {
          throw new DFPRefreshError("No interval for given slot");
        }

        $interval.cancel(intervals[slot]);
        delete intervals[slot];

        return dfpRefresh;
      };

      /**
       * Tests if the given slot has an interval set.
       * @param  {googletag.Slot}  slot The slot to check.
       * @return {!boolean} True if an interval is set for the slot, else false.
       */
      dfpRefresh.hasSlotInterval = function (slot) {
        return slot in self.intervals;
      };

      /**
       * Sets a new value for the buffer interval.
       *
       * The buffer interval is the interval at which
       * the proxy buffer is flushed.
       *
       * @param {string|number} interval An interval string or number
       *                                 (asis valid for `parseDuration`).
       * @return {Function} The current `dfpRefresh` instance.
       */
      dfpRefresh.setBufferInterval = function (interval) {
        self.bufferInterval = parseDuration(interval);
        prioritize();

        return dfpRefresh;
      };

      /**
       * Clears any interval set for the buffering mechanism.
       * @return {Function} The current `dfpRefresh` instance.
       */
      dfpRefresh.clearBufferInterval = function () {
        if (!dfpRefresh.hasBufferInterval()) {
          console.warn("clearBufferInterval had no " + "effect because no interval was set.");
          return dfpRefresh;
        }

        disableBufferInterval();
        self.bufferInterval = null;

        prioritize();

        return dfpRefresh;
      };

      /**
       * Tests if currently any buffering interval is set.
       *
       * Note that even if a buffering interval is set, it may not currently
       * be active when also a barrier or global refresh interval with a
       * higher priority is active. This method will return true if
       * `setBufferInterval()` was ever called or a value was assigned to the
       * buffer interval property during configuration.
       *
       * @return {boolean} True if a buffer interval exists.
       * * @see dfpRefresh.bufferIntervalIsEnabled
       */
      dfpRefresh.hasBufferInterval = function () {
        return self.bufferInterval !== null;
      };

      /**
       * Tests if the buffer interval is currently *enabled*.
       *
       * Even if the service has a buffer interval configured, it may not be
       * currently enabled due to a lower priority setting relative to other
       * buffering/refreshing mechanisms.
       *
       * @return {boolean} True if the buffering interval is enabled, else false.
       * @see dfpRefresh.hasBufferInterval
       */
      dfpRefresh.bufferIntervalIsEnabled = function () {
        return isEnabled.interval;
      };

      /**
       * Returns the buffer interval setting (may be null).
       * @return {Number} The current buffer interval (in ms), if any.
       */
      dfpRefresh.getBufferInterval = function () {
        return self.bufferInterval;
      };

      /**
       * Sets a buffer barrier.
       *
       * A barrier is a number of refresh calls to wait before actually
       * performing a single refresh. I.e. it is the minimum buffer capacity
       * at which a refresh call is made. This is useful if you know that a
       * certain number of independent (that is, uncoordindated) refresh calls
       * will be made in a certain unit of time and you wish to wait for all
       * of them to arrive before calling new ads for all of them. For
       * example, you may have infinite scroll enabled and know that with
       * every new content fetch 3 ads come. Then you can pass the number 3 to
       * this method and the service will wait for 3 refresh calls before
       * actually refreshing them.
       *
       * @param {Number} numberOfAds The number of ads to wait for.
       * @param {Boolean=} oneShot     Whether to uninstall the barrier after the first flush.
       * @return {Function} The current `dfpRefresh` instance.
       */
      dfpRefresh.setBufferBarrier = function (numberOfAds, oneShot) {
        self.bufferBarrier = numberOfAds;
        self.oneShotBarrier = oneShot === undefined ? true : oneShot;
        prioritize();

        return dfpRefresh;
      };

      /**
       * Clears any buffer barrier set.
       * @return {Function} The current `dfpRefresh` instance.
       */
      dfpRefresh.clearBufferBarrier = function () {
        if (!dfpRefresh.hasBufferBarrier()) {
          console.warn("clearBufferBarrier had not effect because " + "no barrier was set.");
          return dfpRefresh;
        }

        self.bufferBarrier = null;
        prioritize();

        return dfpRefresh;
      };

      /**
       * Returns the any buffer barrier set.
       * @return {Number} The current barrier
       *                  (number of ads to buffer before flushing).
       */
      dfpRefresh.getBufferBarrier = function () {
        return self.bufferBarrier;
      };

      /**
       * Tests if any buffer barrier is set.
       *
       * Note that even if a buffer barrier is set, it may not currently
       * be active when also an interval or global refresh interval with a
       * higher priority is active. This method will return true if
       * `setBufferBarrier()` was ever called or a value was assigned to the
       * buffer barrier property during configuration.
       *
       * @return {boolean} True if a buffer barrier is set, else false.
       */
      dfpRefresh.hasBufferBarrier = function () {
        return self.bufferBarrier !== null;
      };

      /**
       * Tests if a buffer barrier is currently active.
       * @return {boolean} True if a buffer barrier is enabled, else false.
       */
      dfpRefresh.bufferBarrierIsEnabled = function () {
        return isEnabled.barrier;
      };

      /**
       * Tests if the current buffer barrier has "one-shot" behavior enabled.
       *
       * If a barrier is "one-shot", this means it is disabled after the
       * barrier count is reached for the first time.
       *
       * @return {boolean} True if "one-shot" behavior is active, else false.
       */
      dfpRefresh.bufferBarrierIsOneShot = function () {
        return self.oneShotBarrier;
      };

      /**
       * Sets the global refresh interval.
       *
       * This is the interval at which all ads are refreshed.
       *
       * @param {number|string} interval The new interval
       *                        (as valid for the `parseDuration` service.)
       * @return {Function} The current `dfpRefresh` instance.
       */
      dfpRefresh.setRefreshInterval = function (interval) {
        self.refreshInterval = parseDuration(interval);
        enableRefreshInterval();
        prioritize();

        return dfpRefresh;
      };

      /**
       * Tests if any refresh interval is set.
       *
       * Note that even if a refresh interval is set, it may not currently
       * be active when also a buffer barrier or interval with a
       * higher priority is active. This method will return true if
       * `setRefreshInterval()` was ever called or a value was assigned to
       * the refreshInterval property during configuration.
       *
       * @return {boolean} True if an interval is set, else false.
       */
      dfpRefresh.hasRefreshInterval = function () {
        return self.refreshInterval !== null;
      };

      /**
       * Tests if the refresh interval is currently active.
       * @return {boolean} True if a refresh interval
       *                   is currently active, else false.
       */
      dfpRefresh.refreshIntervalIsEnabled = function () {
        return isEnabled.refresh;
      };

      /**
       * Clears any refresh interval set.
       * @return {Function} The current `dfpRefresh` instance.
       */
      dfpRefresh.clearRefreshInterval = function () {
        if (!dfpRefresh.hasRefreshInterval()) {
          console.warn("clearRefreshInterval had no effect because " + "no refresh interval was set.");
        }

        disableRefreshInterval();
        prioritize();

        return dfpRefresh;
      };

      /**
       * Returns the current refresh interval, if any (may be `null`).
       * @return {Number} The current refresh interval.
       */
      dfpRefresh.getRefreshInterval = function () {
        return self.refreshInterval;
      };

      /**
       * Checks if either of the buffering mechanisms are enabled.
       * @return {!boolean} True if either the buffer barrier or
       *                   interval are enabled, else false
       */
      dfpRefresh.isBuffering = function () {
        return [Options.BARRIER, Options.INTERVAL].some(dfpRefresh.isEnabled);
      };

      /**
       * Tests if the given refreshing/buffering mechanism is installed.
       *
       * Installed does not mean active, as this is
       * determined by the prioritization algorithm.
       *
       * @param  {String}  option What to test activation for.
       * @return {!boolean} True if the given option was ever
       *                   installed, else false.
       */
      dfpRefresh.has = function (option) {
        switch (option) {
          case Options.REFRESH:
            return dfpRefresh.hasRefreshInterval();
          case Options.INTERVAL:
            return dfpRefresh.hasBufferInterval();
          case Options.BARRIER:
            return dfpRefresh.hasBufferBarrier();
          default:
            throw new DFPRefreshError('Invalid option \'' + option + '\'');
        }
      };

      /**
       * Tests if the given refreshing/buffering mechanisms is active.
       *
       * Note that being enabled is stronger than being installed (`has`),
       * since to be enabled the mechanism must be set, but also installed
       * by the prioritization algorithm.
       *
       * @param  {String}  option What to test for.
       * @return {!boolean} True if the option is enabled, else false.
       * @see dfpRefresh.Options
       * @throws DFPRefreshError if the option is not one of
       *         the DFPRefresh.Options members.
       */
      dfpRefresh.isEnabled = function (option) {
        ensureValidOption(option);
        return isEnabled[option];
      };

      /**
       * Sets the priority for the given option.
       *
       * The prioritzation algorithm allows mutual exclusion of any of the
       * three buffering/refreshing options. More precisely, only the
       * mechanisms whose priority is the maximum of all three will be
       * enabled, if installed. This means that when all have equal priority,
       * all three will be enabled (because their priority is equal to the
       * maximum), but when one has higher priority only that will run.
       *
       * @param {!String} option What to set the priority for.
       * @param {Number} priority The priority to set.
       * @return {Function} The current dfpRefresh instance.
       * @see dfpRefresh.Options
       * @throws DFPRefreshError if the option is not one of
       *         the DFPRefresh.Options members.
       */
      dfpRefresh.setPriority = function (option, priority) {
        ensureValidOption(option);
        ensureValidPriority(priority);
        self.priority[option] = priority;

        return dfpRefresh;
      };

      /**
       * Gets the priority setting for a given option.
       * @param  {String} option The option to check.
       * @return {Number} The priority of the option.
       */
      dfpRefresh.getPriority = function (option) {
        ensureValidOption(option);
        return self.priority[option];
      };

      /**
       * Sets the priority of the global refreshing mechanism.
       * @param {Number} priority The priority to give.
       */
      dfpRefresh.setRefreshPriority = function (priority) {
        dfpRefresh.setPriority('refresh');
      };

      /**
       * @return {Number} The priority of the global refreshing mechanism.
       */
      dfpRefresh.getRefreshPriority = function () {
        return dfpRefresh.getPriority('refresh');
      };

      /**
       * Sets the priority of the buffer barrier.
       * @param {Number} priority The priority to give.
       */
      dfpRefresh.setBarrierPriority = function (priority) {
        dfpRefresh.setPriority('barrier');
      };

      /**
       * @return {Number} The priority of the buffer barrier.
       */
      dfpRefresh.getBarrierPriority = function () {
        return dfpRefresh.getPriority('barrier');
      };

      /**
       * Sets the priority of the buffer interval.
       * @param {Number} priority The priority to give.
       */
      dfpRefresh.setIntervalPriority = function (priority) {
        ensureValidPriority(priority);
        dfpRefresh.setPriority('interval');
      };

      /**
       * @return {Number} The priority of the buffer interval.
       */
      dfpRefresh.getIntervalPriority = function () {
        return dfpRefresh.getPriority('interval');
      };

      /**
       * Utility function to check if an option is valid and throw if not.
       * @param  {String} option The option to check.
       * @throws DFPRefreshError if the option is not valid.
       */
      function ensureValidOption(option) {
        if (!(option in Options)) {
          throw new DFPRefreshError('Invalid option \'' + option + '\'');
        }
      }

      /**
       * Utility function to check if a priority is valid and throw if not.
       * @param  {*} priority The priority to check.
       * @throws DFPRefreshError if the priority is not valid.
       */
      function ensureValidPriority(priority) {
        if (typeof priority !== 'number') {
          throw new DFPRefreshError('Priority \'' + priority + '\' is not a number');
        }
      }

      /**
       * Enables or disables an option.
       * @param  {String} option The option to check.
       * @param  {boolean=} yes Whether to enable or not.
       */
      function enable(option, yes) {
        if (yes === false) {
          disable(option);
          return;
        }

        switch (option) {
          case Options.REFRESH:
            enableRefreshInterval();break;
          case Options.INTERVAL:
            enableBufferInterval();break;
          case Options.BARRIER:
            enableBufferBarrier();break;
          default:
            console.assert(false);
        }
      }

      /**
       * Disables the given option.
       * @param  {String} option The option to disable.
       */
      function disable(option) {
        switch (option) {
          case Options.REFRESH:
            disableRefreshInterval();break;
          case Options.INTERVAL:
            disableBufferInterval();break;
          case Options.BARRIER:
            disableBufferBarrier();break;
          default:
            console.assert(false);
        }
        /* eslint-enable max-statements-per-line*/
      }

      /**
       * The prioritization algorithm.
       *
       * Given the set of all available options O, where availability is
       * determined by the semantics of dfpRefresh.has, where each element o
       * in O has a given priority p_o, the algorithm will proceed to find the
       * maximum ofver all p_o. Given the maximum, all those options o in O
       * whose priority is equal to the maximum are enabled and all others
       * disabled.
       */
      function prioritize() {
        /**
         * The options theoretically possible.
         * @type {Array}
         */
        var options = Object.keys(Options);

        /**
         * The options available (installed).
         * @type {Array}
         */
        var available = options.filter(dfpRefresh.has);

        /**
         * The priorities of the available options.
         * @type {Array}
         */
        var priorities = available.map(function (option) {
          return self.priority[option];
        });

        /**
         * The maximum priority.
         * @type {Number}
         */
        var maximum = priorities.reduce(function (a, b) {
          return Math.max(a, b);
        });

        for (var index = 0; index < available.length; ++index) {
          if (priorities[index] === maximum) {
            enable(available[index]);
          } else {
            disable(available[index]);
          }
        }
      }

      /**
       * The main refreshing function.
       *
       * This function will either refresh all slots if called with no
       * arguments, or else all the slots passed in the array argument.
       *
       * @param  {?Array=} tasks An array of `(slot, promise)` pairs.
       */
      function refresh(tasks) {
        console.assert(tasks === undefined || tasks !== null);

        // If 'tasks' was not passed at all, we refresh all ads
        if (tasks === undefined) {
          googletag.pubads().refresh();
        }

        // Do nothing for a null or empty buffer
        if (tasks.length === 0) return;

        // Refresh any non-null slots. Slots can be null when the buffer is
        // not empty when the refresh interval triggers. The buffer can then
        // not be cleared, because that might mess with barriers. We also
        // can't reduce the barrier, because it may not be one-shot (i.e.
        // persistent).
        tasks = tasks.filter(function (pair) {
          return pair.slot !== null;
        });

        googletag.cmd.push(function () {
          googletag.pubads().refresh(tasks.map(function (task) {
            return task.slot;
          }));
          tasks.forEach(function (task) {
            return task.deferred.resolve();
          });
        });
      }

      /**
       * Sends the buffer off for refreshing and clears it.
       */
      function flushBuffer() {
        refresh(buffer);
        buffer = [];
      }

      /**
       * Enables the global refresh interval.
       */
      function enableRefreshInterval() {
        console.assert(dfpRefresh.hasRefreshInterval());

        var task = function task() {
          // Set the elments currently in the buffer to null,
          // since all ads will be refreshed, but the length
          //  must remain unchanged in case the barrier is not yet fulfilled
          buffer.fill(null);

          // Calling refresh() without any arguments
          // will refresh all registered ads on the site
          refresh();
        };

        var promise = $interval(task, self.refreshInterval);
        intervals.refresh = promise;
        isEnabled.refresh = true;
      }

      /**
       * Disables the refresh interval.
       *
       * The function is idempotent. That is, it is only effective if the
       * refresh interval is actually set, else it does nothing.
       */
      function disableRefreshInterval() {
        if (isEnabled.refresh) {
          $interval.cancel(intervals.refresh);
          intervals.refresh = null;
          isEnabled.refresh = false;
        }
      }

      /**
       * Enables the buffer interval.
       */
      function enableBufferInterval() {
        console.assert(dfpRefresh.hasBufferInterval());

        // Because the buffer interval may interleave with a barrier we don't
        // want the interval to take away elements that would prevent the
        // barrier from being reached just because the interval happened
        // before. As such, we still refresh, but then still take up the same
        // amount of space as before.
        var task = function task() {
          refresh(buffer);
          buffer.fill(null);
        };

        var promise = $interval(task, self.bufferInterval);
        intervals.buffer = promise;
        isEnabled.interval = true;
      }

      /**
       * Disables the buffer interval.
       *
       * The function is idempotent. That is, it is only effective if the
       * buffer interval is actually set, else it does nothing.
       */
      function disableBufferInterval() {
        if (isEnabled.interval) {
          $interval.cancel(intervals.buffer);
          intervals.buffer = null;
          isEnabled.interval = false;
        }
      }

      /**
       * Enables the buffer barrier.
       */
      function enableBufferBarrier() {
        console.assert(dfpRefresh.hasBufferBarrier());
        isEnabled.barrier = true;
      }

      /**
       * Disables the buffer barrier.
       *
       * The function is idempotent. That is, it is only effective if the
       * buffer barrier is actually set, else it does nothing.
       */
      function disableBufferBarrier() {
        isEnabled.barrier = false;
      }

      /**
       * Adds an interval for a given slot.
       * @param {!Object} task The `(slot, promise)` object.
       * @param {string|number} interval The interval duration to set.
       */
      function addSlotInterval(task, interval) {
        interval = parseDuration(interval);
        var promise = $interval(function () {
          scheduleRefresh(task);
        }, interval);
        intervals[task.slot] = promise;
      }

      /**
       * Schedules a refresh for a slot.
       *
       * This function is basically a proxy to refresh(), as it may either
       * buffer the refresh call or do it immediately.
       *
       * @param  {!Object} task The `(slot, promise)` object.
       * @see bufferRefresh()
       */
      function scheduleRefresh(task) {
        if (dfpRefresh.isBuffering()) {
          bufferRefresh(task);
        } else {
          refresh([task]);
        }
      }

      /**
       * Buffers a refresh call for a slot.
       * @param  {!Object} task The `(slot, promise)` object.
       */
      function bufferRefresh(task) {
        buffer.push(task);

        if (!isEnabled[Options.BARRIER]) return;
        if (buffer.length === self.bufferBarrier) {
          flushBuffer();
          if (self.oneShotBarrier) {
            dfpRefresh.clearBufferBarrier();
          }
        }
      }

      // Unregister all listeners when the root scope dies
      $rootScope.$on('$destroy', function () {
        // eslint-disable-next-line no-undef
        intervals.forEach(function (promise) {
          $interval.cancel(promise);
        });
      });

      prioritize();

      return dfpRefresh;
    }];
  }

  module.provider('dfpRefresh', [dfpRefreshProvider]);
  // eslint-disable-next-line
})(angularDfp);

/**
 * @file
 * @author Peter Goldsborough <peter@goldsborough.me>
 * @license MIT
 */

(function (module) {
  /**
   * The controller for the `dfp-responsive` directive.
   */
  function DFPResponsiveController() {
    /**
     * The size of the browser.
     *
     * A `dfp-responsive` tag always has one fixed browser width and height, and
     * then many possible ad sizes viable for ad calls for those browser
     * dimensions.
     *
     * @type {Array}
     */
    var browserSize = Object.seal([this.browserWidth, this.browserHeight]);

    /**
     * The ad sizes for the browser dimensions.
     * @type {Array}
     */
    var adSizes = [];

    /**
     * Asserts if the state of the controller is valid.
     * @return {!boolean} True if the state of the controller is
     *                   ready to be fetched, else false.
     */
    function isValid() {
      return adSizes.length > 0;
    }

    /**
     * Adds an ad size to the responsive mapping.
     * @param {Array} size A `[width, height]` array to add.
     */
    this.addSize = function (size) {
      adSizes.push(size);
    };

    /**
     * Retrieves the state of the controller.
     * @return {Object} The state of the controller, for use by the directive.
     */
    this.getState = function () {
      console.assert(isValid());
      return Object.freeze({
        browserSize: browserSize,
        adSizes: adSizes
      });
    };
  }

  /**
   * The directive for the responsive mapping.
   * @param {Object} scope The angular scope.
   * @param {Object} element The HTML element on which the directive is defined.
   * @param {Object} attributes The attributes of the element.
   * @param {Object} ad The parent `dfp-ad` controller.
   */
  function dfpResponsiveDirective(scope, element, attributes, ad) {
    var mapping = scope.controller.getState();
    ad.addResponsiveMapping(mapping);
  }

  module.directive('dfpResponsive', [function () {
    return {
      restrict: 'E',
      require: '^^dfpAd',
      controller: DFPResponsiveController,
      bindToController: true,
      link: dfpResponsiveDirective,
      scope: { browserWidth: '=', browserHeight: '=' }
    };
  }]);

  // eslint-disable-next-line
})(angularDfp);

/**
 * @file Defines the `dfp-script` directive.
 * @author Peter Goldsborough <peter@goldsborough.me>
 * @license MIT
 */

(function (module) {
  /**
   * Defines the `dfp-script` directive.
   *
   * The purpose of this directive is to allow additional operations on the ad
   * slot, in case any functionality was not covered by this library. More
   * precisely, the script is given access to the slot object (which may be
   * renamed, optionally) as well as a custom (optional) scope, to then perform
   * any further customizations.
   *
   * @param {Object} scope The angular scope.
   * @param {Object} element The HTML element on which the directive is defined.
   * @param {Object} attributes The attributes of the element.
   * @param {Object} ad The parent `dfp-ad` controller.
   * @param {Object} $injector The Angular `$injector` service.
   */
  function dfpScriptDirective(scope, element, attributes, ad, $injector) {
    var format = $injector.get('dfpFormat');
    var script = format('(function(scope, {0}) { {1} })', scope.slotAs || 'slot', element.html().trim());

    // Now we `eval` the script and bind the scope attribute (if any)
    // eslint-disable-next-line no-eval
    ad.addScript(eval(script).bind(null, scope.scope));
  }

  module.directive('dfpScript', ['$injector', function ($injector) {
    return {
      restrict: 'E',
      require: '^^dfpAd',
      scope: { slotAs: '@', scope: '=' },
      link: function link() {
        dfpScriptDirective.apply(arguments.concat($injector));
      }
    };
  }]);

  // eslint-disable-next-line
})(angularDfp);

/**
 * @file
 * @author Peter Goldsborough <peter@goldsborough.me>
 * @license MIT
 */

(function (module) {
  /**
   * The `dfp-size` directive.
   *
   * This directive, when nested under either the `dfp-ad` or `dfp-responsive`
   * tag, adds a size value to the parent. This size can either be given as
   * width and height dimension via attributes, or as any valid string size
   * (e.g. 'fluid') between the tags.
   *
   * @param {Object} scope The angular scope.
   * @param {Object} element The HTML element on which the directive is defined.
   * @param {Object} attributes The attributes of the element.
   * @param {Object} parent     The parent controller.
   */
  function DFPSizeDirective(scope, element, attributes, parent) {
    // Only one of the two possible parents will be `null`
    // Pick the most nested parent (`dfp-responsive`)
    parent = parent[1] || parent[0];

    if (scope.width && scope.height) {
      parent.addSize([scope.width, scope.height]);
    } else {
      parent.addSize(element[0].innerHTML);
    }
  }

  module.directive('dfpSize', [function () {
    return {
      restrict: 'E',
      require: ['?^^dfpAd', '?^^dfpResponsive'],
      scope: { width: '=', height: '=' },
      link: DFPSizeDirective
    };
  }]);

  // eslint-disable-next-line
})(angularDfp);

/**
 * @file Defines the controller and directive for the dfp-targeting tag.
 * @author Peter Goldsborough <peter@goldsborough.me>
 * @license MIT
 */

(function (module) {
  /**
   * The controller for DFP targeting (key-value) directives.
   *
   * This controller makes an `addValue` function available that allows the
   * `dfp-value` directive to add values for a single key attribute defined in
   * the directive.
   */
  function dfpTargetingController() {
    /**
     * The values of the targeting.
     * @type {Array}
     */
    var values = this.value ? [this.value] : [];

    /**
     * Verifies that the controller has a complete (valid) state.
     * @return {!boolean} True if the directive has all required members,
     *                   else false.
     */
    this.isValid = function () {
      if (!('key' in this)) return false;
      if (values.length === 0) return false;
      return true;
    };

    /**
     * Retrieves the public state of the controller for use by the directive.
     * @return {Object} The key and an array of values for the targeting.
     */
    this.getState = function () {
      console.assert(this.isValid());
      return Object.freeze({
        key: this.key,
        values: values
      });
    };

    /**
     * Adds a value for the key of the targeting.
     * @param {string} value The value to add for the key.
     */
    this.addValue = function (value) {
      values.push(value);
    };
  }

  /**
   * The directive for `dfp-targeting` tags.
   *
   * This directive requires to be nested in a `dfp-ad` tag. It may then be
   * used either by directly passing a `key` and a `value` via attributes, or
   * alternatively by specifying only a key and adding values via nested
   * `dfp-value` tags.
   *
   * @param {Object} scope The angular scope.
   * @param {Object} element The HTML element on which the directive is defined.
   * @param {Object} attributes The attributes of the element.
   * @param {Object} ad The parent `dfp-ad` controller.
   */
  function dfpTargetingDirective(scope, element, attributes, ad) {
    console.assert(ad !== undefined);

    // Retrieve the state from the controller and add it to the parent
    var targeting = scope.controller.getState();
    ad.addTargeting(targeting);
  }

  module.directive('dfpTargeting', [function () {
    return {
      restrict: 'E',
      require: '^^dfpAd', // require dfp-ad as parent
      controller: dfpTargetingController,
      bindToController: true,
      scope: { key: '@', value: '@' },
      link: dfpTargetingDirective
    };
  }]);

  // eslint-disable-next-line
})(angularDfp);

/**
 * @file
 * @author Peter Goldsborough <peter@goldsborough.me>
 * @license MIT
 */

(function (module) {
  /**
   * The `dfp-value` directive.
   *
   * The `dfp-value` directive allows specifying multiple values for a single
   * key when nested in a `dfp-targeting` directive.
   *
   * @param {Object} scope The angular scope.
   * @param {Object} element The HTML element on which the directive is defined.
   * @param {Object} attributes The attributes of the element.
   * @param {Object} parent     The parent (`dfp-targeting`) controller.
   */
  function dfpValueDirective(scope, element, attributes, parent) {
    parent.addValue(element.html());
  }

  module.directive('dfpValue', [function () {
    return {
      restrict: 'E',
      require: '^^dfpTargeting',
      link: dfpValueDirective
    };
  }]);
  // eslint-disable-next-line
})(angularDfp);

/**
 * @file Defines the `dfp-video` directive.
 * @author Peter Goldsborough <peter@goldsborough.me>
 * @license MIT
 */

// eslint-disable-next-line no-undef, no-unused-vars
var angularDfpVideo = angular.module('angularDfp');

(function (module) {
  /**
   * The `dfp-video` directive.
   *
   * This directive enables video ads to be shown over videos,
   * using `videojs` and the IMA SDK.
   *
   * @param {Object} scope The angular scope.
   * @param {Object} element The HTML element on which the directive is defined.
   * @param {Object} attributes The attributes of the element.
   * @param {Object} $injector The Angular '$injector' service.
   */
  function dfpVideoDirective(scope, element, attributes, $injector) {
    var dfpIDGenerator = $injector.get('dfpIDGenerator');

    // Unpack jQuery object
    element = element[0];

    // Generate an ID or check for uniqueness of an existing one (true = forVideo)
    dfpIDGenerator(element, true);

    /* eslint-disable no-undef */
    /**
     * The videojs player object.
     * @type {videojs.Player}
     */
    var player = videojs(element.id);
    /* eslint-enable no-undef */

    // Register the video slot with the IMA SDK
    player.ima({ id: element.id, adTagUrl: scope.adTag });
    player.ima.requestAds();
    player.ima.initializeAdDisplayContainer();
  }

  module.directive('dfpVideo', ['$injector', function ($injector) {
    return {
      restrict: 'AE',
      scope: { adTag: '@' },
      link: function link() {
        dfpVideoDirective.apply(arguments.concat($injector));
      }
    };
  }]);

  return module;

  // eslint-disable-next-line
})(angularDfpVideo);

/**
 * @file Defines the doubleClick service.
 * @author Peter Goldsborough <peter@goldsborough.me>
 * @license MIT
 */

// eslint-disable-next-line no-use-before-define, no-var
var googletag = googletag || {};
googletag.cmd = googletag.cmd || [];

(function (module) {
  "use strict";

  var DFPConfigurationError = function (_Error3) {
    _inherits(DFPConfigurationError, _Error3);

    function DFPConfigurationError() {
      _classCallCheck(this, DFPConfigurationError);

      return _possibleConstructorReturn(this, (DFPConfigurationError.__proto__ || Object.getPrototypeOf(DFPConfigurationError)).apply(this, arguments));
    }

    return DFPConfigurationError;
  }(Error);

  /**
   * The URL to the GPT library we want to load asynchronously.
   */


  module.constant('GPT_LIBRARY_URL', '//www.googletagservices.com/tag/js/gpt.js');

  /**
   * The provider for the doubleClick service.
   *
   * The doubleClick service is responsible for main initial configuration
   * tasks, injecting the GPT library asynchronously and providing the `then`
   * proxy to `googletag.cmd.push`.
   *
   * @param {Object} scriptInjector The script injection service.
   * @param {string} GPT_LIBRARY_URL The URL of the GPT library to inject.
   */
  function dfpProvider(scriptInjector, GPT_LIBRARY_URL) {
    /**
     * The doubleClickProvider function.
     * @type {Function}
     * @constant
     */
    var self = this;

    /**
     * Whether to enable Single Request Architecture (SRA) mode.
     * @type {boolean}
     * @see [GPT Reference]{@link https://developers.google.com/doubleclick-gpt/reference#googletag.PubAdsService_enableSingleRequest}
     */
    self.enableSingleRequestArchitecture = true;

    /**
     * Whether to enable video ads.
     * @type {!boolean}
     * @see [GPT Reference]{@link https://developers.google.com/doubleclick-gpt/reference#googletag.PubAdsService_enableVideoAds}
     */
    self.enableVideoAds = true;

    /**
     * Whether to collapse empty divs for which ad calls fail.
     * @type {boolean}
     * @see [GPT Reference]{@link https://developers.google.com/doubleclick-gpt/reference#googletag.PubAdsService_collapseEmptyDivs}
     */
    self.collapseIfEmpty = true;

    /**
     * Whether to enable the initial load of ads.
     *
     * This is necessary if you want to be able to
     * manually refresh ads with refresh().
     *
     * @type {boolean}
     * @see [GPT Reference]{@link https://developers.google.com/doubleclick-gpt/reference#googletag.PubAdsService_disableInitialLoad}
     */
    self.disableInitialLoad = true;

    /**
     * Whether to enable synchronous rendering.
     *
     * Rendering is asynchronous by default.
     * @type {boolean}
     * @see [GPT Reference]{@link https://developers.google.com/doubleclick-gpt/reference#googletag.PubAdsService_enableSyncRendering}
     */
    self.enableSyncRendering = false;

    /**
     * Enables ad centering instead of left-alignment.
     * @type {boolean}
     * @see [GPT Reference]{@link https://developers.google.com/doubleclick-gpt/reference#googletag.PubAdsService_setCentering}
     */
    self.centering = false;

    /**
     * The location information to pass to DFP.
     *
     * This should either be an array of `[longitude, latitude [, radius]]`
     * numbers or a freefrom address string. You must enable usage of this
     * information in DFP.
     *
     * @type {?Array|String}
     * @see [GPT Reference]{@link https://developers.google.com/doubleclick-gpt/reference#googletag.PubAdsService_setLocation}
     */
    self.location = null;

    /**
     * Your Publisher-Provided Identifier, if you have any.
     * @type {?String}
     * @see [GPT Reference]{@link https://developers.google.com/doubleclick-gpt/reference#googletag.PubAdsService_setPublisherProvidedId}
     */
    self.ppid = null;

    /**
     * An optional object of global targeting key/values.
     *
     * These will apply to all ad slots.
     * The format should be `(key, value|[values])`.
     * @type {?Object}
     * @see [GPT Reference]{@link https://developers.google.com/doubleclick-gpt/reference#googletag.PubAdsService_setTargeting}
     */
    self.globalTargeting = null;

    /**
     * Whether all ad slots should force safe frame by default.
     * @type {boolean}
     */
    self.forceSafeFrame = false;

    /**
     * Optionally, configuration information for safe frames.
     *
     * @example
     * var config = {
     *   allowOverlayExpansion: true,
     *   allowPushExpansion: true,
     *   sandbox: true
     *};
     * @type {?Object}
     */
    self.safeFrameConfig = null;

    /**
     * Whether or not we have loaded the GPT library yet.
     * @type {!boolean}
     */
    var loaded = false;

    /**
     * Handles the safe-frame configuration.
     * @param {googletag.PubAdsService} pubads The googletag pubads service.
     */
    function addSafeFrameConfig(pubads) {
      if (!self.safeFrameConfig) return;
      if (_typeof(self.globalTargeting) !== 'object') {
        throw new DFPConfigurationError('Targeting must be an object');
      }
      pubads.setSafeFrameConfig(self.safeFrameConfig);
    }

    /**
     * Handles the targeting configuration.
     * @param {googletag.PubAdsService} pubads The googletag pubads service.
     */
    function addTargeting(pubads) {
      if (!self.globalTargeting) return;
      if (_typeof(self.globalTargeting) !== 'object') {
        throw new DFPConfigurationError('Targeting must be an object');
      }

      for (var key in self.globalTargeting) {
        if (self.globalTargeting.hasOwnProperty(key)) {
          pubads.setTargeting(key, self.globalTargeting[key]);
        }
      }
    }

    /**
     * Handles the location configuration.
     * @param {googletag.PubAdsService} pubads The googletag pubads service.
     */
    function addLocation(pubads) {
      if (!self.location) return;

      if (typeof self.location === 'string') {
        pubads.setLocation(self.location);
        return;
      }

      if (!Array.isArray(self.location)) {
        throw new DFPConfigurationError('Location must be an ' + 'array or string');
      }

      pubads.setLocation.apply(pubads, self.location);
    }

    /**
     * Handles the ppid configuration.
     * @param {googletag.PubAdsService} pubads The googletag pubads service.
     */
    function addPPID(pubads) {
      if (!self.ppid) return;
      if (typeof self.ppid !== 'string') {
        throw new DFPConfigurationError('PPID must be a string');
      }

      pubads.setPublisherProvidedId(self.ppid);
    }

    /**
     * The configuration function called to initialize the doubleClick service.
     */
    function dfp() {
      // Push the initial configuration into the command queue.
      googletag.cmd.push(function () {
        var pubads = googletag.pubads();

        if (self.enableSingleRequestArchitecture) {
          pubads.enableSingleRequest();
        }

        if (self.enableVideoAds) {
          pubads.enableVideoAds();
        }

        if (self.collapseIfEmpty) {
          pubads.collapseIfEmpty();
        }

        if (self.disableInitialLoad) {
          pubads.disableInitialLoad();
        }

        if (self.enableSyncRendering) {
          pubads.enableSyncRendering();
        }

        pubads.setForceSafeFrame(self.forceSafeFrame);
        pubads.setCentering(self.centering);

        addLocation(pubads);
        addPPID(pubads);
        addTargeting(pubads);
        addSafeFrameConfig(pubads);

        googletag.enableServices();
      });

      scriptInjector(GPT_LIBRARY_URL).then(function () {
        loaded = true;
      });
    }

    /**
     * Tests if the GPT library has been injected yet.
     * @return {boolean} [description]
     */
    dfp.hasLoaded = function () {
      return loaded;
    };

    /**
     * Pushes a taks into GPT's asynchronous task queue.
     * @param  {Function} task The task function to execute in the queue.
     */
    dfp.then = function (task) {
      googletag.cmd.push(task);
    };

    // The factory function
    this.$get = function () {
      return dfp;
    };
  }
  module.provider('dfp', ['scriptInjector', 'GPT_LIBRARY_URL', dfpProvider]);

  // eslint-disable-next-line
})(angularDfp);