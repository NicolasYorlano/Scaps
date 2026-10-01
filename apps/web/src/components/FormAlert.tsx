/**
 * Aviso general de un formulario, para lo que no es culpa de ningún campo:
 * sin conexión, una falla del servidor. Por eso no usa el rojo de los campos.
 */
export default function FormAlert({ messages }: { messages: string[] }) {
  return (
    <div
      role="alert"
      className="rounded-scaps border border-scaps-border-input bg-scaps-card-highlight px-3.5 py-3 text-sm text-scaps-text"
    >
      {messages.length === 1 ? (
        messages[0]
      ) : (
        <ul className="flex list-disc flex-col gap-1 pl-4">
          {messages.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
