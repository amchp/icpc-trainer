import type { PlaygroundProvider } from "@icpc-trainer/api";

import { useConnectedJudges } from "../ConnectedJudgesContext.js";
import { FieldLabel, Label, Select } from "./ui.js";

interface ProviderDropdownProps {
  readonly value: PlaygroundProvider;
  readonly onChange: (provider: PlaygroundProvider) => void;
}

export function ProviderDropdown({ onChange, value }: ProviderDropdownProps): React.JSX.Element {
  const { connectedJudges } = useConnectedJudges();

  return (
    <Label>
      <FieldLabel>Provider</FieldLabel>
      <Select
        value={value}
        onChange={(event) => onChange(event.target.value as PlaygroundProvider)}
      >
        {connectedJudges.map((judge) => (
          <option key={judge.id} value={judge.id}>
            {judge.label}
          </option>
        ))}
      </Select>
    </Label>
  );
}
