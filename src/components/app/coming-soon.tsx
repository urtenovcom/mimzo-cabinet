import { Construction } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ComingSoonProps {
  title: string;
  description: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          {title}
        </h1>
      </header>

      <Card>
        <CardHeader className="items-center text-center">
          <div className="size-12 rounded-full bg-secondary/60 flex items-center justify-center">
            <Construction className="size-6 text-muted-foreground" />
          </div>
          <CardTitle>Скоро</CardTitle>
          <CardDescription className="max-w-sm">{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-xs text-muted-foreground">
            Сейчас это страница-заглушка. Раздел появится в одном из ближайших
            релизов.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
