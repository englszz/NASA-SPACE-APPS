import { Fragment } from "react";

// Muestra el texto de la IA: saltos de línea y **negritas**, sin interpretar HTML
export default function RichText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) =>
        line.trim() ? (
          <p key={i}>
            {line.split("**").map((part, j) => (j % 2 ? <b key={j}>{part}</b> : <Fragment key={j}>{part}</Fragment>))}
          </p>
        ) : null,
      )}
    </>
  );
}
