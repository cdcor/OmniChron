/* ----------
   file.js

   Represents a file containing data to be stored on the hard drive. Most simply, this object is an
   abstraction of a block on the hard drive.

   These file objects contain a status, TSB linked to the next block of the file (if it exists), and
   the data. The data stored in the actual object is the data represented as a string. For example,
   if the user creates a file named "abc.txt", the data for the file object will be "abc.txt".

   When the data is stored to the hard drive it will be converted to a binary representation
   according to the JavaScript character codes. For example, "a" will be converted to "61" hex.
   "abc.txt" will be converted to "6162632E747874" hex.

   Although this wastes local storage (storing 2 hex characters for every single character of a
   file), local storage is something we have plenty of. Furthermore, this representation more
   accurrately emulates a real hard drive, which stores the data as bit strings.

   Binary data to be stored can be specified when setting the data. This will maintain the true form
   of the data when storing it to the hard drive, which is useful for displaying the data when
   swapping, for example. Binary data "ABCD" hex will be stored to the drive as "ABCD", rather than
   storing the character codes for each hex digit.
   ---------- */

(function () {

/**
 * Creates a file for storing text data on the hard drive.
 *
 * @param {String} data the data to be stored in the file
 * @param {Boolean} isBinaryData true if the data passed to the file is binary data (i.e. it
 *     should not be converted as text).
 */
OS.File = function (data, isBinaryData) {
    // Status and TSB
    this.status = OS.FileStatus.OCCUPIED_TEXT;
    this.track = 0;
    this.sector = 0;
    this.block = 0;
    // TSB linked to
    this.linkedTrack = 0;
    this.linkedSector = 0;
    this.linkedBlock = 0;
    // The data
    this.data = '';

    if (data) {
        this.setData(data, isBinaryData);
    }
};

// The maximum size of the data per block in bytes. For now, 4 is a magic number, relying on the
//   number of tracks, sectors, and blocks per to be 4, 8, and 8, respectively. TODO Fix
OS.File.DATA_SIZE = /*OS.HardDrive.BLOCK_SIZE*/ 64 - 4;

/**
 * Sets this file's data with the string read directly from the hard drive.
 *
 * @param {String} fileStr the string representing this file
 */
OS.File.prototype.setWithFileString = function (fileStr) {
    // File string is of the form: Status T  S  B  Data
    //             Hex Characters: 00     00 00 00 00000000...

    fileStr = fileStr.replace(/\s+/g, '');

    this.status = OS.FileStatus.fromId(parseInt(fileStr.substr(0, 2), 16));
    this.linkedTrack = parseInt(fileStr.substr(2, 2), 16);
    this.linkedSector = parseInt(fileStr.substr(4, 2), 16);
    this.linkedBlock = parseInt(fileStr.substr(6, 2), 16);
    this.data = revertData(fileStr.substr(8));
};

/**
 * Sets the TSB of this file.
 *
 * @param {Number} track the track
 * @param {Number} sector the sector
 * @param {Number} block the block
 */
OS.File.prototype.setTSB = function (track, sector, block) {
    this.track = track;
    this.sector = sector;
    this.block = block;
};

/**
 * Sets the TSB this file links to.
 *
 * @param {Number} track the track
 * @param {Number} sector the sector
 * @param {Number} block the block
 */
OS.File.prototype.setLinkedTSB = function (track, sector, block) {
    this.linkedTrack = track;
    this.linkedSector = sector;
    this.linkedBlock = block;
};

/**
 * Sets the data this file containes.
 *
 * @param {String} data the data to set
 * @param {Boolean} isBinaryData true if the data to be stored is swap data
 */
OS.File.prototype.setData = function (data, isBinaryData) {
    // Hex
    if (isBinaryData) {
        if (data.length % 2 === 1)
            throw "Binary data must be a whole number of bytes.";

        this.data = revertData(data);
        this.status = OS.FileStatus.OCCUPIED_BIN;
    // Text
    } else {
        this.data = data;
        this.status = OS.FileStatus.OCCUPIED_TEXT;
    }
};

/**
 * Retrives the data of this file.
 *
 * @return {String} the data
 */
OS.File.prototype.getData = function () {
    if (this.status === OS.FileStatus.OCCUPIED_TEXT) {
        // Remove null characters
        return this.data.replace(/\x00+/g, '');
    }

    if (this.status === OS.FileStatus.OCCUPIED_BIN) {
        return convertData(this.data)[0];
    }

    return null;
};

OS.File.prototype.isSystemFile = function () {
    return OS.File.isSystemName(this.getData());
};

/**
 * Returns true if this file is available.
 *
 * @return {Boolean} true if this file is available
 */
OS.File.prototype.isAvailable = function () {
    return this.status === OS.FileStatus.AVAILABLE;
};

/**
 * Returns true if this file links to another (i.e. the linkedTSB is not 0, 0, 0)
 *
 * @return {Boolean} true if this file links to another
 */
OS.File.prototype.isLinked = function () {
    return !(this.linkedTrack === 0 && this.linkedSector === 0 && this.linkedBlock === 0);
};

/**
 * Returns this file represented as a string to be stored on the hard drive. Note that the actual
 * TSB is not stored in the string, as that will be the key/index to this file.
 *
 * @return {String} this file represented as a string to be stored on the hard drive
 */
OS.File.prototype.toFileString = function () {
    // File string is of the form: Status T  S  B  Data
    //             Hex Characters: 00     00 00 00 00000000...

    var str = '';

    str += this.status.id.toHex(2);
    str += this.linkedTrack.toHex(2);
    str += this.linkedSector.toHex(2);
    str += this.linkedBlock.toHex(2);

    var data = convertData(this.data);

    return str + data[0];
};

/**
 * Writes this file to the specified hard drive.
 *
 * @param {HardDrive} hardDrive the hard drive
 */
OS.File.prototype.writeToDrive = function (hardDrive) {
    hardDrive.write(this.track, this.sector, this.block, this.toFileString());
};

/**
 * Deletes this file from the specified hard drive.
 *
 * @param {HardDrive} hardDrive the hard drive
 */
OS.File.prototype.deleteFromDrive = function (hardDrive) {
    this.status = OS.FileStatus.AVAILABLE;
    hardDrive.write(this.track, this.sector, this.block, this.toFileString());
};

/**
 * Converts the specified data string to a form appropriate for storage on the hard drive (hex).
 *
 * @param {String} data the data to convert
 * @param {Boolean} isBinaryData true if the data to be converted is swap data.
 *
 * @return {Array} an array of data strings to be stored on the hard drive. The array will only be
 *     of size 1 if the data does not exceed the block size.
 */
var convertData = OS.File.convertData = function (data, isBinaryData) {
    data += '\0'; // Null terminate

    var maxLength = isBinaryData ? OS.File.DATA_SIZE * 4 : OS.File.DATA_SIZE * 2; // 2 Hex chars per byte
    var convertedData = '', convertedArray = [];

    for (var i = 0; i < data.length; i++) {
        convertedData += data.charCodeAt(i).toHex(2);

        if (convertedData.length >= maxLength) {
            convertedArray.push(convertedData);
            convertedData = '';
        }
    }

    // Extend to the data size
    convertedData = convertedData.pad(maxLength, '00');
    convertedArray.push(convertedData);

    return convertedArray;
};

/**
 * Reverts the hard drive data string for a file to a string representation.
 *
 * @param {String} data the data
 *
 * @return {String} data the reverted data
 */
var revertData = OS.File.revertData = function (data) {
    var revertedData = '';

    for (var i = 0; i < data.length; i += 2) {
        revertedData += String.fromCharCode(parseInt(data.substr(i, 2), 16));
    }

    return revertedData;
};

/**
 * Returns an array of chained files representing the specified data.
 *
 * @param {String} data the data
 * @param {Boolean} isBinaryData true if the data is swap data
 *
 * @return {Array} the chained files representing the data.
 */
OS.File.filesFromData = function (data, isBinaryData) {
    var dataParts = convertData(data, isBinaryData);
    var files = [];

    for (var i = 0; i < dataParts.length; i++) {
        files.push(new OS.File(revertData(dataParts[i]), isBinaryData));
    }

    return files;
};

/**
 * Returns a file given the hard drive's string representation.
 *
 * @param {Object} fileStr the file string
 *
 * @return {File} the file
 */
OS.File.fileFromStr = function (fileStr) {
    var file = new OS.File();
    file.setWithFileString(fileStr);

    return file;
};

OS.File.isSystemName = function (filename) {
    return filename && filename.contains('.sys');
};

})();
