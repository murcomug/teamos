export default function UserAvatar({ name, color, size = "sm" }) {
  const sizes = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-12 w-12 text-base",
  };
  
  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}
      style={{ 
        backgroundColor: color ? `${color}20` : "rgba(45, 212, 191, 0.15)",
        color: color || "hsl(174, 72%, 50%)" 
      }}
    >
      {initials}
    </div>
  );
}