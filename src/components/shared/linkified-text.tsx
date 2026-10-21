/** Renders plain text with http/https URLs as external links. Surrounding
 *  text stays React-escaped; only http/https hrefs are ever produced. */
const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;

function splitUrls(
  text: string,
): Array<{ text: string; href?: string }> {
  const parts: Array<{ text: string; href?: string }> = [];
  let lastIndex = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const raw = match[0];
    const href = raw.replace(/[.,;:!?)\]}]+$/, "");
    const start = match.index;
    if (start > lastIndex) {
      parts.push({ text: text.slice(lastIndex, start) });
    }
    parts.push({ text: href, href });
    lastIndex = start + href.length;
  }
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex) });
  }
  return parts;
}

export function LinkifiedText({ text }: { text: string }) {
  return (
    <>
      {splitUrls(text).map((part, index) =>
        part.href ? (
          <a
            key={index}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            {part.text}
          </a>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}
