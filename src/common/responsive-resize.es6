/**
* @file Defines the responsiveResize service.
* @author Peter Goldsborough <peter@goldsborough.me>
* @license MIT
*/

(function(module) {
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
    return function(element, boundaries) {
      boundaries = boundaries || [320, 780, 1480];
      console.assert(Array.isArray(boundaries));

      /**
       * The interval for polling changes in the iframe's dimensions.
       * @type {number}
       * @constant
       */
      const POLL_INTERVAL = 100; // 100ms

      /**
       * How long we poll (at the rate of POLL_INTERVAL).
       * @type {number}
       * @constant
       */
      const POLL_DURATION = 2500; // 2.5s

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
        $timeout(function() {
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

        const iframe = queryIFrame();

        // Get the width currently set in the style, without the 'px'
        const initialWidth = iframe.style.width.slice(0, -2);

        const poll = $interval(function() {
          // The iframe element may change between calls
          const iframe = queryIFrame();
          if (iframe.width !== initialWidth) {
            normalizeIFrame(iframe);
          }
        }, POLL_INTERVAL);

        $timeout(function() {
          $interval.cancel(poll);
        }, POLL_DURATION);

        // An additional resize listener helps for tricky cases
        // eslint-disable-next-line no-undef
        $window.on('resize', function() {
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
          const width = $window.innerWidth;
          const last = boundaries.length - 1;

          for (let index = 0, last; index < last; ++index) {
            if (width < boundaries[index + 1]) return index;
          }

          return last;
        }

        /**
         * The index corresponding to the current boundaries of the element.
         * @type {number}
         */
        let index = determineIndex();

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
          dfpRefresh(slot, function() {
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

  module.addFactory('responsiveResize',
                    ['$interval', '$timeout', '$window', 'dfpRefresh',
                     responsiveResizeFactory]);

  // eslint-disable-next-line
})(angularDfp);