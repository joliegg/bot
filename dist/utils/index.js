"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expandURL = exports.isURL = exports.URL_REGEX = void 0;
// 
exports.URL_REGEX = new RegExp(/((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/);
const isURL = (text) => {
    // Check if the text is a discord emote
    if ((text.indexOf('<:') === 0 || text.indexOf('<a:') === 0) && text.lastIndexOf('>') === (text.length - 1)) {
        return false;
    }
    // Check if the text is a native emote
    if (text.indexOf(':') === 0 && text.lastIndexOf(':') === (text.length - 1)) {
        return false;
    }
    return exports.URL_REGEX.test(text);
};
exports.isURL = isURL;
const expandURL = async (url) => {
    const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'manual',
    });
    if (response.status === 301 || response.status === 302) {
        return response.headers.get('location') || url;
    }
    return url;
};
exports.expandURL = expandURL;
