import Link from "next/link";

// Half the height of the nav below it (h-16 on phones, h-14 from md up).
export default function AnnouncementBar() {
  return (
    <div className="flex h-8 w-full items-center justify-center bg-black px-4 text-center text-xs text-white md:h-7 md:text-sm">
      <p>
        Mirá nuestros{" "}
        <Link href="/?cat=paquetes" className="underline underline-offset-2">
          packs familiares
        </Link>
      </p>
    </div>
  );
}
