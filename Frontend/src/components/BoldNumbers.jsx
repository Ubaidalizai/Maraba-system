const NUMBER_CHUNK = /([٠-٩0-9]+(?:[,.][٠-٩0-9]+)*)/g;
const NUMBER_ONLY = /^[٠-٩0-9]+(?:[,.][٠-٩0-9]+)*$/;

/** Renders text with only numeric parts (Western or Persian digits) in semibold. */
function BoldNumbers({ children, className = "" }) {
  const text = String(children ?? "");
  const parts = text.split(NUMBER_CHUNK);

  return (
    <span className={className}>
      {parts.map((part, index) =>
        NUMBER_ONLY.test(part) ? (
          <span key={index} className="font-semibold">
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
}

export default BoldNumbers;
