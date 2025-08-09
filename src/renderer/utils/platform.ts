export const isMacOS = (): boolean => {
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0 ||
         navigator.userAgent.toUpperCase().indexOf('MAC') >= 0;
};

export const isWindows = (): boolean => {
  return navigator.platform.toUpperCase().indexOf('WIN') >= 0;
};

export const isLinux = (): boolean => {
  return navigator.platform.toUpperCase().indexOf('LINUX') >= 0;
};