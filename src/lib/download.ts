export function download(url: string, name: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
}

/**
 * Downloads files one after another. Browsers drop downloads that are triggered too quickly together, and
 * Chrome asks once for permission to download multiple files.
 */
export async function downloadAll(files: { url: string; name: string }[]) {
  for (const [index, file] of files.entries()) {
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, 250));
    download(file.url, file.name);
  }
}
