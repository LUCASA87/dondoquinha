"use client";

import { Input } from "@/components/ui/input";
import { formatMoedaInput, parseMoedaInput } from "@/lib/format";

interface InputMoedaProps {
  id?: string;
  name?: string;
  value: number;
  onChange: (valor: number) => void;
  disabled?: boolean;
  placeholder?: string;
  required?: boolean;
}

export function InputMoeda({
  id,
  name,
  value,
  onChange,
  disabled,
  placeholder = "R$0,00",
  required,
}: InputMoedaProps) {
  return (
    <>
      {name && <input type="hidden" name={name} value={value > 0 ? String(value) : ""} />}
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        value={value > 0 ? formatMoedaInput(value) : ""}
        onChange={(e) => onChange(parseMoedaInput(e.target.value))}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
      />
    </>
  );
}
