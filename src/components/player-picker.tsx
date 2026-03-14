"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Player {
  id: number;
  name: string;
}

interface PlayerPickerProps {
  players: Player[];
  name: string;
  placeholder: string;
  excludeId?: number;
  defaultValue?: string;
}

export function PlayerPicker({ players, name, placeholder, excludeId, defaultValue }: PlayerPickerProps) {
  const filtered = excludeId
    ? players.filter((p) => p.id !== excludeId)
    : players;

  return (
    <Select name={name} required defaultValue={defaultValue}>
      <SelectTrigger className="h-14 text-lg">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {filtered.map((player) => (
          <SelectItem key={player.id} value={String(player.id)}>
            {player.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
