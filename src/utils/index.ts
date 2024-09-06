export const URL_REGEX = new RegExp(/((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/);

export const isURL = (text: string): boolean => {
  // Check if the text is a Markdown link
  if (text.indexOf('[') === 0 && text.lastIndexOf(')') === (text.length - 1)) {
    const [textPart, urlPart] = text.substring(1, text.length - 1).split('](');

    return isURL(urlPart);
  }

  // We want to check even the non-active links
  if (!text.startsWith('http')) {
    text = `https://${text}`;
  }

  try {
    new URL(text);
    return true;
  } catch {
    return false;
  }
};

export const expandURL = async (url: string): Promise<string> => { 
  const response = await fetch(url, {
    method: 'HEAD',
    redirect: 'manual',
  });

  if (response.status === 301 || response.status === 302) {
    return response.headers.get('location') || url;
  }

  return url;
};
