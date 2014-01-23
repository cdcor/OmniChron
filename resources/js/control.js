/* ----------
   control.js

   Initializes the document.
   ---------- */

var COMPILER_ID = 'compiler';
var OS_ID = 'os';
var CPU_ID = 'cpu';

var URL_PARAMETERS = null;

var __resizeFunctions = [];

var Control = {};

var Compiler = {};
var OS = {};
var CPU = {};

// Globals specific to each application will be defined in that application's control.js within
//   the respective objects.

(function () {

Control.init = function () {
	// General
	URL_PARAMETERS = Utils.getUrlParameters();
	Layout.init();

	// OS
	OS.Control.init();

	if (URL_PARAMETERS.start) {
        MainTabs.select({ data: URL_PARAMETERS.start });
    }
};

Control.resize = function () {
	for (var i = __resizeFunctions.length - 1; i >= 0; i--) {
		__resizeFunctions[i]();
	}
};

$(window).load(Control.init);
$(window).resize(Control.resize);

})();