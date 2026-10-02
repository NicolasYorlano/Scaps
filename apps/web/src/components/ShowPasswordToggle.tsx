import Checkbox from './Checkbox';

type Props = {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

/** Casilla "Mostrar contraseña" de los formularios de ingreso y de registro. */
export default function ShowPasswordToggle({ checked, onChange }: Props) {
  return (
    // El label entero es el control, con 44 px de alto para el dedo. El margen
    // negativo evita que ese alto separe la casilla de lo que viene abajo.
    <label className="-mb-3.5 flex w-fit cursor-pointer items-center gap-2 py-3.5 text-xs text-scaps-text-muted">
      <Checkbox checked={checked} onChange={onChange} />
      Mostrar contraseña
    </label>
  );
}
