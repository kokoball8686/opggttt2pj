export function CharacterName({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <small className={["block max-w-full text-center font-medium leading-[1.2] tracking-normal text-[clamp(12px,3.75vw,15px)]", className]
      .filter(Boolean)
      .join(" ")}>
      {children}
    </small>
  );
}
