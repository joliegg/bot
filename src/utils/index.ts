// 
export const URL_REGEX = new RegExp(/((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/);

export const isURL = (text: string): boolean => {
  // Check if the text is a discord emote
  if ((text.indexOf('<:') === 0 || text.indexOf('<a:') === 0) && text.lastIndexOf('>') === (text.length - 1)) {
    return false;
  }

  // Check if the text is a native emote
  if (text.indexOf(':') === 0 && text.lastIndexOf(':') === (text.length - 1)) {
    return false;
  }

  return URL_REGEX.test(text);
};

