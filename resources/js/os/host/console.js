/* ----------
   console.js

   This combines both the function's of the host's screen and keyboard as they are nearly
   inseparable from a JavaScript perspective.
   ---------- */

OS.Console = {};

(function () {

var _$console;
var _$consoleOutput;
var _$consoleInput;

var _$bsod;

var _$prompt;
var _$input;
var _$caret;

var _caretInterval;

var _prompt;
var _inputText;
var _inputBuffer;

OS.Console.init = function () {
    _$console = $('#osConsole');
    // Output
    _$consoleOutput = $('#osConsoleOutput');
    // Input and associated elements
    _$consoleInput = $('#osConsoleInput');

    _$bsod = $('#osBsod');
    _$bsod.html("<h1>:(</h1><h3>ChronOS ran into a problem that it couldn't handle, and now it needs to restart.</h3>");

    _prompt = 'ChronOS>';
    _inputText = '';
    _inputBuffer = [];

    // Prompt
    _$prompt = $('<span>' + _prompt + '</span>');
    _$consoleInput.append(_$prompt);

    // Where the input is displayed
    _$input = $('<span tabIndex="0"></span>');
    _$consoleInput.append(_$input);

    // The flashing caret
    _$caret = $('<span class="osConsoleCaret">&#9608;</span>');
    _$consoleInput.append(_$caret);

    _$input.focus(function () {
        clearInterval(_caretInterval);
        _$caret.removeClass('osConsoleCaret');
        _caretInterval = setInterval(caretFlash, 500);
    }).blur(function () {
        _$caret.addClass('osConsoleCaret');
        clearInterval(_caretInterval);
    });

    _$console.click(function () { _$input.focus(); });
};

OS.Console.start = function () {
    _$consoleOutput.html('');
    _$input.text('');
    _inputText = '';
    _inputBuffer = [];

    _$console.css('opacity', 1);
    _$input.on('keydown', input);

    scrollToTop();
};

OS.Console.stop = function () {
    _$console.css('opacity', 0);
    _$input.off('keydown');
    _$bsod.css('opacity', 0);
    // Hide after fade is completed so it doesn't block the console.
    setTimeout(function () { _$bsod.hide(); }, 400);
};

OS.Console.clear = function () {
    _$consoleOutput.html('');
    scrollToTop();
};

OS.Console.setPrompt = function (prompt) {
    _prompt = prompt;
    _$prompt.html(prompt);
};

function input(event) {
    // Check if F5 was pressed to refresh page
    if (event.which === 116) {
        return;
    }

    event.preventDefault();
    // Do not interrupt for Ctrl, Alt, or Shift, as they are sent with the key if depressed.
    if (!(event.which >= 15 && event.which <= 17)) {
        var isBufferEmpty = _inputBuffer.length === 0;

        _inputBuffer.enqueue({
            which: event.which,
            ctrl: event.ctrlKey,
            alt: event.altKey,
            shift: event.shiftKey
        });

        if (isBufferEmpty) {
            OS.Kernel.interrupt(OS.Irq.KEYBOARD);
        }
    }
}

OS.Console.getInputBuffer = function () {
    var buffer = _inputBuffer;
    _inputBuffer = [];
    return buffer;
};

OS.Console.bsod = function () {
    _$bsod.show().css('opacity', 1);
};

OS.Console.writeInput = function (chr) {
    _inputText += chr;
    _$input.text(_inputText);
    scrollToBottom();
};

OS.Console.backspace = function () {
    if (_inputText.length) {
        _inputText = _inputText.substring(0, _inputText.length - 1);
        _$input.text(_inputText);
    }
};

OS.Console.enter = function () {
    _$consoleOutput.append('<div class="input">' + _prompt + _$input.html() + '</div>');

    if (_inputText.length) {
        OS.Shell.issueCommand(getWriteFunction(), _inputText);

        _inputText = '';
        _$input.text('');
    }

    scrollToBottom();
};

var getWriteFunction = OS.Console.getWriteFunction = function () {
    var $output = $('<div class="output"></div>');
    _$consoleOutput.append($output);

    return function (output, classes, setActive) {
        if (classes) {
            $output.html($output.html() + formatOutput('`' + classes + '`' + output + '``'));
        } else {
            $output.html($output.html() + formatOutput(output));
        }

        if (setActive) {
            $output.addClass('active');
        } else if (setActive === false) {
            $output.removeClass('active');
        }

        // TODO If the user scrolled up to view previous output, this should NOT scroll to the
        //   bottom.
        scrollToBottom();
    };
};

function caretFlash() {
    _$caret.toggleClass('osConsoleCaret');
}

function formatOutput(output) {
    output = Utils.textToHtml(output);

    return output.replace(/`([\w ]+)`(.*?)``/g, '<span class="$1">$2</span>');
}

function scrollToBottom() {
    _$console.scrollTop(_$consoleOutput.height() + _$consoleInput.height());
    _$console.perfectScrollbar('update');
}

function scrollToTop() {
    _$console.scrollTop(0);
    _$console.perfectScrollbar('update');
}

// ---------- ----------

function backspace_old(event) {
    if (event.which === 8) {
        event.preventDefault();
        _inputBuffer = _inputBuffer.slice(0, -1);
        _$input.text(_inputBuffer);
    }
}

function input_old(event) {
    event.preventDefault();
    switch(event.which) {
    case 13: // Enter
        _$consoleOutput.append('<div class="grey">' + _prompt + _$input.html() + '</div>');
        _$input.text('');
        // TODO something with buffer
        _inputBuffer = '';
        break;
    default:
        _inputBuffer += String.fromCharCode(event.which);
        //_inputBuffer += String.fromCharCode((96 <= event.keyCode && event.keyCode <= 105) ? event.keyCode - 48 : event.keyCode);
        _$input.text(_inputBuffer);
    }
}

})();
