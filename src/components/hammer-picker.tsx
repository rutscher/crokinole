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

interface HammerPickerProps {
  players: Player[];
}

export function HammerPicker({ players }: HammerPickerProps) {
  return (
    <Select name="hammer" required defaultValue="Random">
      <SelectTrigger className="h-14 text-lg">
        <SelectValue placeholder="Who gets first hammer?" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="Random">Random</SelectItem>
        {players.map((player) => (
          <SelectItem key={player.id} value={player.name}>
            {player.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
