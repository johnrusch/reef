export function truncatePath(path: string, maxLength: number = 35): string {
  const parts = path.split('/');
  const filename = parts.pop() || '';
  
  // If the full path fits, return it as-is
  if (path.length <= maxLength) return path;
  
  // If filename alone is too long, truncate it with ellipsis at start
  if (filename.length >= maxLength - 3) {
    return '...' + filename.substring(filename.length - maxLength + 3);
  }
  
  // For deeply nested paths, show the most relevant parts
  // Strategy: Show first directory (often important context) and immediate parent + filename
  if (parts.length === 0) {
    return filename;
  } else if (parts.length === 1) {
    // Simple case: one directory + filename
    const dir = parts[0];
    const availableForDir = maxLength - filename.length - 1; // -1 for '/'
    if (availableForDir > 0 && dir.length <= availableForDir) {
      return dir + '/' + filename;
    } else {
      return '.../' + filename;
    }
  } else {
    // Complex case: multiple directories
    const firstDir = parts[0];
    const parentDir = parts[parts.length - 1];
    
    // Try to show: firstDir/.../parentDir/filename
    const minRequired = firstDir.length + 4 + parentDir.length + 1 + filename.length; // 4 for '/.../', 1 for final '/'
    
    if (minRequired <= maxLength) {
      // We can show first + parent + filename
      return `${firstDir}/.../${parentDir}/${filename}`;
    } else if (parentDir.length + filename.length + 4 <= maxLength) {
      // We can at least show parent + filename (4 chars for '.../') 
      return `.../${parentDir}/${filename}`;
    } else {
      // Just show as much of the end as possible
      return '.../' + filename;
    }
  }
}

export function getFilename(path: string): string {
  return path.split('/').pop() || path;
}