/**
 * Renders a JSON-LD structured-data block. Server-only; the payload is built on
 * the server and serialised into a <script type="application/ld+json"> tag.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Payload is built from trusted server data, not user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
