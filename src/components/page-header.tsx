import { Badge } from "@/components/ui/badge";

export function PageHeader({
  title,
  description,
  badge,
}: {
  title: string;
  description: string;
  badge?: string;
}) {
  return (
    <header className="grid gap-5 border-b-2 border-black pb-8 md:grid-cols-[1fr_auto] md:items-end">
      <div>
        <h1 className="display-type max-w-5xl text-[clamp(2.7rem,7vw,6.8rem)] font-extrabold leading-[0.88]">
          {title}
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-stone-700 sm:text-lg">{description}</p>
      </div>
      {badge ? <Badge className="bg-[#ff8ac5] px-3 py-2 text-sm">{badge}</Badge> : null}
    </header>
  );
}
