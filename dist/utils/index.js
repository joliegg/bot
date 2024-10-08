"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadFile = exports.expandURL = exports.isURL = exports.URL_REGEX = void 0;
exports.URL_REGEX = new RegExp(/((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/);
const isURL = (text) => {
    // Check if the text is a Markdown link
    if (text.indexOf('[') === 0 && text.lastIndexOf(')') === (text.length - 1)) {
        const [textPart, urlPart] = text.substring(1, text.length - 1).split('](');
        return (0, exports.isURL)(urlPart);
    }
    try {
        new URL(text);
        return true;
    }
    catch {
        return false;
    }
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
const downloadFile = async (url) => {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    return {
        data: Buffer.from(buffer),
        contentType: response.headers.get('content-type'),
    };
};
exports.downloadFile = downloadFile;
