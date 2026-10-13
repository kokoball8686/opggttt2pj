"use client";

import Image from "next/image";
import { characterLabel } from "@/lib/matches";
import { CharacterName } from "@/components/matches/CharacterName";

type Props = {
  id: number;
  width: number;
  height: number;
  sizes?: string;
  className?: string;
  showLabel?: boolean;
};

export function CharacterImage({
  id,
  width,
  height,
  sizes = `${width}px`,
  className,
  showLabel = false,
}: Props) {
  const imageClassName = [
    "character-portrait overflow-hidden rounded-md border border-[var(--line)]",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={imageClassName}>
      <Image
        src={`/characters/${id}.webp`}
        alt={showLabel ? characterLabel(id) : ""}
        width={width}
        height={height}
        sizes={sizes}
      />
      {showLabel ? <CharacterName>{characterLabel(id)}</CharacterName> : null}
    </span>
  );
}
